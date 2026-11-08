#!/usr/bin/env python3
"""Verify the shipped macOS app, DMG installation and native startup.

Adapted from ecojust/pureTV's desktop/scripts/verify-macos-bundle.py.
These checks establish bundle integrity and startup, not Apple notarization or
Gatekeeper approval of a quarantined download.
"""

import argparse
from contextlib import contextmanager
import hashlib
import http.client
import json
import os
from pathlib import Path
import platform
import plistlib
import re
import signal
import socket
import subprocess
import sys
import tempfile
import time
import traceback

TARGETS = {"aarch64-apple-darwin": "arm64", "x86_64-apple-darwin": "x86_64"}


def require(condition, message):
    if not condition:
        raise RuntimeError(message)


def version(value):
    require(bool(re.fullmatch(r"\d+(?:\.\d+){0,2}", value)), f"Invalid macOS version: {value!r}")
    parts = tuple(map(int, value.split(".")))
    return parts + (0,) * (3 - len(parts))


def load_opencode_version(project):
    manifest = json.loads((project / "opencode-version.json").read_text())
    expected = manifest.get("version")
    require(isinstance(expected, str) and bool(re.fullmatch(r"\d+\.\d+\.\d+", expected)), "Invalid pinned OpenCode version")
    return expected


def deployment_version(commands):
    versions = []
    for command in commands.split("Load command"):
        if re.search(r"\bcmd LC_BUILD_VERSION\b", command):
            require(bool(re.search(r"\bplatform (?:1|MACOS)\b", command)), "Mach-O targets a non-macOS platform")
            versions.extend(re.findall(r"\bminos ([0-9.]+)", command))
        elif re.search(r"\bcmd LC_VERSION_MIN_MACOSX\b", command):
            versions.extend(re.findall(r"\bversion ([0-9.]+)", command))
    require(len(versions) == 1, f"Expected one Mach-O deployment version, got {versions}")
    version(versions[0])
    return versions[0]


class Evidence:
    def __init__(self, output):
        self.output = output
        self.output.mkdir(parents=True, exist_ok=True)
        self.report = {
            "status": "running", "checks": [],
            "notarization_verified": False, "gatekeeper_approval_verified": False,
            "scope": "DMG integrity, complete bundle signatures, native GUI and bundled opencode startup",
        }

    def run(self, *arguments, timeout=90, env=None, cwd=None):
        command = [str(argument) for argument in arguments]
        result = subprocess.run(command, capture_output=True, text=True, timeout=timeout, env=env, cwd=cwd)
        output = result.stdout + result.stderr
        self.report["checks"].append({"command": command, "returncode": result.returncode, "output": output[-12000:]})
        print(f"$ {' '.join(command)}\n{output}", flush=True)
        require(result.returncode == 0, f"{command[0]} failed ({result.returncode}):\n{output}")
        return output

    def save(self):
        (self.output / "report.json").write_text(json.dumps(self.report, ensure_ascii=False, indent=2) + "\n")


def verify_binary(executable, architecture, minimum, evidence, exact_minimum=False):
    require(executable.is_file() and os.access(executable, os.X_OK), f"Missing executable: {executable}")
    actual_architecture = evidence.run("lipo", "-archs", executable).strip()
    require(actual_architecture == architecture, f"Wrong architecture for {executable.name}: {actual_architecture}")
    actual_minimum = deployment_version(evidence.run("otool", "-l", executable))
    require(version(actual_minimum) <= version(minimum), f"{executable.name} needs macOS {actual_minimum}, above advertised {minimum}")
    if exact_minimum:
        require(version(actual_minimum) == version(minimum), f"Info.plist/Mach-O deployment mismatch: {actual_minimum} != {minimum}")
    evidence.run("codesign", "--verify", "--strict", "--verbose=2", executable)
    return {"architecture": actual_architecture, "minimum_system_version": actual_minimum}


def verify_app(app, config, architecture, evidence):
    with (app / "Contents/Info.plist").open("rb") as stream:
        info = plistlib.load(stream)
    require(info.get("CFBundleIdentifier") == config["identifier"], "Wrong bundle identifier")
    require(info.get("CFBundleShortVersionString") == config["version"], "Wrong app version")
    require(info.get("CFBundleVersion") == config["version"], "Wrong bundle version")
    require(info.get("CFBundlePackageType") == "APPL", "Not an application bundle")
    minimum = config["bundle"]["macOS"]["minimumSystemVersion"]
    require(version(info.get("LSMinimumSystemVersion", "")) == version(minimum), "Wrong advertised minimum macOS version")
    name = info.get("CFBundleExecutable", "")
    require(bool(name) and Path(name).name == name and name not in (".", ".."), "Invalid executable name")
    executable = app / "Contents/MacOS" / name
    sidecar = app / "Contents/MacOS/opencode"
    binaries = {
        name: verify_binary(executable, architecture, minimum, evidence, exact_minimum=True),
        "opencode": verify_binary(sidecar, architecture, minimum, evidence),
    }
    require((app / "Contents/_CodeSignature/CodeResources").is_file(), "Missing complete app resource seal")
    require((app / "Contents/Resources/addin/skills/wechat-publisher.zip").is_file(), "Missing bundled WeChat publisher resources")
    evidence.run("codesign", "--verify", "--deep", "--strict", "--verbose=2", app)
    signature = evidence.run("codesign", "--display", "--verbose=4", app)
    require(f"Identifier={config['identifier']}" in signature.splitlines(), "Wrong signature identifier")
    evidence.report["checks"].append({"app": str(app), "version": config["version"], "binaries": binaries, "complete_bundle_signature": True})
    return executable, sidecar


@contextmanager
def isolated_state(directory, identifier, user_directory=None):
    """Keep HOME intact; isolate CLI paths and refuse existing oDesk state."""
    user_directory = user_directory or Path.home()
    library = user_directory / "Library"
    paths = [
        library / "Application Support/oDesk",
        library / "Application Support" / identifier,
        library / "Caches" / identifier,
        library / "WebKit" / identifier,
        library / "Saved Application State" / f"{identifier}.savedState",
    ]
    preferences = library / "Preferences" / f"{identifier}.plist"
    # OpenCode honors the XDG paths below, so its default directories may
    # already exist (even `opencode --version` creates them). oDesk's auth/model
    # commands use these two fixed paths instead: protect those exact files
    # without replacing their parent directories or touching other user data.
    fixed_files = [
        user_directory / ".local/share/opencode/auth.json",
        user_directory / ".local/state/opencode/model.json",
    ]
    for path in [*paths, preferences, *fixed_files]:
        require(not path.exists() and not path.is_symlink(), f"Refusing existing user data: {path}")
    created = []
    try:
        for index, path in enumerate(paths):
            profile = directory / f"profile-{index}"
            profile.mkdir(parents=True)
            path.parent.mkdir(parents=True, exist_ok=True)
            path.symlink_to(profile, target_is_directory=True)
            created.append((path, profile))
        preference_file = directory / "preferences.plist"
        preference_file.write_bytes(plistlib.dumps({}))
        preferences.parent.mkdir(parents=True, exist_ok=True)
        preferences.symlink_to(preference_file)
        created.append((preferences, preference_file))
        for index, path in enumerate(fixed_files):
            isolated_file = directory / f"opencode-{index}.json"
            isolated_file.write_text("{}\n")
            path.parent.mkdir(parents=True, exist_ok=True)
            path.symlink_to(isolated_file)
            created.append((path, isolated_file))
        environment = dict(os.environ)
        for setting in ("CONFIG", "DATA", "CACHE", "STATE"):
            path = directory / f"xdg-{setting.lower()}"
            path.mkdir()
            environment[f"XDG_{setting}_HOME"] = str(path)
        opencode_home = directory / "opencode-home"
        opencode_home.mkdir()
        environment["OPENCODE_TEST_HOME"] = str(opencode_home)
        environment.pop("OPENCODE_CONFIG", None)
        environment["OPENCODE_CONFIG_DIR"] = str(directory / "opencode-config")
        environment["OPENCODE_CONFIG_CONTENT"] = "{}"
        environment["OPENCODE_DISABLE_PROJECT_CONFIG"] = "1"
        environment["OPENCODE_DISABLE_AUTOUPDATE"] = "1"
        environment["OPENCODE_SERVER_PASSWORD"] = ""
        yield environment
    finally:
        for path, profile in reversed(created):
            if path.is_symlink() and path.readlink() == profile:
                path.unlink()
            elif path == preferences and path.is_file():
                # cfprefsd may replace its own symlink atomically. It was absent
                # before this test, so this is the preference file we created.
                path.unlink()


def stop_process_group(process):
    if process is None or process.poll() is not None:
        return
    try:
        os.killpg(process.pid, signal.SIGTERM)
    except ProcessLookupError:
        process.wait(timeout=5)
        return
    try:
        process.wait(timeout=10)
    except subprocess.TimeoutExpired:
        try:
            os.killpg(process.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
        process.wait(timeout=5)


def launch_app(app, executable, directory, environment, evidence, phase):
    log = evidence.output / f"{phase}-app.log"
    process = None
    try:
        with log.open("wb") as output:
            process = subprocess.Popen([str(executable)], cwd=directory, env=environment, stdout=output, stderr=subprocess.STDOUT, start_new_session=True)
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                pass
            else:
                raise RuntimeError(f"{phase} app exited during its first 5 seconds: {process.returncode}")
            # A standard Quit AppleEvent addresses this exact bundle path. No
            # GUI automation, Accessibility permission or force-quit is used.
            statement = f"tell application {json.dumps(str(app))} to quit"
            evidence.run("osascript", "-e", statement, timeout=20, env=environment)
            process.wait(timeout=20)
            require(process.returncode == 0, f"{phase} app did not exit normally: {process.returncode}")
            evidence.report["checks"].append({"phase": phase, "app_startup_seconds": 5, "normal_exit_code": process.returncode})
    finally:
        stop_process_group(process)
        if log.exists():
            print(log.read_text(errors="replace")[-8000:], flush=True)


def check_sidecar(sidecar, directory, environment, evidence, phase, expected_version):
    reported_version = evidence.run(sidecar, "--version", timeout=30, env=environment, cwd=directory).strip()
    require(bool(re.fullmatch(r"\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?", reported_version)), f"Unexpected opencode version: {reported_version!r}")
    require(reported_version == expected_version, f"Wrong bundled OpenCode version: expected {expected_version}, got {reported_version}")
    with socket.socket() as reserve:
        reserve.bind(("127.0.0.1", 0))
        port = reserve.getsockname()[1]
    log = evidence.output / f"{phase}-opencode.log"
    process = None
    try:
        with log.open("wb") as output:
            process = subprocess.Popen([str(sidecar), "serve", "--hostname", "127.0.0.1", "--port", str(port)], cwd=directory, env=environment, stdout=output, stderr=subprocess.STDOUT, start_new_session=True)
            deadline = time.monotonic() + 30
            health = None
            while time.monotonic() < deadline:
                require(process.poll() is None, f"{phase} opencode exited before healthy: {process.returncode}")
                connection = http.client.HTTPConnection("127.0.0.1", port, timeout=1)
                try:
                    connection.request("GET", "/global/health")
                    response = connection.getresponse()
                    if response.status == 200:
                        health = json.loads(response.read())
                        if health.get("healthy") is True and health.get("version") == reported_version:
                            break
                except (OSError, http.client.HTTPException, ValueError):
                    pass
                finally:
                    connection.close()
                time.sleep(0.2)
            else:
                raise RuntimeError(f"{phase} opencode health endpoint did not become ready: {health}")
            require(process.poll() is None, "opencode stopped after its health response")
            evidence.report["checks"].append({"phase": phase, "opencode_version": reported_version, "opencode_health": health, "model_requests": 0})
    finally:
        stop_process_group(process)
        if log.exists():
            print(log.read_text(errors="replace")[-8000:], flush=True)


def verify_image(image, config, architecture, evidence, expected_opencode_version):
    evidence.run("hdiutil", "verify", image)
    with tempfile.TemporaryDirectory(prefix="odesk-macos-check-") as temporary:
        directory = Path(temporary)
        mount = directory / "mounted"
        mount.mkdir()
        attached = False
        try:
            evidence.run("hdiutil", "attach", "-readonly", "-nobrowse", "-noautoopen", "-mountpoint", mount, image)
            attached = True
            apps = list(mount.glob("*.app"))
            require(len(apps) == 1 and apps[0].name == f"{config['productName']}.app", f"Unexpected DMG applications: {apps}")
            installed = directory / "Applications" / apps[0].name
            installed.parent.mkdir()
            evidence.run("ditto", apps[0], installed)
            for phase, app in (("mounted", apps[0]), ("installed", installed)):
                executable, sidecar = verify_app(app, config, architecture, evidence)
                profile = directory / f"profile-{phase}"
                profile.mkdir()
                with isolated_state(profile, config["identifier"]) as environment:
                    check_sidecar(sidecar, profile, environment, evidence, phase, expected_opencode_version)
                    launch_app(app, executable, profile, environment, evidence, phase)
        finally:
            # hdiutil may have mounted successfully before a timeout/error.
            if attached or os.path.ismount(mount):
                try:
                    evidence.run("hdiutil", "detach", mount)
                except Exception:
                    # Clean up our own mount, but still fail the acceptance
                    # check if normal detachment was not possible.
                    evidence.run("hdiutil", "detach", "-force", mount)
                    raise



def success_summary(report):
    """Compact, non-sensitive CI evidence that remains accessible in annotations."""
    return {
        "target": report["target"],
        "host_macos": report["host_macos"],
        "version": report["version"],
        "expected_opencode_version": report["expected_opencode_version"],
        "dmg_sha256": report["dmg"]["sha256"],
        "complete_bundle_signatures": sum(check.get("complete_bundle_signature") is True for check in report["checks"]),
        "gui": [
            {key: check[key] for key in ("phase", "app_startup_seconds", "normal_exit_code")}
            for check in report["checks"] if "normal_exit_code" in check
        ],
        "opencode": [
            {key: check[key] for key in ("phase", "opencode_version", "opencode_health", "model_requests")}
            for check in report["checks"] if "opencode_health" in check
        ],
        "notarization_verified": False,
        "gatekeeper_approval_verified": False,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--target", required=True, choices=TARGETS)
    args = parser.parse_args()
    if sys.platform != "darwin":
        parser.error("A native macOS runner is required")
    project = Path(__file__).resolve().parent.parent
    evidence = Evidence(project / "artifacts/macos-verification" / args.target)
    try:
        config = json.loads((project / "src-tauri/tauri.conf.json").read_text())
        expected_opencode_version = load_opencode_version(project)
        evidence.report["expected_opencode_version"] = expected_opencode_version
        evidence.report.update({"target": args.target, "version": config["version"], "host_architecture": platform.machine(), "host_macos": platform.mac_ver()[0]})
        require(platform.machine() == TARGETS[args.target], "Run on the matching native architecture, not via Rosetta")
        require(version(platform.mac_ver()[0]) >= version(config["bundle"]["macOS"]["minimumSystemVersion"]), "Runner macOS is below the advertised minimum")
        images = list((project / "src-tauri/target" / args.target / "release/bundle/dmg").glob("*.dmg"))
        require(len(images) == 1, f"Expected exactly one DMG, got {images}")
        with images[0].open("rb") as stream:
            digest = hashlib.file_digest(stream, "sha256").hexdigest()
        evidence.report["dmg"] = {"name": images[0].name, "size": images[0].stat().st_size, "sha256": digest}
        verify_image(images[0], config, TARGETS[args.target], evidence, expected_opencode_version)
        evidence.report["status"] = "passed"
        print("DMG signatures and native startup passed. Apple notarization and Gatekeeper approval were NOT verified.", flush=True)
        if os.environ.get("GITHUB_ACTIONS"):
            summary = json.dumps(success_summary(evidence.report), separators=(",", ":"))
            summary = summary.replace("%", "%25").replace("\r", "%0D").replace("\n", "%0A")
            print(f"::notice title=macOS bundle verified::{summary}", flush=True)
    except Exception:
        evidence.report["status"] = "failed"
        evidence.report["error"] = traceback.format_exc()
        if os.environ.get("GITHUB_ACTIONS"):
            detail = evidence.report["error"][-3500:].replace("%", "%25").replace("\r", "%0D").replace("\n", "%0A")
            print(f"::error title=macOS bundle verification::{detail}", flush=True)
        raise
    finally:
        evidence.save()


if __name__ == "__main__":
    main()
