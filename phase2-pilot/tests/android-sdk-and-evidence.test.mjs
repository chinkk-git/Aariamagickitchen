import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
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
  await writeFile(path.join(directory, 'source.properties'), `Pkg.Path=${packageId}\nPkg.Revision=1\nAndroidVersion.ApiLevel=35\nSystemImage.Abi=x86_64\n`);
  const sparseImage = Buffer.alloc(4096);
  sparseImage.writeUInt32LE(0xed26ff3a, 0);
  await writeFile(path.join(directory, 'system.img'), sparseImage);
  await writeFile(path.join(directory, 'userdata.img'), sparseImage);
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
