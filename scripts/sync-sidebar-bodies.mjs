import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getSidebarInnerHtml } from './get-sidebar-html.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function escapeForTsString(html) {
  return html
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n');
}

function walk(dir, files = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (name === 'node_modules' || name === '.next') continue;
      walk(full, files);
    } else if (/bodyHtml.*\.tsx$/.test(name)) {
      files.push(full);
    }
  }
  return files;
}

const sidebarHtml = await getSidebarInnerHtml();
const escapedSidebar = escapeForTsString(sidebarHtml.trim());

const asideRe = /<aside class=\\"pa-sidebar\\"[\s\S]*?<\/aside>/g;
let updated = 0;

for (const file of walk(path.join(root, 'app'))) {
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes('class=\\"pa-sidebar\\"')) continue;
  const next = content.replace(asideRe, escapedSidebar);
  if (next === content) {
    console.warn('No change:', path.relative(root, file));
    continue;
  }
  fs.writeFileSync(file, next, 'utf8');
  updated += 1;
  console.log('Updated:', path.relative(root, file));
}

console.log(`Done. ${updated} file(s) updated.`);
