"""Platform-independent regression tests for macOS release acceptance checks."""
import importlib.util
import json
import os
from pathlib import Path
import plistlib
import subprocess
import tempfile
import unittest
from unittest.mock import MagicMock, patch

spec = importlib.util.spec_from_file_location("verify_macos_bundle", Path(__file__).parents[1] / "scripts/verify-macos-bundle.py")
verify = importlib.util.module_from_spec(spec)
spec.loader.exec_module(verify)


def load_commands(minimum="13.0", platform="1"):
    return f"Load command 9\n cmd LC_BUILD_VERSION\n cmdsize 32\n platform {platform}\n minos {minimum}\n sdk 15.0\n"


class FakeEvidence:
    def __init__(self, output, sidecar_minimum="13.0"):
        self.output = output
        self.report = {"checks": []}
        self.calls = []
        self.sidecar_minimum = sidecar_minimum

    def run(self, *arguments, **kwargs):
        self.calls.append(tuple(map(str, arguments)))
        if arguments[0] == "lipo":
            return "arm64\n"
        if arguments[0] == "otool":
            return load_commands(self.sidecar_minimum if Path(arguments[-1]).name == "opencode" else "13.0")
        if "--display" in arguments:
            return "Identifier=com.juzisang.oDesk\nSignature=adhoc\n"
        return ""


class MacBundleTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.directory = Path(self.temporary.name)
        self.config = {
            "identifier": "com.juzisang.oDesk", "productName": "oDesk", "version": "0.4.1",
            "bundle": {"macOS": {"minimumSystemVersion": "13.0"}},
        }

    def app(self):
        app = self.directory / "oDesk.app"
        (app / "Contents/MacOS").mkdir(parents=True)
        (app / "Contents/_CodeSignature").mkdir()
        (app / "Contents/_CodeSignature/CodeResources").write_text("sealed")
        resources = app / "Contents/Resources/addin/skills"
        resources.mkdir(parents=True)
        (resources / "wechat-publisher.zip").write_bytes(b"fixture")
        for name in ("oDesk", "opencode"):
            executable = app / "Contents/MacOS" / name
            executable.write_bytes(b"fixture")
            executable.chmod(0o755)
        info = {
            "CFBundleIdentifier": self.config["identifier"], "CFBundleShortVersionString": "0.4.1",
            "CFBundleVersion": "0.4.1", "CFBundleExecutable": "oDesk", "CFBundlePackageType": "APPL",
            "LSMinimumSystemVersion": "13.0",
        }
        (app / "Contents/Info.plist").write_bytes(plistlib.dumps(info))
        return app

    def test_macho_deployment_parses_both_command_formats(self):
        self.assertEqual(verify.deployment_version(load_commands("13.0")), "13.0")
        old = "Load command 4\n cmd LC_VERSION_MIN_MACOSX\n version 11.0\n sdk 15.0\n"
        self.assertEqual(verify.deployment_version(old), "11.0")
        self.assertEqual(verify.version("13"), verify.version("13.0.0"))

    def test_rejects_ambiguous_or_non_macos_macho(self):
        for output in ("", load_commands() + load_commands(), load_commands(platform="2")):
            with self.subTest(output=output), self.assertRaises(RuntimeError):
                verify.deployment_version(output)

    def test_checks_sidecar_and_complete_bundle_signature(self):
        evidence = FakeEvidence(self.directory)
        app = self.app()
        verify.verify_app(app, self.config, "arm64", evidence)
        self.assertIn(("codesign", "--verify", "--deep", "--strict", "--verbose=2", str(app)), evidence.calls)
        self.assertIn(("codesign", "--verify", "--strict", "--verbose=2", str(app / "Contents/MacOS/opencode")), evidence.calls)

    def test_rejects_sidecar_requiring_newer_os_than_advertised(self):
        with self.assertRaisesRegex(RuntimeError, "above advertised"):
            verify.verify_app(self.app(), self.config, "arm64", FakeEvidence(self.directory, "14.0"))

    def test_rejects_wrong_architecture(self):
        with self.assertRaisesRegex(RuntimeError, "Wrong architecture"):
            verify.verify_app(self.app(), self.config, "x86_64", FakeEvidence(self.directory))

    def test_rejects_linker_only_signature_without_bundle_resource_seal(self):
        app = self.app()
        (app / "Contents/_CodeSignature/CodeResources").unlink()
        with self.assertRaisesRegex(RuntimeError, "resource seal"):
            verify.verify_app(app, self.config, "arm64", FakeEvidence(self.directory))

    def test_wrong_version_is_not_accepted_as_new_release(self):
        app = self.app()
        self.config["version"] = "0.4.2"
        with self.assertRaisesRegex(RuntimeError, "Wrong app version"):
            verify.verify_app(app, self.config, "arm64", FakeEvidence(self.directory))

    @unittest.skipIf(os.name == "nt", "macOS/Unix symlink semantics")
    def test_state_isolation_preserves_home_and_cleans_symlinks_on_failure(self):
        user = self.directory / "user"
        profile = self.directory / "profile"
        profile.mkdir()
        real_home = os.environ.get("HOME")
        with self.assertRaisesRegex(ValueError, "app failure"):
            with verify.isolated_state(profile, self.config["identifier"], user) as environment:
                self.assertEqual(environment.get("HOME"), real_home)
                self.assertTrue((user / "Library/Application Support/oDesk").is_symlink())
                self.assertTrue((user / ".local/share/opencode").is_symlink())
                raise ValueError("app failure")
        self.assertFalse((user / "Library/Application Support/oDesk").is_symlink())
        self.assertFalse((user / ".local/share/opencode").is_symlink())

    @unittest.skipIf(os.name == "nt", "macOS/Unix symlink semantics")
    def test_existing_user_files_and_broken_symlinks_are_never_replaced(self):
        for kind in ("file", "broken-link"):
            with self.subTest(kind=kind):
                user = self.directory / kind
                path = user / "Library/Application Support/oDesk"
                path.parent.mkdir(parents=True)
                if kind == "file":
                    path.write_text("user data")
                else:
                    path.symlink_to(self.directory / "absent")
                with self.assertRaisesRegex(RuntimeError, "Refusing existing"):
                    with verify.isolated_state(self.directory / "unused", self.config["identifier"], user):
                        self.fail("must refuse before launching")
                if kind == "file":
                    self.assertEqual(path.read_text(), "user data")
                else:
                    self.assertTrue(path.is_symlink())

    def test_early_app_exit_fails_even_when_exit_code_is_zero(self):
        class EarlyExit:
            returncode = 0
            def wait(self, **kwargs):
                return 0
            def poll(self):
                return 0
        evidence = FakeEvidence(self.directory)
        with patch.object(verify.subprocess, "Popen", return_value=EarlyExit()):
            with self.assertRaisesRegex(RuntimeError, "first 5 seconds"):
                verify.launch_app(self.directory / "oDesk.app", self.directory / "oDesk", self.directory, {}, evidence, "installed")

    def test_normal_quit_targets_exact_bundle_path_and_requires_zero_exit(self):
        class RunningApp:
            returncode = None
            count = 0
            def wait(self, **kwargs):
                self.count += 1
                if self.count == 1:
                    raise subprocess.TimeoutExpired("oDesk", 5)
                self.returncode = 0
                return 0
            def poll(self):
                return self.returncode
        evidence = FakeEvidence(self.directory)
        app = self.directory / "Applications/oDesk.app"
        with patch.object(verify.subprocess, "Popen", return_value=RunningApp()):
            verify.launch_app(app, app / "Contents/MacOS/oDesk", self.directory, {}, evidence, "installed")
        self.assertIn(("osascript", "-e", f"tell application {json.dumps(str(app))} to quit"), evidence.calls)
        self.assertEqual(evidence.report["checks"][-1]["normal_exit_code"], 0)

    def test_sidecar_version_success_does_not_hide_server_startup_failure(self):
        evidence = FakeEvidence(self.directory)
        evidence.run = lambda *args, **kwargs: "1.18.30\n"
        process = MagicMock(returncode=-9)
        process.poll.return_value = -9
        with patch.object(verify.subprocess, "Popen", return_value=process):
            with self.assertRaisesRegex(RuntimeError, "exited before healthy"):
                verify.check_sidecar(self.directory / "opencode", self.directory, {}, evidence, "installed")
        self.assertFalse(evidence.report["checks"])

    def test_sidecar_probe_only_requests_health_and_cleans_up(self):
        evidence = FakeEvidence(self.directory)
        evidence.run = lambda *args, **kwargs: "1.18.30\n"
        process = MagicMock()
        process.poll.return_value = None
        response = MagicMock(status=200)
        response.read.return_value = b'{"healthy":true,"version":"1.18.30"}'
        connection = MagicMock()
        connection.getresponse.return_value = response
        with patch.object(verify.subprocess, "Popen", return_value=process), \
                patch.object(verify.http.client, "HTTPConnection", return_value=connection), \
                patch.object(verify, "stop_process_group") as stop:
            verify.check_sidecar(self.directory / "opencode", self.directory, {}, evidence, "mounted")
        connection.request.assert_called_once_with("GET", "/global/health")
        connection.close.assert_called_once()
        stop.assert_called_once_with(process)
        self.assertTrue(evidence.report["checks"][-1]["opencode_health"]["healthy"])

    @unittest.skipIf(os.name == "nt", "macOS/Unix process-group semantics")
    def test_cleanup_handles_process_exiting_before_signal(self):
        process = MagicMock(pid=12345)
        process.poll.return_value = None
        with patch.object(verify.os, "killpg", side_effect=ProcessLookupError):
            verify.stop_process_group(process)
        process.wait.assert_called_once_with(timeout=5)

    def test_evidence_does_not_claim_notarization_or_gatekeeper_approval(self):
        evidence = verify.Evidence(self.directory)
        evidence.report["status"] = "passed"
        evidence.save()
        report = json.loads((self.directory / "report.json").read_text())
        self.assertFalse(report["notarization_verified"])
        self.assertFalse(report["gatekeeper_approval_verified"])


if __name__ == "__main__":
    unittest.main()
