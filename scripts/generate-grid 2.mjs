#!/usr/bin/env node
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = process.cwd();
const PUBLIC_DIR = join(ROOT, 'public');
const PHOTOS_DIR = join(PUBLIC_DIR, 'etsy_photos');
const INDEX_HTML = join(ROOT, 'index.html');

const START_MARK = '<!-- GRID:START -->';
const END_MARK = '<!-- GRID:END -->';

function ensureDirs() {
  if (!existsSync(PUBLIC_DIR)) mkdirSync(PUBLIC_DIR);
  if (!existsSync(PHOTOS_DIR)) mkdirSync(PHOTOS_DIR);
}

function getImages() {
  const allow = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
  if (!existsSync(PHOTOS_DIR)) return [];
  return readdirSync(PHOTOS_DIR)
    .filter((f) => allow.has(extname(f).toLowerCase()))
    .sort((a, b) => a.localeCompare(b));
}

function humanize(name) {
  const base = name.replace(/\.[^.]+$/, '');
  return base.replace(/[-_]+/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
}

function buildGrid(images) {
  if (!images.length) {
    return '<p class="grid-empty">Add images to /public/etsy_photos to populate the gallery.</p>';
  }
  const items = images
    .map((file) => {
      const src = `/public/etsy_photos/${file}`;
      const title = humanize(file);
      const slug = file.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const productPath = join(ROOT, `product-${slug}.html`);
      const rel = `/product-${slug}`; // cleanUrls=true -> omit .html
      const img = `<img src="${src}" alt="${title}" loading="lazy" decoding="async" />`;
      const caption = `<figcaption>${title}</figcaption>`;
      if (existsSync(productPath)) {
        return `\n    <figure class="card">\n      <a href="${rel}" aria-label="View ${title}">${img}</a>\n      ${caption}\n    </figure>`;
      }
      return `\n    <figure class="card">\n      ${img}\n      ${caption}\n    </figure>`;
    })
    .join('');
  return `\n  <div class="grid">${items}\n  </div>`;
}

function injectGrid(html, gridHtml) {
  if (html.includes(START_MARK) && html.includes(END_MARK)) {
    // Replace between markers
    const pattern = new RegExp(`${START_MARK}[\s\S]*?${END_MARK}`);
    return html.replace(pattern, `${START_MARK}\n${gridHtml}\n  ${END_MARK}`);
  }
  // If no markers, try to insert before closing main or body
  const insertion = `\n  ${START_MARK}\n${gridHtml}\n  ${END_MARK}\n`;
  if (html.includes('</main>')) return html.replace('</main>', `${insertion}</main>`);
  if (html.includes('</body>')) return html.replace('</body>', `${insertion}</body>`);
  return html + insertion;
}

function injectGrid2(html, gridHtml) {
  if (html.includes(START_MARK) && html.includes(END_MARK)) {
    const start = html.indexOf(START_MARK);
    const end = html.indexOf(END_MARK, start);
    if (start !== -1 && end !== -1) {
      const before = html.slice(0, start);
      const after = html.slice(end + END_MARK.length);
      return `${before}${START_MARK}\n${gridHtml}\n  ${END_MARK}${after}`;
    }
  }
  const insertion = `\n  ${START_MARK}\n${gridHtml}\n  ${END_MARK}\n`;
  if (html.includes('</main>')) return html.replace('</main>', `${insertion}</main>`);
  if (html.includes('</body>')) return html.replace('</body>', `${insertion}</body>`);
  return html + insertion;
}

function run() {
  ensureDirs();
  const images = getImages();
  if (images.length === 0) {
    console.error('[generate-grid] No images found in /public/etsy_photos');
    if (process.env.CI) {
      process.exit(1);
    }
  }
  const grid = buildGrid(images);
  const html = readFileSync(INDEX_HTML, 'utf8');
  const updated = injectGrid2(html, grid);
  writeFileSync(INDEX_HTML, updated);
  console.log(`[generate-grid] Injected ${images.length} image(s) into index.html`);
}

run();
