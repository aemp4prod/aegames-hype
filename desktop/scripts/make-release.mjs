#!/usr/bin/env node
/* Hype's Windows release for the Æ Games Launcher (docs/DISTRIBUTION.md). After the build, the portable game folder
   (dist/win-unpacked: Hype.exe and everything it needs, nothing else) gets:
   - manifest.json at its root (the local manifest: who, which version, the executable, every file with its exact size
     and SHA-256; no « archive », which would be circular since the archive contains it);
   - a ZIP of that folder, its content right at the root of the archive (no enclosing « Hype/ »), the same byte for
     byte for the same files (sorted paths, fixed dates, no extra fields);
   - the remote manifest.json, attached to the GitHub Release beside the ZIP: the local one plus « archive » (the
     immutable URL of that release's ZIP, its size, its SHA-256).
   The archive is read back: every entry must give back the file described, before anything is said to be ready.

   Usage, after `npm run dist:win` or `npm run dist:portable` (or all at once: `npm run release:win`):
     node scripts/make-release.mjs [--repo aemp4prod/aegames-hype] [--channel stable] [--tag-prefix hype-v]
   Elsewhere: --src <the game folder> --version 0.26.0 [--out <folder>]. The repository can also come from
   HYPE_BUILDS_REPO (the GitHub Actions workflow sets it).
   Out (dist/release): Hype-<version>-windows-x64.zip and manifest.json (the remote one).
   No dependency. */
import { createHash } from 'node:crypto';
import { closeSync, existsSync, mkdirSync, openSync, readdirSync, readFileSync, writeFileSync, writeSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateRawSync, inflateRawSync } from 'node:zlib';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = {};
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (!a.startsWith('--')) continue;
  const k = a.slice(2), v = process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[++i] : 'true';
  args[k] = v;
}
// the version: --version, or the desktop project's package.json (the script may also run outside of it, with --src)
const version = args.version || (existsSync(join(ROOT, 'package.json')) ? JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version : '');
const O = {
  src: resolve(ROOT, args.src || 'dist/win-unpacked'),
  out: resolve(ROOT, args.out || 'dist/release'),
  repo: args.repo || process.env.HYPE_BUILDS_REPO || 'aemp4prod/aegames-hype',
  channel: args.channel || 'stable',
  tagPrefix: args['tag-prefix'] || 'hype-v',
  id: args.id || 'hype',
  name: args.name || 'Hype',
};
const fail = (msg) => { console.error('✗ ' + msg); process.exit(1); };
if (!/^\d+\.\d+\.\d+$/.test(version)) fail(`version « ${version} » : il faut MAJEURE.MINEURE.CORRECTIF (ex. 0.26.0)`);
if (!['stable', 'beta', 'alpha'].includes(O.channel)) fail(`canal « ${O.channel} » : stable, beta ou alpha`);
if (!/^[\w.-]+\/[\w.-]+$/.test(O.repo)) fail(`dépôt « ${O.repo} » : il faut propriétaire/nom`);
const EXE = 'Hype.exe', MANIFEST = 'manifest.json', PLATFORM = 'windows-x86_64';
// Not part of the game: the manifest itself (described apart), the launcher's own file, the NSIS installer's
// elevation helper (only the installer uses it).
const SKIP = new Set([MANIFEST, '.ae-install.json', 'resources/elevate.exe']);

if (!existsSync(join(O.src, EXE))) fail(`${EXE} introuvable dans ${O.src} : lance d’abord « npm run dist:portable »`);

/* ---------- the files ---------- */
function walk(dir, base = '') {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const rel = base ? base + '/' + e.name : e.name;
    if (e.isDirectory()) out.push(...walk(join(dir, e.name), rel));
    else if (e.isFile()) out.push(rel);
    else fail(`${rel} : ni fichier ni dossier (lien ?)`);
  }
  return out;
}
// relative, « / » only, nothing that climbs out of the folder or names a drive
const okPath = (p) => !p.startsWith('/') && !/^[A-Za-z]:/.test(p) && !p.includes('\\') && p.split('/').every((s) => s && s !== '.' && s !== '..');
const sha = (buf) => createHash('sha256').update(buf).digest('hex'); // (lowercase hex)
const byBytes = (a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b));
const paths = walk(O.src).filter((p) => !SKIP.has(p)).sort(byBytes);
for (const p of paths) if (!okPath(p)) fail(`chemin refusé : ${p}`);
const files = paths.map((p) => { const data = readFileSync(join(O.src, ...p.split('/'))); return { path: p, size: data.length, sha256: sha(data) }; });
if (!files.some((f) => f.path === EXE)) fail(`${EXE} absent du dossier du jeu`);

/* ---------- the local manifest, at the root of the game folder ---------- */
const head = { schemaVersion: 1, game: { id: O.id, name: O.name }, version, channel: O.channel, platform: PLATFORM, executable: EXE };
const local = Object.assign({}, head, { files });
const localText = JSON.stringify(local, null, 2) + '\n';
writeFileSync(join(O.src, MANIFEST), localText);

/* ---------- the archive (ZIP, no ZIP64: under 4 GB and 65 535 entries), the game folder at its root ---------- */
const CRC = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc32 = (buf) => { let c = -1; for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return (c ^ -1) >>> 0; };
const DOS_TIME = 0, DOS_DATE = ((2020 - 1980) << 9) | (1 << 5) | 1; // 2020-01-01 00:00, the same for every file, every time

mkdirSync(O.out, { recursive: true });
const zipName = `Hype-${version}-windows-x64.zip`, zipPath = join(O.out, zipName);
const entries = [...paths, MANIFEST].sort(byBytes);
const fd = openSync(zipPath, 'w');
let pos = 0;
const put = (buf) => { writeSync(fd, buf); pos += buf.length; };
const central = [];
for (const p of entries) {
  const data = p === MANIFEST ? Buffer.from(localText, 'utf8') : readFileSync(join(O.src, ...p.split('/')));
  const name = Buffer.from(p, 'utf8');
  const deflated = deflateRawSync(data, { level: 9 });
  const store = deflated.length >= data.length;
  const body = store ? data : deflated, method = store ? 0 : 8, crc = crc32(data);
  if (pos > 0xfffffffe || data.length > 0xfffffffe) fail('archive trop grosse pour un ZIP sans ZIP64');
  const lh = Buffer.alloc(30);
  lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x0800, 6); lh.writeUInt16LE(method, 8);
  lh.writeUInt16LE(DOS_TIME, 10); lh.writeUInt16LE(DOS_DATE, 12); lh.writeUInt32LE(crc, 14);
  lh.writeUInt32LE(body.length, 18); lh.writeUInt32LE(data.length, 22); lh.writeUInt16LE(name.length, 26); lh.writeUInt16LE(0, 28);
  const offset = pos;
  put(lh); put(name); put(body);
  const cd = Buffer.alloc(46);
  cd.writeUInt32LE(0x02014b50, 0); cd.writeUInt16LE(20, 4); cd.writeUInt16LE(20, 6); cd.writeUInt16LE(0x0800, 8); cd.writeUInt16LE(method, 10);
  cd.writeUInt16LE(DOS_TIME, 12); cd.writeUInt16LE(DOS_DATE, 14); cd.writeUInt32LE(crc, 16); cd.writeUInt32LE(body.length, 20);
  cd.writeUInt32LE(data.length, 24); cd.writeUInt16LE(name.length, 28); cd.writeUInt16LE(0, 30); cd.writeUInt16LE(0, 32);
  cd.writeUInt16LE(0, 34); cd.writeUInt16LE(0, 36); cd.writeUInt32LE(0, 38); cd.writeUInt32LE(offset, 42);
  central.push(cd, name);
}
if (entries.length > 65535) fail('trop de fichiers pour un ZIP sans ZIP64');
const cdStart = pos;
for (const b of central) put(b);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(0, 4); end.writeUInt16LE(0, 6); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10);
end.writeUInt32LE(pos - cdStart, 12); end.writeUInt32LE(cdStart, 16); end.writeUInt16LE(0, 20);
put(end);
closeSync(fd);

/* ---------- read it back: every entry gives back the file described, the local manifest included ---------- */
const zip = readFileSync(zipPath);
const eocd = zip.length - 22;
if (zip.readUInt32LE(eocd) !== 0x06054b50) fail('archive : fin introuvable');
let p0 = zip.readUInt32LE(eocd + 16);
const n = zip.readUInt16LE(eocd + 10);
if (n !== entries.length) fail('archive : nombre d’entrées');
const want = new Map(files.map((f) => [f.path, f]));
let sawManifest = false;
for (let k = 0; k < n; k++) {
  if (zip.readUInt32LE(p0) !== 0x02014b50) fail('archive : répertoire central abîmé');
  const method = zip.readUInt16LE(p0 + 10), csize = zip.readUInt32LE(p0 + 20), nlen = zip.readUInt16LE(p0 + 28), off = zip.readUInt32LE(p0 + 42);
  const name = zip.toString('utf8', p0 + 46, p0 + 46 + nlen);
  const lnlen = zip.readUInt16LE(off + 26), lxlen = zip.readUInt16LE(off + 28);
  const raw = zip.subarray(off + 30 + lnlen + lxlen, off + 30 + lnlen + lxlen + csize);
  const data = method === 8 ? inflateRawSync(raw) : raw;
  if (name !== entries[k]) fail(`archive : ${name} n’est pas à sa place`);
  if (name === MANIFEST) { sawManifest = data.toString('utf8') === localText; if (!sawManifest) fail('archive : manifest.json abîmé'); }
  else { const f = want.get(name); if (!f || data.length !== f.size || sha(data) !== f.sha256) fail(`archive : ${name} ne correspond pas au manifeste`); }
  p0 += 46 + nlen + zip.readUInt16LE(p0 + 30) + zip.readUInt16LE(p0 + 32);
}
if (!sawManifest) fail('archive : manifest.json absent');

/* ---------- the remote manifest: the local one, plus the archive of this exact release ---------- */
const tag = `${O.tagPrefix}${version}`;
const remote = Object.assign({}, head, {
  archive: { url: `https://github.com/${O.repo}/releases/download/${tag}/${zipName}`, size: zip.length, sha256: sha(zip) },
  files,
});
writeFileSync(join(O.out, MANIFEST), JSON.stringify(remote, null, 2) + '\n');
console.log(`✓ ${files.length} fichiers décrits dans ${join(O.src, MANIFEST)}`);
console.log(`✓ ${zipName} : ${zip.length} o, sha256 ${remote.archive.sha256} (relu, entrée par entrée)`);
console.log(`✓ ${join(O.out, MANIFEST)} (manifeste distant, avec « archive »)`);
console.log(`  Release ${tag} de ${O.repo} : ${zipName} et ${MANIFEST}`);
