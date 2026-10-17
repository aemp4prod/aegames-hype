// The games, as JSON files in the app's folder. A document path from the game ("data/users/local/g_x")
// becomes a file ("…/parties/data/users/local/g_x.json"). Writes are atomic: a crash never leaves half a file.
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';

const SEGMENT = /^[A-Za-z0-9_-][A-Za-z0-9_.-]{0,119}$/;
const MAX_BYTES = 8 * 1024 * 1024;

export class GameStore {
  constructor(dir) { this.dir = dir; }

  file(path) {
    if (typeof path !== 'string' || !path || path.length > 300) throw { code: 'invalid_argument', message: 'chemin invalide' };
    const parts = path.split('/');
    if (parts.length > 8 || parts.some((p) => !SEGMENT.test(p) || p.includes('..'))) throw { code: 'invalid_argument', message: 'chemin invalide' };
    return join(this.dir, ...parts) + '.json';
  }

  async get(path) {
    const file = this.file(path);
    let text;
    try { text = await readFile(file, 'utf8'); } catch (e) {
      if (e && e.code === 'ENOENT') return null;
      throw { code: 'io_error', message: 'lecture impossible' };
    }
    try { return JSON.parse(text); } catch (e) { throw { code: 'corrupt', message: 'fichier abîmé' }; }
  }

  async set(path, body) {
    const file = this.file(path);
    const text = JSON.stringify(body);
    if (typeof text !== 'string') throw { code: 'invalid_argument', message: 'contenu invalide' };
    if (Buffer.byteLength(text) > MAX_BYTES) throw { code: 'invalid_argument', message: 'trop gros' };
    await mkdir(dirname(file), { recursive: true });
    const tmp = file + '.' + randomUUID() + '.tmp';
    try {
      await writeFile(tmp, text, 'utf8');
      await rename(tmp, file);
    } catch (e) {
      await rm(tmp, { force: true }).catch(() => {});
      throw { code: e && e.code === 'ENOSPC' ? 'quota_exceeded' : 'io_error', message: 'écriture impossible' };
    }
  }

  async del(path) {
    try { await rm(this.file(path), { force: true }); } catch (e) {
      if (e && e.code) throw { code: 'io_error', message: 'suppression impossible' };
      throw e;
    }
  }
}
