import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { access, mkdir, open, readFile, readdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';

const execFileAsync = promisify(execFile);

export function systemImagePackageId(apiLevel, target = 'default', arch = 'x86_64') {
  if (!Number.isInteger(apiLevel) || apiLevel < 30) throw new Error(`Unsupported Android API level: ${apiLevel}`);
  if (!/^[a-z0-9_]+$/.test(target) || !/^[a-z0-9_]+$/.test(arch)) throw new Error('Invalid Android system-image target or architecture');
  return `system-images;android-${apiLevel};${target};${arch}`;
}

export function systemImageDirectory(sdkRoot, apiLevel, target = 'default', arch = 'x86_64') {
  return path.join(sdkRoot, 'system-images', `android-${apiLevel}`, target, arch);
}

async function hasRecognizedDiskImageHeader(filePath, fsApi) {
  const handle = await fsApi.open(filePath, 'r');
  try {
    const header = Buffer.alloc(4);
    const first = await handle.read(header, 0, 4, 0);
    if (first.bytesRead === 4 && header.readUInt32LE(0) === 0xed26ff3a) return true; // Android sparse image.
    const ext4Magic = Buffer.alloc(2);
    const ext4 = await handle.read(ext4Magic, 0, 2, 1080);
    return ext4.bytesRead === 2 && ext4Magic.readUInt16LE(0) === 0xef53;
  } finally {
    await handle.close();
  }
}

async function describeDiskImageHeader(filePath, fsApi, size) {
  const handle = await fsApi.open(filePath, 'r');
  try {
    const samples = [];
    for (const [offset, length] of [[0, 32], [1024, 4], [1080, 2]]) {
      const bytes = Buffer.alloc(length);
      const { bytesRead } = await handle.read(bytes, 0, length, offset);
      samples.push('[ ' + offset + ':+ ' + length + ']=' + (bytes.subarray(0, bytesRead).toString('hex') || '<eof>'));
    }
    return 'size=' + size + '; ' + samples.join(' ');
  } finally {
    await handle.close();
  }
}

export async function validateSystemImageDirectory(directory, packageId, fsApi = { readFile, stat, open }) {
  try {
    const packageXml = await fsApi.readFile(path.join(directory, 'package.xml'), 'utf8');
    const sourceProperties = await fsApi.readFile(path.join(directory, 'source.properties'), 'utf8');
    if (!packageXml.includes(`path="${packageId}"`) && !packageXml.includes(`path='${packageId}'`)) return { valid: false, reason: 'package.xml does not declare the requested package path' };
    const properties = new Map(sourceProperties.split(/\r?\n/).map(line => {
      const divider = line.indexOf('=');
      return divider < 0 ? ['', ''] : [line.slice(0, divider).trim(), line.slice(divider + 1).trim()];
    }));
    if (!properties.get('Pkg.Revision')) return { valid: false, reason: 'source.properties does not declare an installed package revision' };
    const [, apiText, , arch] = packageId.split(';');
    if (properties.get('SystemImage.Abi') !== arch || Number(properties.get('AndroidVersion.ApiLevel')) !== Number(apiText.replace('android-', ''))) {
      return { valid: false, reason: 'source.properties API level or ABI does not match the requested package' };
    }
    for (const payload of ['system.img', 'userdata.img']) {
      const details = await fsApi.stat(path.join(directory, payload));
      if (!details.isFile() || details.size === 0) return { valid: false, reason: `${payload} is missing or empty` };
      if (!await hasRecognizedDiskImageHeader(path.join(directory, payload), fsApi)) {
        const evidence = await describeDiskImageHeader(path.join(directory, payload), fsApi, details.size);
        return { valid: false, reason: `${payload} is not a recognized Android sparse or ext4 image; ${evidence}` };
      }
    }
    return { valid: true, reason: 'SDK package metadata and required image payloads are present' };
  } catch (error) {
    return { valid: false, reason: `package is incomplete: ${error.message}` };
  }
}

export async function cleanupCorruptSystemImage({ sdkRoot, imageDirectory, remove = rm, list = readdir }) {
  await remove(imageDirectory, { recursive: true, force: true });
  const stagingDirectory = path.join(sdkRoot, '.temp');
  let entries = [];
  try { entries = await list(stagingDirectory); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  for (const entry of entries) {
    if (/^PackageOperation/i.test(entry)) {
      await remove(path.join(stagingDirectory, entry), { recursive: true, force: true });
    }
  }
}

export async function provisionSystemImage({
  sdkRoot,
  apiLevel,
  target = 'default',
  arch = 'x86_64',
  sdkManager,
  runSdkManager,
  validate = validateSystemImageDirectory,
  cleanup = cleanupCorruptSystemImage,
  log = () => {}
}) {
  const packageId = systemImagePackageId(apiLevel, target, arch);
  const imageDirectory = systemImageDirectory(sdkRoot, apiLevel, target, arch);
  const manager = sdkManager || path.join(sdkRoot, 'cmdline-tools', 'latest', 'bin', process.platform === 'win32' ? 'sdkmanager.bat' : 'sdkmanager');
  const cached = await validate(imageDirectory, packageId);
  if (cached.valid) {
    log(`SDK system image cache valid: ${packageId}`);
    return { packageId, imageDirectory, source: 'validated-cache' };
  }
  log(`SDK system image cache invalid; provisioning ${packageId}: ${cached.reason}`);
  let lastFailure = cached.reason;
  await cleanup({ sdkRoot, imageDirectory });
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      await runSdkManager(manager, ['--install', packageId, '--channel=0', `--sdk_root=${sdkRoot}`]);
      const installed = await validate(imageDirectory, packageId);
      if (!installed.valid) throw new Error(`installed package failed integrity preflight: ${installed.reason}`);
      log(`SDK system image provisioned and validated: ${packageId}`);
      return { packageId, imageDirectory, source: 'downloaded', attempts: attempt };
    } catch (error) {
      lastFailure = error.message;
      if (attempt === 1) {
        log(`SDK archive install attempt 1 failed; removing only ${packageId} and PackageOperation staging entries before one retry: ${lastFailure}`);
        await cleanup({ sdkRoot, imageDirectory });
      }
    }
  }
  throw new Error(`Android SDK system image preflight failed for ${packageId} after 2 bounded install attempts: ${lastFailure}`);
}

async function main() {
  const sdkRoot = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
  if (!sdkRoot) throw new Error('ANDROID_HOME or ANDROID_SDK_ROOT must identify the configured Android SDK');
  await access(sdkRoot);
  const sdkManager = path.join(sdkRoot, 'cmdline-tools', 'latest', 'bin', process.platform === 'win32' ? 'sdkmanager.bat' : 'sdkmanager');
  await access(sdkManager);
  const license = path.join(sdkRoot, 'licenses');
  await mkdir(license, { recursive: true });
  // Android 35 x86_64 is the package implicated by run #39786063564.
  // Keep the preflight targeted; the phone API 36 image is not changed here.
  for (const apiLevel of [35]) {
    const result = await provisionSystemImage({
      sdkRoot,
      apiLevel,
      sdkManager,
      runSdkManager: async (manager, args) => {
        try {
          const { stdout, stderr } = await execFileAsync(manager, args, { timeout: 8 * 60 * 1000, maxBuffer: 16 * 1024 * 1024 });
          process.stdout.write(stdout);
          process.stderr.write(stderr);
        } catch (error) {
          if (error.stdout) process.stdout.write(error.stdout);
          if (error.stderr) process.stderr.write(error.stderr);
          throw new Error([error.message, error.stderr].filter(Boolean).join('\n'));
        }
      },
      log: message => console.log(message)
    });
    console.log(JSON.stringify(result));
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  main().catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });
}
