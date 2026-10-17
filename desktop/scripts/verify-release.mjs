#!/usr/bin/env node
/* Plays the Æ Games Launcher's side of the contract (docs/DISTRIBUTION.md) on a release, before or after it is published:
   1. the remote manifest (a file, or its URL: the « latest » one once published) is read and checked;
   2. the ZIP (a file, or the manifest's archive URL) must have the size and SHA-256 announced;
   3. it is extracted in a temporary folder, refusing any path that is absolute, climbs out (« .. ») or names a drive;
   4. the extracted manifest.json must describe the same game, version and files as the remote one (no « archive »);
   5. every installed file must have its size and SHA-256, the executable must be there, and nothing else.
   Usage:
     node scripts/verify-release.mjs [--manifest dist/release/manifest.json] [--zip dist/release/Hype-0.26.0-windows-x64.zip]
     node scripts/verify-release.mjs --manifest https://github.com/<owner>/<repo>/releases/latest/download/manifest.json
   (with a URL and no --zip, the archive is downloaded from the manifest's own URL). No dependency. */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateRawSync } from 'node:zlib';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = {};
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (!a.startsWith('--')) continue;
  args[a.slice(2)] = process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[++i] : 'true';
}
const fail = (msg) => { console.error('✗ ' + msg); process.exit(1); };
const sha = (buf) => createHash('sha256').update(buf).digest('hex');
const HEX64 = /^[0-9a-f]{64}$/;
const okPath = (p) => typeof p === 'string' && !p.startsWith('/') && !/^[A-Za-z]:/.test(p) && !p.includes('\\') && p.split('/').every((s) => s && s !== '.' && s !== '..');
const isUrl = (s) => /^https?:\/\//.test(s || '');
async function get(src, what) {
  if (!isUrl(src)) { if (!existsSync(src)) fail(`${what} introuvable : ${src}`); return readFileSync(src); }
  const r = await fetch(src, { redirect: 'follow' });
  if (!r.ok) fail(`${what} : ${src} répond ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}

const mSrc = args.manifest || join(ROOT, 'dist/release/manifest.json');
const remote = JSON.parse((await get(isUrl(mSrc) ? mSrc : resolve(mSrc), 'manifeste')).toString('utf8'));

/* ---------- 1. the remote manifest ---------- */
const R = remote;
if (R.schemaVersion !== 1) fail('schemaVersion : 1 attendu');
if (!R.game || R.game.id !== 'hype' || typeof R.game.name !== 'string' || !R.game.name) fail('game : { id: "hype", name } attendu');
if (!/^\d+\.\d+\.\d+$/.test(R.version || '')) fail(`version « ${R.version} » : MAJEURE.MINEURE.CORRECTIF attendu`);
if (!['stable', 'beta', 'alpha'].includes(R.channel)) fail(`channel « ${R.channel} »`);
if (R.platform !== 'windows-x86_64') fail(`platform « ${R.platform} » : windows-x86_64 attendu`);
if (!okPath(R.executable)) fail(`executable « ${R.executable} »`);
const A = R.archive;
if (!A || typeof A.url !== 'string' || !Number.isInteger(A.size) || !HEX64.test(A.sha256 || '')) fail('archive : { url, size, sha256 } attendu');
const zipName = `Hype-${R.version}-windows-x64.zip`;
if (!new RegExp(`^https://github\\.com/[\\w.-]+/[\\w.-]+/releases/download/[\\w.-]*v${R.version.replace(/\./g, '\\.')}/${zipName.replace(/\./g, '\\.')}$`).test(A.url)) fail(`archive.url : l’URL immuable de la release de cette version est attendue (pas « latest ») : ${A.url}`);
if (!Array.isArray(R.files) || !R.files.length) fail('files : liste vide');
const seen = new Set();
for (const f of R.files) {
  if (!okPath(f.path)) fail(`chemin refusé dans files : ${f.path}`);
  if (seen.has(f.path)) fail(`chemin en double : ${f.path}`);
  seen.add(f.path);
  if (!Number.isInteger(f.size) || f.size < 0) fail(`taille invalide : ${f.path}`);
  if (!HEX64.test(f.sha256 || '')) fail(`sha256 invalide (64 caractères hexadécimaux en minuscules) : ${f.path}`);
}
if (!seen.has(R.executable)) fail(`${R.executable} absent de files`);
if (seen.has('manifest.json')) fail('files ne doit pas se décrire lui-même (manifest.json)');
console.log(`✓ manifeste distant : ${R.game.name} ${R.version} (${R.channel}, ${R.platform}), ${R.files.length} fichiers`);

/* ---------- 2. the archive ---------- */
const zSrc = args.zip ? resolve(args.zip) : isUrl(mSrc) ? A.url : join(dirname(resolve(mSrc)), zipName);
const zip = await get(zSrc, 'archive');
if (zip.length !== A.size) fail(`archive : ${zip.length} o au lieu de ${A.size}`);
if (sha(zip) !== A.sha256) fail('archive : SHA-256 différent du manifeste');
console.log(`✓ archive : ${zip.length} o, SHA-256 conforme`);

/* ---------- 3. a safe extraction ---------- */
const dest = mkdtempSync(join(tmpdir(), 'hype-verify-'));
try {
  const eocd = zip.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocd < 0) fail('archive : fin introuvable');
  let p0 = zip.readUInt32LE(eocd + 16);
  const n = zip.readUInt16LE(eocd + 10);
  const got = [];
  for (let k = 0; k < n; k++) {
    if (zip.readUInt32LE(p0) !== 0x02014b50) fail('archive : répertoire central abîmé');
    const method = zip.readUInt16LE(p0 + 10), csize = zip.readUInt32LE(p0 + 20), nlen = zip.readUInt16LE(p0 + 28), off = zip.readUInt32LE(p0 + 42);
    const name = zip.toString('utf8', p0 + 46, p0 + 46 + nlen);
    p0 += 46 + nlen + zip.readUInt16LE(p0 + 30) + zip.readUInt16LE(p0 + 32);
    if (name.endsWith('/')) { if (!okPath(name.slice(0, -1))) fail(`dossier refusé dans l’archive : ${name}`); continue; }
    if (!okPath(name)) fail(`chemin dangereux dans l’archive : ${name}`);
    const lnlen = zip.readUInt16LE(off + 26), lxlen = zip.readUInt16LE(off + 28);
    const raw = zip.subarray(off + 30 + lnlen + lxlen, off + 30 + lnlen + lxlen + csize);
    if (method !== 0 && method !== 8) fail(`méthode de compression inconnue : ${name}`);
    const data = method === 8 ? inflateRawSync(raw) : raw;
    const out = join(dest, ...name.split('/'));
    if (!resolve(out).startsWith(resolve(dest) + (process.platform === 'win32' ? '\\' : '/'))) fail(`chemin hors du dossier : ${name}`);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, data);
    got.push(name);
  }
  const top = new Set(got.map((p) => p.split('/')[0]));
  if (!top.has(R.executable)) fail(`${R.executable} n’est pas à la racine de l’archive (un dossier englobant ?)`);
  console.log(`✓ extraction sûre : ${got.length} fichiers, ${R.executable} à la racine`);

  /* ---------- 4. the local manifest, extracted ---------- */
  const lp = join(dest, 'manifest.json');
  if (!existsSync(lp)) fail('manifest.json absent de la racine de l’archive');
  const L = JSON.parse(readFileSync(lp, 'utf8'));
  if ('archive' in L) fail('le manifeste local ne doit pas avoir « archive »');
  const strip = (o) => JSON.stringify(Object.assign({}, o, { archive: undefined }));
  if (strip(L) !== strip(R)) fail('le manifeste local et le manifeste distant ne décrivent pas la même chose');
  console.log('✓ manifeste local : identique au distant, sans « archive »');

  /* ---------- 5. every file installed ---------- */
  for (const f of L.files) {
    const p = join(dest, ...f.path.split('/'));
    if (!existsSync(p)) fail(`manquant : ${f.path}`);
    const data = readFileSync(p);
    if (data.length !== f.size) fail(`taille : ${f.path}`);
    if (sha(data) !== f.sha256) fail(`SHA-256 : ${f.path}`);
  }
  const listed = new Set([...L.files.map((f) => f.path), 'manifest.json']);
  const walk = (d, b = '') => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name), b + e.name + '/') : [b + e.name]));
  const extra = walk(dest).filter((p) => !listed.has(p));
  if (extra.length) fail(`fichiers en trop dans l’archive : ${extra.slice(0, 5).join(', ')}`);
  console.log(`✓ ${L.files.length} fichiers installés vérifiés (taille et SHA-256), rien en trop`);
  console.log(`✓ ${R.game.name} ${R.version} : conforme au contrat du launcher`);
} finally {
  rmSync(dest, { recursive: true, force: true });
}
