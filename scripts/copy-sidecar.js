import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFileSync, readFileSync, mkdirSync, mkdtempSync, readdirSync,
  rmSync, statSync, chmodSync,
} from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const TARGETS = {
  "aarch64-apple-darwin": ["darwin", "arm64", "opencode-darwin-arm64.zip"],
  "x86_64-apple-darwin": ["darwin", "x64", "opencode-darwin-x64.zip"],
  "x86_64-pc-windows-msvc": ["win32", "x64", "opencode-windows-x64-baseline.zip"],
  "aarch64-pc-windows-msvc": ["win32", "arm64", "opencode-windows-arm64.zip"],
  "x86_64-unknown-linux-gnu": ["linux", "x64", "opencode-linux-x64.tar.gz"],
  "aarch64-unknown-linux-gnu": ["linux", "arm64", "opencode-linux-arm64.tar.gz"],
};

export function guessTarget(platform = process.platform, arch = process.arch) {
  return Object.keys(TARGETS).find((target) =>
    TARGETS[target][0] === platform && TARGETS[target][1] === arch);
}

export function releaseAsset(manifest, target) {
  const info = TARGETS[target];
  if (!info) throw new Error(`Unsupported sidecar target: ${target}`);
  if (!/^\d+\.\d+\.\d+$/.test(manifest.version) || manifest.repository !== "anomalyco/opencode") {
    throw new Error("Invalid pinned OpenCode release");
  }
  const [platform, arch, name] = info;
  const sha256 = manifest.assets?.[name];
  if (!/^[a-f0-9]{64}$/.test(sha256 || "")) throw new Error(`Missing SHA-256 for ${name}`);
  return {
    name, sha256, platform, arch,
    url: `https://github.com/${manifest.repository}/releases/download/v${manifest.version}/${name}`,
  };
}

export function verifyChecksum(path, expected) {
  const actual = createHash("sha256").update(readFileSync(path)).digest("hex");
  if (actual !== expected) throw new Error(`Archive SHA-256 mismatch: expected ${expected}, got ${actual}`);
}

export function verifyVersion(path, expected, run = spawnSync) {
  const result = run(path, ["--version"], { encoding: "utf8", timeout: 30000, maxBuffer: 1024 * 1024 });
  if (result.error) throw new Error(`OpenCode version check failed: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`OpenCode version check exited with ${result.status}`);
  const actual = result.stdout?.trim();
  if (actual !== expected) throw new Error(`OpenCode version mismatch: expected ${expected}, got ${actual || "empty output"}`);
  return actual;
}

function checkedRun(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: "inherit", ...options });
  if (result.error || result.status !== 0) throw new Error(`${command} failed: ${result.error?.message || result.status}`);
}

function downloadArchive(url, path) {
  if (process.platform === "win32") {
    checkedRun("powershell", ["-NoProfile", "-Command",
      "$ErrorActionPreference = 'Stop'; Invoke-WebRequest -Uri $env:ODESK_SIDECAR_URL -OutFile $env:ODESK_SIDECAR_ARCHIVE"],
    { env: { ...process.env, ODESK_SIDECAR_URL: url, ODESK_SIDECAR_ARCHIVE: path } });
  } else {
    checkedRun("curl", ["--fail", "--location", "--retry", "3", "--silent", "--show-error", "--output", path, url]);
  }
}

function extractArchive(path, directory) {
  if (path.endsWith(".zip")) {
    if (process.platform === "win32") {
      checkedRun("powershell", ["-NoProfile", "-Command",
        "$ErrorActionPreference = 'Stop'; Expand-Archive -LiteralPath $env:ODESK_SIDECAR_ARCHIVE -DestinationPath $env:ODESK_SIDECAR_EXTRACT -Force"],
      { env: { ...process.env, ODESK_SIDECAR_ARCHIVE: path, ODESK_SIDECAR_EXTRACT: directory } });
    } else {
      checkedRun("unzip", ["-q", path, "-d", directory]);
    }
  } else {
    checkedRun("tar", ["-xzf", path, "-C", directory]);
  }
}

function findBinary(directory, name) {
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) {
      const found = findBinary(path, name);
      if (found) return found;
    } else if (entry === name && statSync(path).isFile()) return path;
  }
  return null;
}

export function isValidExecutable(path, target) {
  const buf = readFileSync(path);
  const info = TARGETS[target];
  if (!info || buf.length < 20) return false;
  const [platform, arch] = info;
  if (platform === "win32") {
    if (buf.length < 0x40 || buf.subarray(0, 2).toString() !== "MZ") return false;
    const peOffset = buf.readUInt32LE(0x3c);
    return peOffset + 6 <= buf.length && buf.readUInt32LE(peOffset) === 0x4550 &&
      buf.readUInt16LE(peOffset + 4) === (arch === "x64" ? 0x8664 : 0xaa64);
  }
  if (platform === "linux") {
    return buf.subarray(0, 4).toString("hex") === "7f454c46" && buf[4] === 2 && buf[5] === 1 &&
      buf.readUInt16LE(18) === (arch === "x64" ? 62 : 183);
  }
  // Official macOS CLI archives contain a thin, little-endian Mach-O 64 binary.
  return buf.readUInt32LE(0) === 0xfeedfacf &&
    buf.readUInt32LE(4) === (arch === "x64" ? 0x01000007 : 0x0100000c);
}

export async function installSidecar({
  root = projectRoot,
  target = process.env.TARGET || guessTarget(),
  manifest = JSON.parse(readFileSync(join(root, "opencode-version.json"), "utf8")),
  download = downloadArchive,
  extract = extractArchive,
  run = spawnSync,
} = {}) {
  const asset = releaseAsset(manifest, target);
  const binariesDir = join(root, "src-tauri", "binaries");
  const name = asset.platform === "win32" ? "opencode.exe" : "opencode";
  const dest = join(binariesDir, `opencode-${target}${asset.platform === "win32" ? ".exe" : ""}`);
  mkdirSync(binariesDir, { recursive: true });
  const temporary = mkdtempSync(join(binariesDir, ".tmp-opencode-"));
  try {
    const archive = join(temporary, asset.name);
    const extracted = join(temporary, "extract");
    mkdirSync(extracted);
    console.log(`[sidecar] downloading official OpenCode v${manifest.version} for ${target}`);
    // Always use the pinned official archive, never a stale destination or an executable from PATH.
    await download(asset.url, archive);
    verifyChecksum(archive, asset.sha256);
    await extract(archive, extracted);
    const binary = findBinary(extracted, name);
    if (!binary || !isValidExecutable(binary, target)) throw new Error(`Invalid OpenCode binary for ${target}`);
    if (asset.platform !== "win32") chmodSync(binary, 0o755);
    if (target === guessTarget()) {
      verifyVersion(binary, manifest.version, run);
    } else {
      console.log("[sidecar] cross target: archive checksum and architecture verified; runtime version check requires its native host");
    }
    copyFileSync(binary, dest);
    if (asset.platform !== "win32") chmodSync(dest, 0o755);
    console.log(`[sidecar] installed verified OpenCode v${manifest.version}: ${dest}`);
    return dest;
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  installSidecar().catch((error) => {
    console.error(`[sidecar] error: ${error.message}`);
    process.exitCode = 1;
  });
}
