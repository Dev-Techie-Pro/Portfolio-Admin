import * as esbuild from 'esbuild';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const entryPath = path.join(root, 'scripts', 'sidebar-html-entry.mjs');

/**
 * Evaluate app/sidebarHtml.tsx and return rendered SIDEBAR_INNER_HTML.
 */
export async function getSidebarInnerHtml() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pa-sidebar-'));
  const outPath = path.join(tmpDir, 'out.mjs');

  await esbuild.build({
    entryPoints: [entryPath],
    absWorkingDir: root,
    bundle: true,
    outfile: outPath,
    format: 'esm',
    platform: 'node',
    logLevel: 'silent',
  });

  const mod = await import(pathToFileURL(outPath).href);
  const html = mod.SIDEBAR_INNER_HTML;
  fs.rmSync(tmpDir, { recursive: true, force: true });
  return html;
}
