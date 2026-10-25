import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, open, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { provisionSystemImage, validateSystemImageDirectory } from '../../tools/v3/qa/android-system-image.mjs';
import { buildScreenshotEvidenceManifest } from '../../tools/v3/qa/android-evidence-manifest.mjs';

function png(width, height) {
  const buffer = Buffer.alloc(24);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buffer);
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  return buffer;
}

async function writeValidImage(directory, packageId) {
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, 'package.xml'), `<localPackage path="${packageId}"></localPackage>`);
  // Android system-image source.properties carries revision/API/ABI; the
  // canonical package path is recorded in package.xml and need not be repeated.
  await writeFile(path.join(directory, 'source.properties'), `Pkg.Revision=1\nAndroidVersion.ApiLevel=35\nSystemImage.Abi=x86_64\n`);
  const sparseImage = Buffer.alloc(4096);
  sparseImage.writeUInt32LE(0xed26ff3a, 0);
  await writeFile(path.join(directory, 'system.img'), sparseImage);
  await writeFile(path.join(directory, 'userdata.img'), sparseImage);
}

function fixtureCrc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

async function writeObservedGptImage(filePath, { corruptPrimaryCrc = false, corruptEntriesCrc = false, omitFilesystemMagic = false } = {}) {
  const sectorSize = 512;
  const totalSectors = 3168256; // CI-observed size: 1,622,147,072 bytes at 512-byte sectors.
  const lastLba = totalSectors - 1;
  const backupEntriesLba = lastLba - 32;
  const lastUsableLba = backupEntriesLba - 1;
  const entries = Buffer.alloc(128 * 128);
  // The CI bytes at file offset 1024 begin with this Linux filesystem-data GUID.
  Buffer.from('af3dc60f838472478e793d69d8477de4', 'hex').copy(entries, 0);
  Buffer.alloc(16, 0x21).copy(entries, 16); // Unique partition GUID.
  entries.writeBigUInt64LE(34n, 32);
  entries.writeBigUInt64LE(BigInt(lastUsableLba), 40);
  Buffer.from('vendor', 'utf16le').copy(entries, 56);
  const entriesCrc = (fixtureCrc32(entries) ^ (corruptEntriesCrc ? 1 : 0)) >>> 0;

  function header({ currentLba, backupLba, entriesLba }) {
    const result = Buffer.alloc(sectorSize);
    result.write('EFI PART', 0, 'ascii');
    result.writeUInt32LE(0x00010000, 8);
    result.writeUInt32LE(92, 12);
    result.writeBigUInt64LE(BigInt(currentLba), 24);
    result.writeBigUInt64LE(BigInt(backupLba), 32);
    result.writeBigUInt64LE(34n, 40);
    result.writeBigUInt64LE(BigInt(lastUsableLba), 48);
    Buffer.alloc(16, 0x42).copy(result, 56);
    result.writeBigUInt64LE(BigInt(entriesLba), 72);
    result.writeUInt32LE(128, 80);
    result.writeUInt32LE(128, 84);
    result.writeUInt32LE(entriesCrc, 88);
    result.writeUInt32LE((fixtureCrc32(result.subarray(0, 92)) ^ (corruptPrimaryCrc && currentLba === 1 ? 1 : 0)) >>> 0, 16);
    return result;
  }

  const file = await open(filePath, 'w');
  try {
    await file.truncate(totalSectors * sectorSize);
    const mbr = Buffer.alloc(sectorSize);
    mbr[446 + 4] = 0xee;
    mbr.writeUInt32LE(1, 446 + 8);
    mbr.writeUInt32LE(totalSectors - 1, 446 + 12);
    mbr[510] = 0x55;
    mbr[511] = 0xaa;
    await file.write(mbr, 0, mbr.length, 0);
    await file.write(header({ currentLba: 1, backupLba: lastLba, entriesLba: 2 }), 0, sectorSize, sectorSize);
    await file.write(entries, 0, entries.length, 2 * sectorSize);
    await file.write(entries, 0, entries.length, backupEntriesLba * sectorSize);
    await file.write(header({ currentLba: lastLba, backupLba: 1, entriesLba: backupEntriesLba }), 0, sectorSize, lastLba * sectorSize);
    // Minimal ext4 signature at the partition-relative superblock magic field.
    if (!omitFilesystemMagic) {
      const ext4Magic = Buffer.from([0x53, 0xef]);
      await file.write(ext4Magic, 0, ext4Magic.length, 34 * sectorSize + 1080);
    }
  } finally {
    await file.close();
  }
}

test('Android SDK system image preflight rejects a corrupt cached package and retries the exact package once', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'aria-sdk-image-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const sdkRoot = path.join(root, 'sdk');
  const directory = path.join(sdkRoot, 'system-images/android-35/default/x86_64');
  const packageId = 'system-images;android-35;default;x86_64';
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, 'system.img'), Buffer.alloc(0));
  await mkdir(path.join(sdkRoot, '.temp'), { recursive: true });
  await writeFile(path.join(sdkRoot, '.temp', 'PackageOperation01'), 'corrupt archive staging');
  let attempts = 0;
  const result = await provisionSystemImage({
    sdkRoot,
    apiLevel: 35,
    sdkManager: '/sdkmanager',
    runSdkManager: async (_manager, args) => {
      attempts++;
      assert.deepEqual(args, ['--install', packageId, '--channel=0', `--sdk_root=${sdkRoot}`]);
      if (attempts === 1) throw new Error('Error on ZipFile unknown archive');
      await writeValidImage(directory, packageId);
    }
  });
  assert.equal(result.attempts, 2);
  assert.equal((await validateSystemImageDirectory(directory, packageId)).valid, true);
  await assert.rejects(readFile(path.join(sdkRoot, '.temp', 'PackageOperation01')), { code: 'ENOENT' });
});

test('Android SDK preflight reports image size and header bytes for an unrecognized installed format', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'aria-sdk-image-header-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const directory = path.join(root, 'system-images/android-35/default/x86_64');
  const packageId = 'system-images;android-35;default;x86_64';
  await writeValidImage(directory, packageId);
  await writeFile(path.join(directory, 'system.img'), Buffer.alloc(4096, 0x7f));
  const result = await validateSystemImageDirectory(directory, packageId);
  assert.equal(result.valid, false);
  assert.equal(result.reason.startsWith('system.img is not a recognized Android sparse, ext4, EROFS, or integrity-checked GPT image; diagnostic='), true);
  assert.deepEqual(result.packageMetadata, {
    packageId,
    packageXmlPathMatches: true,
    revision: '1',
    apiLevel: '35',
    abi: 'x86_64'
  });
  assert.deepEqual(result.imageEvidence, {
    payload: 'system.img',
    size: 4096,
    samples: {
      '0': '7f'.repeat(32),
      '1024': '7f'.repeat(4),
      '1080': '7f'.repeat(2)
    }
  });
});

test('Android SDK preflight accepts the observed GPT disk-image header with valid GPT CRCs and embedded ext4', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'aria-sdk-gpt-header-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const directory = path.join(root, 'system-images/android-35/default/x86_64');
  const packageId = 'system-images;android-35;default;x86_64';
  await writeValidImage(directory, packageId);
  await writeObservedGptImage(path.join(directory, 'system.img'));
  const image = await open(path.join(directory, 'system.img'), 'r');
  try {
    const zeroSample = Buffer.alloc(32);
    const guidSample = Buffer.alloc(4);
    const nameSample = Buffer.alloc(2);
    await image.read(zeroSample, 0, zeroSample.length, 0);
    await image.read(guidSample, 0, guidSample.length, 1024);
    await image.read(nameSample, 0, nameSample.length, 1080);
    assert.equal(zeroSample.toString('hex'), '00'.repeat(32));
    assert.equal(guidSample.toString('hex'), 'af3dc60f');
    assert.equal(nameSample.toString('hex'), '7600');
  } finally {
    await image.close();
  }
  assert.equal((await validateSystemImageDirectory(directory, packageId)).valid, true);
});

test('Android SDK preflight accepts a structurally valid SDK GPT image with an unfamiliar partition filesystem', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'aria-sdk-gpt-format-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const directory = path.join(root, 'system-images/android-35/default/x86_64');
  const packageId = 'system-images;android-35;default;x86_64';
  await writeValidImage(directory, packageId);
  await writeObservedGptImage(path.join(directory, 'system.img'), { omitFilesystemMagic: true });
  assert.equal((await validateSystemImageDirectory(directory, packageId)).valid, true);
});

test('Android SDK preflight rejects GPT containers with corrupt primary-header or partition-array CRCs', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'aria-sdk-gpt-corrupt-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const packageId = 'system-images;android-35;default;x86_64';
  for (const kind of ['primary-header', 'partition-array']) {
    const directory = path.join(root, kind, 'system-images/android-35/default/x86_64');
    await writeValidImage(directory, packageId);
    await writeObservedGptImage(path.join(directory, 'system.img'), {
      corruptPrimaryCrc: kind === 'primary-header',
      corruptEntriesCrc: kind === 'partition-array'
    });
    const result = await validateSystemImageDirectory(directory, packageId);
    assert.equal(result.valid, false, `${kind} corruption must be rejected`);
    assert.match(result.reason, /not a recognized Android sparse, ext4, EROFS, or integrity-checked GPT image/);
  }
});

test('Android SDK preflight accepts the authoritative API 35 x86_64 empty-data-disk package layout', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'aria-sdk-data-dir-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const directory = path.join(root, 'system-images/android-35/default/x86_64');
  const packageId = 'system-images;android-35;default;x86_64';
  await writeValidImage(directory, packageId);
  await rm(path.join(directory, 'userdata.img'));
  await mkdir(path.join(directory, 'data', 'misc', 'apns'), { recursive: true });
  await writeFile(path.join(directory, 'data', 'empty_data_disk'), '');
  await writeFile(path.join(directory, 'data', 'misc', 'apns', 'apns-conf.xml'), '<apns/>');
  const result = await validateSystemImageDirectory(directory, packageId);
  assert.equal(result.valid, true);
  assert.equal(result.layout, 'api35-x86_64-empty-data-disk');
});

test('Android SDK preflight rejects an API 35 package missing the authoritative empty-data-disk marker', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'aria-sdk-no-userdata-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const directory = path.join(root, 'system-images/android-35/default/x86_64');
  const packageId = 'system-images;android-35;default;x86_64';
  await writeValidImage(directory, packageId);
  await rm(path.join(directory, 'userdata.img'));
  await mkdir(path.join(directory, 'data'));
  await writeFile(path.join(directory, 'data', 'unrelated.txt'), 'not an SDK package payload');
  const result = await validateSystemImageDirectory(directory, packageId);
  assert.equal(result.valid, false);
  assert.match(result.reason, /authoritative data\/empty_data_disk payload/);
});

test('Android SDK preflight does not accept arbitrary data directories for other package layouts', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'aria-sdk-unrecognized-data-layout-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const directory = path.join(root, 'system-images/android-35/google_apis/x86_64');
  const packageId = 'system-images;android-35;google_apis;x86_64';
  await writeValidImage(directory, packageId);
  await rm(path.join(directory, 'userdata.img'));
  await mkdir(path.join(directory, 'data'));
  await writeFile(path.join(directory, 'data', 'empty_data_disk'), '');
  const result = await validateSystemImageDirectory(directory, packageId);
  assert.equal(result.valid, false);
  assert.match(result.reason, /userdata.img is missing for a package layout that requires it/);
});

test('Android SDK system image preflight rejects a package with wrong metadata and stops after two failed installs', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'aria-sdk-image-fail-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  let attempts = 0;
  await assert.rejects(provisionSystemImage({
    sdkRoot: root,
    apiLevel: 35,
    sdkManager: '/sdkmanager',
    runSdkManager: async () => { attempts++; throw new Error('Error on ZipFile unknown archive'); }
  }), /after 2 bounded install attempts: Error on ZipFile unknown archive/);
  assert.equal(attempts, 2);
});

test('Android screenshot evidence G1 rejects missing screenshot paths', async () => {
  await assert.rejects(buildScreenshotEvidenceManifest({
    required: [{ device: 'tablet', locale: 'pt-BR', state: 'step-4', orientation: 'portrait', path: 'tablet/missing.png' }],
    read: async () => { const error = new Error('ENOENT'); error.code = 'ENOENT'; throw error; }
  }), /Missing required tablet pt-BR recipe #12 step-4 portrait screenshot/);
});

test('Android screenshot evidence G1 rejects wrong orientation and hashes accepted files', async () => {
  const manifest = await buildScreenshotEvidenceManifest({
    required: [{ device: 'phone', locale: 'pt-BR', state: 'ingredients', orientation: 'portrait', path: 'ingredients.png' }],
    read: async () => png(720, 1280)
  });
  assert.equal(manifest.screenshots[0].orientation, 'portrait');
  assert.match(manifest.screenshots[0].sha256, /^[a-f0-9]{64}$/);
  await assert.rejects(buildScreenshotEvidenceManifest({
    required: [{ device: 'phone', locale: 'en-GB', state: 'detail', orientation: 'portrait', path: 'wrong.png' }],
    read: async () => png(1280, 720)
  }), /Wrong orientation.*1280x720/);
});


test('Android G3 timeout and screenshot capture preserve exhaustive evidence within bounded runtime', async () => {
  const workflow = await readFile(new URL('../../.github/workflows/v32-android.yml', import.meta.url), 'utf8');
  const smoke = await readFile(new URL('../../.github/scripts/v32-android-smoke.sh', import.meta.url), 'utf8');
  const capture = smoke.slice(smoke.indexOf('async function captureScreenshot'), smoke.indexOf('async function currentRotation'));
  assert.ok(workflow.includes('G3 FULL REGRESSION — phone, bilingual evidence and all 95 routes' + String.fromCharCode(10) + '        timeout-minutes: 40'));
  assert.ok(smoke.includes('timeout --kill-after=10s 1800s node --input-type=module'));
  assert.ok(smoke.includes("adb(['exec-out','screencap','-p'])"));
  assert.ok(smoke.includes('maxBuffer: 32 * 1024 * 1024'));
  assert.ok(!capture.includes("adb(['pull',remote,pending])"));
  assert.ok(!capture.includes('await pause(500)'));
  assert.ok(smoke.includes('for(let recipeId=1;recipeId<=95;recipeId++)'));
  assert.ok(smoke.includes('for(let recipeId=66;recipeId<=95;recipeId++)'));
  assert.ok(smoke.includes('recipeAuditStartedAt=Date.now()'));
  assert.ok(smoke.includes('full phone portrait audit elapsed_ms='));
  assert.ok(smoke.includes('Verified phone landscape screenshots ${recipeId}/95'));
  assert.ok(smoke.includes('Verified PT-BR recipe routes ${recipeId-65}/30'));
  assert.ok(smoke.includes('const longIngredientNames=layout.boxes.filter(card=>card.name.scrollWidth>=50);'));
  assert.ok(smoke.includes('Math.min(...longIngredientNames.map(card=>card.name.clientWidth))<50'));
  assert.ok(!smoke.includes('Math.min(...layout.boxes.map(card=>card.name.clientWidth))<50'));
  assert.ok(workflow.includes('cat artifacts/v32-diagnostics/apk-sha256.txt'));
});
