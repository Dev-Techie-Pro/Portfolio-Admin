/**
 * Compile client TypeScript sources to browser-ready ES modules in public/js/.
 * - Standalone scripts: unbundled (boot-prefetch, prefetch-config, body-loader, utilities).
 * - main.ts: bundled with code splitting for page modules.
 */
import * as esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';

const CLIENT_ROOT = path.resolve('client');
const OUT_DIR = path.resolve('public/js');
const MAIN_ENTRY = path.join(CLIENT_ROOT, 'main.ts');

const SHARED_BUILD = {
  format: 'esm',
  platform: 'browser',
  target: ['es2020'],
  sourcemap: false,
  logLevel: 'info',
};

function walkTs(dir, results = []) {
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkTs(full, results);
    else if (entry.name.endsWith('.ts')) results.push(full);
  }
  return results;
}

const allTs = walkTs(CLIENT_ROOT);
const standaloneEntries = allTs.filter((file) => path.normalize(file) !== path.normalize(MAIN_ENTRY));

if (!allTs.length) {
  console.log('No client TypeScript files found in client/.');
  process.exit(0);
}

async function buildAll() {
  if (standaloneEntries.length) {
    await esbuild.build({
      ...SHARED_BUILD,
      entryPoints: standaloneEntries,
      outdir: OUT_DIR,
      outbase: CLIENT_ROOT,
      bundle: false,
    });
  }

  if (fs.existsSync(MAIN_ENTRY)) {
    await esbuild.build({
      ...SHARED_BUILD,
      entryPoints: [MAIN_ENTRY],
      outdir: OUT_DIR,
      outbase: CLIENT_ROOT,
      bundle: true,
      splitting: true,
      chunkNames: 'chunks/[name]-[hash]',
    });
  }

  console.log(
    `Built ${standaloneEntries.length} standalone + main bundle (${allTs.length} source file(s)) → public/js/`,
  );
}

if (process.argv.includes('--watch')) {
  const contexts = [];
  if (standaloneEntries.length) {
    contexts.push(
      await esbuild.context({
        ...SHARED_BUILD,
        entryPoints: standaloneEntries,
        outdir: OUT_DIR,
        outbase: CLIENT_ROOT,
        bundle: false,
      }),
    );
  }
  if (fs.existsSync(MAIN_ENTRY)) {
    contexts.push(
      await esbuild.context({
        ...SHARED_BUILD,
        entryPoints: [MAIN_ENTRY],
        outdir: OUT_DIR,
        outbase: CLIENT_ROOT,
        bundle: true,
        splitting: true,
        chunkNames: 'chunks/[name]-[hash]',
      }),
    );
  }
  for (const ctx of contexts) await ctx.watch();
  console.log(`Watching client sources → public/js/`);
} else {
  await buildAll();
}
