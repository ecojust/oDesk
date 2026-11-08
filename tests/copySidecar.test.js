import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { guessTarget, releaseAsset, verifyChecksum, verifyVersion, isValidExecutable, installSidecar } from "../scripts/copy-sidecar.js";

const pinned = JSON.parse(readFileSync(new URL("../opencode-version.json", import.meta.url), "utf8"));
const archiveContent = Buffer.from("official archive fixture");
const archiveDigest = createHash("sha256").update(archiveContent).digest("hex");

function binaryFor(target) {
  const binary = Buffer.alloc(128);
  if (target.includes("windows")) {
    binary.write("MZ");
    binary.writeUInt32LE(64, 0x3c);
    binary.writeUInt32LE(0x4550, 64);
    binary.writeUInt16LE(target.startsWith("x86_64") ? 0x8664 : 0xaa64, 68);
  } else if (target.includes("linux")) {
    Buffer.from("7f454c460201", "hex").copy(binary);
    binary.writeUInt16LE(target.startsWith("x86_64") ? 62 : 183, 18);
  } else {
    binary.writeUInt32LE(0xfeedfacf, 0);
    binary.writeUInt32LE(target.startsWith("x86_64") ? 0x01000007 : 0x0100000c, 4);
  }
  return binary;
}

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "odesk-sidecar-test-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const target = guessTarget();
  assert.ok(target, "Test runner needs a supported native target");
  const asset = releaseAsset(pinned, target);
  const directory = join(root, "src-tauri", "binaries");
  mkdirSync(directory, { recursive: true });
  const destination = join(directory, `opencode-${target}${asset.platform === "win32" ? ".exe" : ""}`);
  writeFileSync(destination, "old cached executable");
  const binary = binaryFor(target);
  const calls = [];
  return {
    directory, destination, binary, calls,
    options: {
      root, target,
      manifest: { ...pinned, assets: { [asset.name]: archiveDigest } },
      download: async (url, path) => { calls.push(url); writeFileSync(path, archiveContent); },
      extract: async (_, path) => writeFileSync(join(path, asset.platform === "win32" ? "opencode.exe" : "opencode"), binary),
      run: (_, args) => {
        assert.deepEqual(args, ["--version"]);
        return { status: 0, stdout: `${pinned.version}\n`, stderr: "" };
      },
    },
  };
}

test("each supported target selects its own pinned official asset", () => {
  const cases = [
    ["aarch64-apple-darwin", "opencode-darwin-arm64.zip"],
    ["x86_64-apple-darwin", "opencode-darwin-x64.zip"],
    ["x86_64-pc-windows-msvc", "opencode-windows-x64-baseline.zip"],
    ["aarch64-pc-windows-msvc", "opencode-windows-arm64.zip"],
    ["x86_64-unknown-linux-gnu", "opencode-linux-x64.tar.gz"],
    ["aarch64-unknown-linux-gnu", "opencode-linux-arm64.tar.gz"],
  ];
  for (const [target, name] of cases) {
    const asset = releaseAsset(pinned, target);
    assert.equal(asset.name, name);
    assert.equal(asset.url, `https://github.com/anomalyco/opencode/releases/download/v${pinned.version}/${name}`);
    assert.match(asset.sha256, /^[a-f0-9]{64}$/);
  }
  assert.throws(() => releaseAsset(pinned, "unsupported-target"), /Unsupported/);
  assert.throws(() => releaseAsset({ ...pinned, assets: {} }, cases[0][0]), /SHA-256/);
});

test("version check rejects old versions, error exits, timeouts and ambiguous output", () => {
  const result = { status: 0, stdout: `${pinned.version}\n`, stderr: "" };
  assert.equal(verifyVersion("fixture", pinned.version, () => result), pinned.version);
  for (const value of [
    { ...result, stdout: "1.18.30\n" },
    { ...result, stdout: `${pinned.version}\nstartup log` },
    { ...result, status: 1 },
    { ...result, status: null, error: new Error("timed out") },
    { ...result, stdout: "", stderr: pinned.version },
  ]) {
    assert.throws(() => verifyVersion("fixture", pinned.version, () => value), /version/);
  }
});

test("binary format validation rejects the wrong architecture for all platforms", (t) => {
  const directory = mkdtempSync(join(tmpdir(), "odesk-arch-test-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  for (const suffix of ["apple-darwin", "pc-windows-msvc", "unknown-linux-gnu"]) {
    const path = join(directory, suffix);
    const armTarget = `aarch64-${suffix}`;
    const x64Target = `x86_64-${suffix}`;
    writeFileSync(path, binaryFor(armTarget));
    assert.equal(isValidExecutable(path, armTarget), true);
    assert.equal(isValidExecutable(path, x64Target), false);
    writeFileSync(path, binaryFor(x64Target));
    assert.equal(isValidExecutable(path, x64Target), true);
    assert.equal(isValidExecutable(path, armTarget), false);
    writeFileSync(path, "not a native binary");
    assert.equal(isValidExecutable(path, x64Target), false);
  }
});

test("installation replaces a stale destination using the pinned archive and native version", async (t) => {
  const { options, destination, binary, calls, directory } = fixture(t);
  assert.equal(await installSidecar(options), destination);
  assert.equal(calls.length, 1, "existing binary must not skip the official download");
  assert.deepEqual(readFileSync(destination), binary);
  assert.deepEqual(readdirSync(directory), [destination.split(/[\\/]/).pop()], "temporary archive must be cleaned up");
});

test("checksum failure blocks extraction and installation without destroying an existing binary", async (t) => {
  const { options, destination, directory } = fixture(t);
  options.download = async (_, path) => writeFileSync(path, "corrupted archive");
  options.extract = () => assert.fail("must not extract unverified content");
  await assert.rejects(installSidecar(options), /SHA-256 mismatch/);
  assert.equal(readFileSync(destination, "utf8"), "old cached executable");
  assert.equal(readdirSync(directory).length, 1);
  assert.throws(() => verifyChecksum(destination, archiveDigest), /SHA-256 mismatch/);
});

test("a different runtime version fails installation and preserves the old destination", async (t) => {
  const { options, destination, directory } = fixture(t);
  options.run = () => ({ status: 0, stdout: "1.18.30\n" });
  await assert.rejects(installSidecar(options), /version mismatch/);
  assert.equal(readFileSync(destination, "utf8"), "old cached executable");
  assert.equal(readdirSync(directory).length, 1);
});

test("extractor errors fail the build and clean temporary files", async (t) => {
  const { options, destination, directory } = fixture(t);
  options.extract = () => { throw new Error("unzip failed"); };
  await assert.rejects(installSidecar(options), /unzip failed/);
  assert.equal(readFileSync(destination, "utf8"), "old cached executable");
  assert.equal(readdirSync(directory).length, 1);
});

test("cross-target installation chooses the requested binary without executing it on the host", async (t) => {
  const { options, directory, calls } = fixture(t);
  const target = guessTarget() === "aarch64-apple-darwin" ? "x86_64-pc-windows-msvc" : "aarch64-apple-darwin";
  const asset = releaseAsset(pinned, target);
  const binary = binaryFor(target);
  options.target = target;
  options.manifest = { ...pinned, assets: { [asset.name]: archiveDigest } };
  options.extract = async (_, path) => writeFileSync(join(path, asset.platform === "win32" ? "opencode.exe" : "opencode"), binary);
  options.run = () => assert.fail("cannot execute a foreign binary on this host");
  const destination = await installSidecar(options);
  assert.equal(calls[0], asset.url);
  assert.deepEqual(readFileSync(destination), binary);
  assert.equal(destination, join(directory, `opencode-${target}${asset.platform === "win32" ? ".exe" : ""}`));
  assert.equal(readdirSync(directory).some((name) => name.startsWith(".tmp-")), false);
});
