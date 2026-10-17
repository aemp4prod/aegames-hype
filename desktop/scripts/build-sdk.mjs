// Transpiles the vendored Sign in with ChatGPT SDK (TypeScript) to plain ES modules, file by file.
import { build } from 'esbuild';
import { readdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'vendor', 'siwc-local', 'src');
const out = join(root, 'vendor', 'siwc-local', 'dist');
rmSync(out, { recursive: true, force: true });
await build({
  entryPoints: readdirSync(src).filter((f) => f.endsWith('.ts')).map((f) => join(src, f)),
  outdir: out,
  format: 'esm',
  platform: 'node',
  target: 'node22',
  bundle: false,
  sourcemap: false,
  logLevel: 'warning',
});
console.log('sdk built →', out);
