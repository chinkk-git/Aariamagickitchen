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

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

async function readAt(handle, length, position) {
  const buffer = Buffer.alloc(length);
  const { bytesRead } = await handle.read(buffer, 0, length, position);
  return bytesRead === length ? buffer : null;
}

async function hasFilesystemAt(handle, baseOffset) {
  const sparse = await readAt(handle, 4, baseOffset);
  if (sparse?.readUInt32LE(0) === 0xed26ff3a) return true; // Android sparse image.
  const ext4 = await readAt(handle, 2, baseOffset + 1080);
  if (ext4?.readUInt16LE(0) === 0xef53) return true;
  const erofs = await readAt(handle, 4, baseOffset + 1024);
  return erofs?.readUInt32LE(0) === 0xe0f5e1e2; // EROFS on-disk superblock magic.
}

async function hasValidGptDiskImage(handle, imageSize) {
  const sectorSize = 512;
  if (imageSize % sectorSize !== 0 || imageSize < sectorSize * 68) return false;
  const primary = await readAt(handle, sectorSize, sectorSize);
  if (!primary || primary.toString('ascii', 0, 8) !== 'EFI PART') return false;
  const headerSize = primary.readUInt32LE(12);
  if (headerSize < 92 || headerSize > sectorSize) return false;
  const primaryForCrc = Buffer.from(primary.subarray(0, headerSize));
  const primaryCrc = primaryForCrc.readUInt32LE(16);
  primaryForCrc.writeUInt32LE(0, 16);
  if (crc32(primaryForCrc) !== primaryCrc) return false;

  const totalSectors = imageSize / sectorSize;
  const currentLba = primary.readBigUInt64LE(24);
  const backupLba = primary.readBigUInt64LE(32);
  const firstUsableLba = primary.readBigUInt64LE(40);
  const lastUsableLba = primary.readBigUInt64LE(48);
  const entriesLba = primary.readBigUInt64LE(72);
  const entryCount = primary.readUInt32LE(80);
  const entrySize = primary.readUInt32LE(84);
  const expectedEntriesCrc = primary.readUInt32LE(88);
  if (currentLba !== 1n || backupLba !== BigInt(totalSectors - 1) || firstUsableLba > lastUsableLba ||
      lastUsableLba >= backupLba || entriesLba < 2n || entryCount === 0 || entryCount > 4096 ||
      entrySize < 128 || entrySize % 8 !== 0) return false;
  const entriesLength = entryCount * entrySize;
  const entriesOffset = Number(entriesLba) * sectorSize;
  if (!Number.isSafeInteger(entriesOffset) || entriesOffset + entriesLength > imageSize || entriesLength > 32 * 1024 * 1024) return false;
  const entries = await readAt(handle, entriesLength, entriesOffset);
  if (!entries || crc32(entries) !== expectedEntriesCrc) return false;

  const backup = await readAt(handle, sectorSize, Number(backupLba) * sectorSize);
  if (!backup || backup.toString('ascii', 0, 8) !== 'EFI PART' ||
      backup.readBigUInt64LE(24) !== backupLba || backup.readBigUInt64LE(32) !== currentLba ||
      backup.readBigUInt64LE(40) !== firstUsableLba || backup.readBigUInt64LE(48) !== lastUsableLba ||
      !backup.subarray(56, 72).equals(primary.subarray(56, 72)) ||
      backup.readUInt32LE(88) !== expectedEntriesCrc || backup.readUInt32LE(80) !== entryCount || backup.readUInt32LE(84) !== entrySize) return false;
  const backupHeaderSize = backup.readUInt32LE(12);
  if (backupHeaderSize < 92 || backupHeaderSize > sectorSize) return false;
  const backupForCrc = Buffer.from(backup.subarray(0, backupHeaderSize));
  const backupCrc = backupForCrc.readUInt32LE(16);
  backupForCrc.writeUInt32LE(0, 16);
  if (crc32(backupForCrc) !== backupCrc) return false;
  const backupEntriesLba = backup.readBigUInt64LE(72);
  const backupEntriesOffset = Number(backupEntriesLba) * sectorSize;
  if (!Number.isSafeInteger(backupEntriesOffset) || backupEntriesOffset < entriesOffset + entriesLength ||
      backupEntriesOffset + entriesLength > Number(backupLba) * sectorSize) return false;
  const backupEntries = await readAt(handle, entriesLength, backupEntriesOffset);
  if (!backupEntries || !backupEntries.equals(entries) || crc32(backupEntries) !== expectedEntriesCrc) return false;

  // Validate the Linux filesystem-data partition type GUID observed in CI and
  // require a supported filesystem signature inside its declared bounds.
  const linuxFsDataGuid = Buffer.from('af3dc60f838472478e793d69d8477de4', 'hex');
  for (let index = 0; index < entryCount; index++) {
    const entry = entries.subarray(index * entrySize, (index + 1) * entrySize);
    if (entry.subarray(0, 16).equals(Buffer.alloc(16))) continue;
    const firstLba = entry.readBigUInt64LE(32);
    const lastLba = entry.readBigUInt64LE(40);
    if (firstLba < firstUsableLba || lastLba > lastUsableLba || firstLba > lastLba) return false;
    if (!entry.subarray(0, 16).equals(linuxFsDataGuid)) continue;
    const partitionStart = Number(firstLba) * sectorSize;
    const partitionSize = Number(lastLba - firstLba + 1n) * sectorSize;
    if (Number.isSafeInteger(partitionStart) && Number.isSafeInteger(partitionSize) &&
        partitionStart + partitionSize <= imageSize && await hasFilesystemAt(handle, partitionStart)) return true;
  }
  return false;
}

async function hasRecognizedDiskImageHeader(filePath, fsApi, imageSize) {
  const handle = await fsApi.open(filePath, 'r');
  try {
    return await hasFilesystemAt(handle, 0) || await hasValidGptDiskImage(handle, imageSize);
  } finally {
    await handle.close();
  }
}

async function describeDiskImageHeader(filePath, fsApi, size) {
  const handle = await fsApi.open(filePath, 'r');
  try {
    const samples = {};
    for (const [offset, length] of [[0, 32], [1024, 4], [1080, 2]]) {
      const bytes = Buffer.alloc(length);
      const { bytesRead } = await handle.read(bytes, 0, length, offset);
      samples[String(offset)] = bytes.subarray(0, bytesRead).toString('hex');
    }
    return { size, samples };
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
    const packageMetadata = {
      packageId,
      packageXmlPathMatches: packageXml.includes(`path="${packageId}"`) || packageXml.includes(`path='${packageId}'`),
      revision: properties.get('Pkg.Revision') || null,
      apiLevel: properties.get('AndroidVersion.ApiLevel') || null,
      abi: properties.get('SystemImage.Abi') || null
    };
    if (!properties.get('Pkg.Revision')) return { valid: false, reason: 'source.properties does not declare an installed package revision' };
    const [, apiText, , arch] = packageId.split(';');
    if (properties.get('SystemImage.Abi') !== arch || Number(properties.get('AndroidVersion.ApiLevel')) !== Number(apiText.replace('android-', ''))) {
      return { valid: false, reason: 'source.properties API level or ABI does not match the requested package' };
    }
    for (const payload of ['system.img', 'userdata.img']) {
      const details = await fsApi.stat(path.join(directory, payload));
      if (!details.isFile() || details.size === 0) return { valid: false, reason: `${payload} is missing or empty` };
      if (!await hasRecognizedDiskImageHeader(path.join(directory, payload), fsApi, details.size)) {
        const imageEvidence = {
          payload,
          ...(await describeDiskImageHeader(path.join(directory, payload), fsApi, details.size))
        };
        const diagnostic = { packageMetadata, imageEvidence };
        return {
          valid: false,
          reason: `${payload} is not a recognized Android sparse or ext4 image; diagnostic=${JSON.stringify(diagnostic)}`,
          ...diagnostic
        };
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
