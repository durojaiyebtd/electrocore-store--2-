#!/usr/bin/env node
/**
 * Imports the FULL live Technocrat Nigeria catalog into src/data/products.json.
 *
 *   node scripts/import-full-catalog.js              scrape every page and save
 *   node scripts/import-full-catalog.js --dry-run    scrape and report, but do not write the file
 *   node scripts/import-full-catalog.js --max-pages 3   (testing only) stop after 3 pages
 *
 * How it works
 *   1. Requests https://www.technocratng.com/shop/products?page=1, 2, 3 ... one page at a time
 *      and stops only when a page returns no products it has not already seen.
 *   2. Finds each product card in the page's HTML and reads the real image address from the
 *      card's <img> attributes (data-src, data-lazy-src, data-original, src, srcset) -
 *      nothing is guessed. Relative addresses are made absolute. Technocrat serves photos
 *      through Next.js's /_next/image?url=... optimiser; the address inside `url=` is the
 *      real CDN file, so that is what is saved (pass --keep-optimizer to keep the wrapper).
 *   3. Parses the ₦ price into a plain number (your cost price) and multiplies it by 1.06
 *      for your selling price.
 *   4. Writes src/data/products.json (a backup of the old file goes to
 *      src/data/.products.backup.json).
 *
 * Needs Node 18 or newer. No npm packages. Nothing is written if no products were found.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

// ---------------------------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------------------------
const MARKUP = 1.06;
const MAX_PAGES_SAFETY = 500; // never loop forever
const REQUEST_DELAY_MS = 400; // be polite to the supplier's server
const DEBUG_DIR = __dirname;

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};

const OUTPUT_FILE = path.resolve(option('--out', path.join(__dirname, '..', 'src', 'data', 'products.json')));
const BACKUP_FILE = path.join(path.dirname(OUTPUT_FILE), '.products.backup.json');
const BASE_URL = option('--base', 'https://www.technocratng.com').replace(/\/+$/, '');
const LIST_PATH = option('--list-path', '/shop/products');
const MAX_PAGES = Math.min(Number(option('--max-pages', String(MAX_PAGES_SAFETY))) || MAX_PAGES_SAFETY, MAX_PAGES_SAFETY);
const DRY_RUN = flag('--dry-run');
const KEEP_OPTIMIZER = flag('--keep-optimizer');
const DELAY = Number(option('--delay', String(REQUEST_DELAY_MS)));

// ---------------------------------------------------------------------------------------------
// Tiny dependency-free HTML parser (enough for reading product cards)
// ---------------------------------------------------------------------------------------------
const VOID_TAGS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
const RAW_TEXT_TAGS = new Set(['script', 'style', 'textarea', 'title']);

const NAMED_ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', hellip: '…',
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', times: '×', reg: '®', copy: '©', trade: '™', deg: '°', naira: '₦',
};

function decodeEntities(value) {
  return String(value).replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/gi, (match, body) => {
    if (body[0] === '#') {
      const code = body[1].toLowerCase() === 'x' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : match;
    }
    const named = NAMED_ENTITIES[body.toLowerCase()];
    return named === undefined ? match : named;
  });
}

function parseAttributes(source) {
  const attrs = {};
  const re = /([^\s=\/>"']+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
  let match;
  while ((match = re.exec(source)) !== null) {
    const name = match[1].toLowerCase();
    if (name in attrs) continue;
    const value = match[2] ?? match[3] ?? match[4] ?? '';
    attrs[name] = decodeEntities(value);
  }
  return attrs;
}

function parseHtml(html) {
  const root = { tag: '#root', attrs: {}, children: [], parent: null };
  let current = root;
  const re = /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<![^>]*>|<\/([a-zA-Z][\w:-]*)\s*>|<([a-zA-Z][\w:-]*)((?:"[^"]*"|'[^']*'|[^'">])*)>|([^<]+|<)/g;
  let match;
  while ((match = re.exec(html)) !== null) {
    if (match[1]) {
      // closing tag: close the nearest matching open element (ignore stray closers)
      const tag = match[1].toLowerCase();
      for (let node = current; node && node !== root; node = node.parent) {
        if (node.tag === tag) {
          current = node.parent;
          break;
        }
      }
    } else if (match[2]) {
      const tag = match[2].toLowerCase();
      const rawAttrs = match[3] || '';
      const node = { tag, attrs: parseAttributes(rawAttrs), children: [], parent: current };
      current.children.push(node);
      const selfClosing = /\/\s*$/.test(rawAttrs);
      if (RAW_TEXT_TAGS.has(tag) && !selfClosing) {
        // keep the raw content out of the tree, but skip past it correctly
        const closeRe = new RegExp(`</${tag}\\s*>`, 'ig');
        closeRe.lastIndex = re.lastIndex;
        const close = closeRe.exec(html);
        const end = close ? close.index : html.length;
        node.rawText = html.slice(re.lastIndex, end);
        re.lastIndex = close ? close.index + close[0].length : html.length;
      } else if (!VOID_TAGS.has(tag) && !selfClosing) {
        current = node;
      }
    } else if (match[4] !== undefined) {
      current.children.push({ text: decodeEntities(match[4]) });
    }
  }
  return root;
}

function* walk(node) {
  yield node;
  for (const child of node.children || []) yield* walk(child);
}

function textOf(node, exclude) {
  const parts = [];
  (function collect(n) {
    if (n.text !== undefined) {
      parts.push(n.text);
      return;
    }
    if (exclude && exclude(n)) return;
    for (const child of n.children) collect(child);
    parts.push(' ');
  })(node);
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

// ---------------------------------------------------------------------------------------------
// Reading product cards
// ---------------------------------------------------------------------------------------------
const PRODUCT_HREF = /^(?:https?:\/\/[^\/]+)?\/shop\/products\/([^\/?#]+)/i;

function productSlug(node) {
  if (node.tag !== 'a' || !node.attrs.href) return null;
  const match = PRODUCT_HREF.exec(node.attrs.href.trim());
  return match ? decodeURIComponent(match[1]) : null;
}

function slugsWithin(node) {
  const slugs = new Set();
  for (const n of walk(node)) {
    const slug = n.children ? productSlug(n) : null;
    if (slug) slugs.add(slug);
  }
  return slugs;
}

/** The card is the largest wrapper that contains this product's link and no other product's. */
function cardFor(anchor, slug) {
  let card = anchor;
  while (card.parent && card.parent.tag !== '#root') {
    const slugs = slugsWithin(card.parent);
    if (slugs.size > 1 || !slugs.has(slug)) break;
    card = card.parent;
  }
  return card;
}

const isStruckOut = (n) =>
  n.tag === 'del' || n.tag === 's' || n.tag === 'strike' || /line-through/.test(n.attrs.class || '') || /line-through/.test(n.attrs.style || '');

function parsePriceNaira(text) {
  const match = /(?:₦|\bNGN)\s*([0-9][0-9,]*(?:\.[0-9]+)?)/.exec(text);
  if (!match) return null;
  const value = Number(match[1].replace(/,/g, ''));
  return Number.isFinite(value) && value > 0 ? value : null;
}

function firstSrcsetUrl(srcset) {
  // "a.jpg 640w, b.jpg 1080w" -> the widest candidate
  const candidates = srcset
    .split(/,\s+(?=\S)/)
    .map((part) => part.trim().split(/\s+/))
    .filter((parts) => parts[0]);
  if (candidates.length === 0) return null;
  const width = (parts) => (parts[1] && /w$/.test(parts[1]) ? parseInt(parts[1], 10) : 0);
  candidates.sort((a, b) => width(b) - width(a));
  return candidates[0][0];
}

function imageCandidates(img) {
  const a = img.attrs;
  const raw = [a['data-src'], a['data-lazy-src'], a['data-original'], a.src];
  if (a.srcset) raw.push(firstSrcsetUrl(a.srcset));
  if (a['data-srcset']) raw.push(firstSrcsetUrl(a['data-srcset']));
  return raw.filter((value) => value && !/^data:/i.test(value.trim()));
}

function absoluteUrl(value) {
  try {
    return new URL(value.trim(), BASE_URL + '/').href;
  } catch {
    return null;
  }
}

/** /_next/image?url=<real file>&w=3840 -> the real file (unless --keep-optimizer). */
function unwrapOptimizer(href) {
  if (KEEP_OPTIMIZER) return href;
  try {
    const url = new URL(href);
    if (url.pathname === '/_next/image' && url.searchParams.get('url')) {
      return absoluteUrl(url.searchParams.get('url')) || href;
    }
  } catch {
    /* fall through */
  }
  return href;
}

const isLogoOrIcon = (href) => /brandfetch\.io|\.svg(\?|$)|favicon|logo/i.test(href);

function productImage(card) {
  const images = [];
  for (const node of walk(card)) {
    if (node.tag === 'img') images.push(node);
    if (node.tag === 'source') images.push({ attrs: { srcset: node.attrs.srcset, 'data-srcset': node.attrs['data-srcset'] } });
  }
  for (const img of images) {
    for (const candidate of imageCandidates(img)) {
      const href = absoluteUrl(candidate);
      if (href && !isLogoOrIcon(unwrapOptimizer(href)) && !isLogoOrIcon(href)) return unwrapOptimizer(href);
    }
  }
  return '';
}

function titleOf(card, slug) {
  const slugAnchors = [...walk(card)].filter((n) => n.children && productSlug(n) === slug);
  const texts = slugAnchors.map((a) => textOf(a)).filter((t) => t.length > 2 && !/^(add to cart|view|buy now|quick view)$/i.test(t));
  texts.sort((x, y) => y.length - x.length);
  if (texts[0]) return texts[0];
  for (const n of walk(card)) {
    if (/^h[1-6]$/.test(n.tag)) {
      const t = textOf(n);
      if (t.length > 2) return t;
    }
  }
  for (const n of walk(card)) {
    if (n.tag === 'img' && n.attrs.alt && n.attrs.alt.trim().length > 2 && !isLogoOrIcon(n.attrs.src || '')) return n.attrs.alt.trim();
  }
  return '';
}

function parseListingPage(html) {
  const root = parseHtml(html);
  const bySlug = new Map();
  for (const node of walk(root)) {
    const slug = node.children ? productSlug(node) : null;
    if (slug && !bySlug.has(slug)) bySlug.set(slug, node);
  }

  const cards = [];
  for (const [slug, anchor] of bySlug) {
    const card = cardFor(anchor, slug);
    const fullText = textOf(card);
    const priceText = textOf(card, isStruckOut);
    cards.push({
      slug,
      sourceUrl: absoluteUrl(anchor.attrs.href).split(/[?#]/)[0],
      title: titleOf(card, slug),
      cost: parsePriceNaira(priceText),
      imageUrl: productImage(card),
      inStock: !/out of stock|sold out|unavailable/i.test(fullText),
      rawPriceText: priceText.match(/(?:₦|\bNGN)\s*[0-9][0-9,]*(?:\.[0-9]+)?/)?.[0] || '',
    });
  }

  const pageText = textOf(root);
  const totalMatch = /\bof\s+([0-9][0-9,]*)\s*(?:products|results|items)?/i.exec(pageText.slice(pageText.search(/showing/i) >= 0 ? pageText.search(/showing/i) : 0));
  const expectedTotal = /showing/i.test(pageText) && totalMatch ? Number(totalMatch[1].replace(/,/g, '')) : null;
  return { cards, expectedTotal };
}

// ---------------------------------------------------------------------------------------------
// Category (the listing cards carry no category label, so it is read from the product title)
// ---------------------------------------------------------------------------------------------
const CATEGORY_RULES = [
  ['Spare Parts', /\b(replacement|spare|display module|screen assembly|lcd|digitizer|motherboard|keyboard (?:for|replacement)|battery for|charging port|flex cable|housing)\b/i],
  ['Accessories', /\b(tempered|screen protector|protector|case|cover|pouch|sleeve|charger|charging cable|cable|adapter|adaptor|dongle|hub|stand|mount|holder|strap|mouse|keyboard|webcam|headset|earbuds?|earphones?|airpods|bag|backpack|stylus|pen|mousepad|docking)\b/i],
  ['Laptops', /\b(laptop|notebook|macbook|elitebook|probook|zbook|thinkpad|ideapad|latitude|inspiron|xps|vostro|chromebook|zenbook|vivobook|aspire|spectre|envy|pavilion|surface (?:laptop|pro|book)|alienware|legion|rog (?:strix|zephyrus|flow)|omen|victus)\b/i],
  ['Tablets', /\b(ipad|tablet|galaxy tab|tab [a-z]\d+|surface go|kindle)\b/i],
  ['Phones', /\b(iphone|smartphone|galaxy (?:s|a|z|m|note)\d+|pixel \d+|redmi|infinix|tecno|itel|oneplus|xiaomi|oppo|vivo|nokia|phone)\b/i],
  ['Desktops', /\b(desktop|all-in-one|aio|imac|mac mini|mac studio|tower|workstation|mini pc|optiplex|prodesk|thinkcentre)\b/i],
  ['Monitors & Displays', /\b(monitor|display|projector|tv|television)\b/i],
  ['Printers & Scanners', /\b(printer|scanner|toner|ink|laserjet|deskjet|officejet|epson|canon pixma)\b/i],
  ['Gaming', /\b(playstation|ps5|ps4|xbox|nintendo|switch console|gaming|controller|gamepad)\b/i],
  ['Networking', /\b(router|switch|access point|wi-?fi|modem|mikrotik|ubiquiti|tp-link|network|ethernet|mesh|extender)\b/i],
  ['Storage', /\b(ssd|hdd|hard drive|flash drive|usb drive|memory card|sd card|nvme|external drive|pen drive)\b/i],
  ['Power & Batteries', /\b(ups|inverter|power bank|powerbank|battery|solar|stabilizer|surge)\b/i],
  ['Audio', /\b(speaker|soundbar|microphone|headphone|earbud|bluetooth speaker)\b/i],
  ['Cameras & Security', /\b(camera|cctv|dash ?cam|gopro|drone|surveillance)\b/i],
  ['Software', /\b(software|licen[cs]e|antivirus|windows \d+ (?:pro|home)|office 365|microsoft 365)\b/i],
];

function categoryFor(title) {
  for (const [name, pattern] of CATEGORY_RULES) {
    if (pattern.test(title)) return name;
  }
  return 'Other';
}

// ---------------------------------------------------------------------------------------------
// Fetching with retries
// ---------------------------------------------------------------------------------------------
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchPage(url, attempt = 1) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ElectroCoreCatalogImporter/1.0; +catalog import for our own store)',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-NG,en;q=0.9',
      },
      signal: AbortSignal.timeout(30000),
    });
    if (response.status === 404) return { status: 404, html: '' };
    if (response.status === 429 || response.status >= 500) throw new Error(`HTTP ${response.status}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return { status: response.status, html: await response.text() };
  } catch (error) {
    if (attempt >= 4) throw new Error(`Could not fetch ${url} after 4 tries: ${error.message}`);
    const wait = 1500 * 2 ** (attempt - 1);
    console.warn(`  ! ${error.message} — retrying in ${wait / 1000}s (try ${attempt + 1} of 4)`);
    await sleep(wait);
    return fetchPage(url, attempt + 1);
  }
}

// ---------------------------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------------------------
const formatNaira = (value) => '₦' + value.toLocaleString('en-NG');

function loadExistingIds() {
  const idBySource = new Map();
  let maxId = 0;
  try {
    const existing = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8'));
    for (const item of existing) {
      if (item.sourceUrl) {
        idBySource.set(item.sourceUrl, String(item.id));
        maxId = Math.max(maxId, Number(item.id) || 0);
      }
    }
  } catch {
    /* first run */
  }
  return { idBySource, maxId };
}

async function main() {
  if (typeof fetch !== 'function') {
    throw new Error('This script needs Node 18 or newer (run `node --version` to check).');
  }
  console.log(`▶ Importing the Technocrat catalog from ${BASE_URL}${LIST_PATH}`);

  const seen = new Map(); // slug -> card
  const problems = [];
  let expectedTotal = null;
  let pagesFetched = 0;

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const url = `${BASE_URL}${LIST_PATH}?page=${page}`;
    const { status, html } = await fetchPage(url);
    pagesFetched = page;

    if (status === 404) {
      console.log(`  Page ${page}: not found — end of catalog.`);
      break;
    }

    const parsed = parseListingPage(html);
    if (parsed.expectedTotal && !expectedTotal) expectedTotal = parsed.expectedTotal;

    if (parsed.cards.length === 0) {
      if (page === 1) {
        const debugFile = path.join(DEBUG_DIR, '.debug-page-1.html');
        fs.writeFileSync(debugFile, html);
        throw new Error(
          `Page 1 contained no product links (${html.length} bytes of HTML). The site may load products with JavaScript or be blocking this request.\n` +
            `  The page was saved to ${debugFile} so you can open it and look. Nothing was changed.`,
        );
      }
      console.log(`  Page ${page}: no products — end of catalog.`);
      break;
    }

    let added = 0;
    for (const card of parsed.cards) {
      if (!seen.has(card.slug)) {
        seen.set(card.slug, card);
        added += 1;
      }
    }
    console.log(`  Page ${page}: ${parsed.cards.length} products, ${added} new (running total ${seen.size}${expectedTotal ? ` of ${expectedTotal}` : ''})`);

    if (added === 0) {
      console.log('  No new products on this page — end of catalog.');
      break;
    }
    if (expectedTotal && seen.size >= expectedTotal) {
      console.log('  Reached the total the site reports — done.');
      break;
    }
    await sleep(DELAY);
  }

  // Build the output records
  const { idBySource, maxId } = loadExistingIds();
  let nextId = maxId + 1;
  const items = [];
  for (const card of seen.values()) {
    if (!card.title) {
      problems.push(`${card.sourceUrl}: no title found`);
      continue;
    }
    if (card.cost === null) {
      problems.push(`${card.sourceUrl}: no ₦ price found (${card.title})`);
      continue;
    }
    const sellingPrice = Math.round(card.cost * MARKUP);
    const id = idBySource.get(card.sourceUrl) || String(nextId++);
    items.push({
      id,
      title: card.title,
      category: categoryFor(card.title),
      costPriceNGN: card.cost,
      sellingPriceNGN: sellingPrice,
      formattedPrice: formatNaira(sellingPrice),
      imageUrl: card.imageUrl,
      inStock: card.inStock,
      sourceUrl: card.sourceUrl,
    });
  }

  if (items.length === 0) {
    throw new Error('No usable products were found, so src/data/products.json was left unchanged.');
  }

  // Report
  const withoutImage = items.filter((item) => !item.imageUrl).length;
  const byCategory = {};
  for (const item of items) byCategory[item.category] = (byCategory[item.category] || 0) + 1;
  console.log('\n  Categories:', Object.entries(byCategory).sort((a, b) => b[1] - a[1]).map(([name, n]) => `${name} ${n}`).join(' · '));
  console.log(`  In stock: ${items.filter((item) => item.inStock).length} · Out of stock: ${items.filter((item) => !item.inStock).length}`);
  if (withoutImage > 0) console.warn(`  ! ${withoutImage} product(s) had no image on the listing page (the store will show a name tile for them).`);
  if (problems.length > 0) {
    console.warn(`  ! ${problems.length} product(s) skipped:`);
    for (const line of problems.slice(0, 20)) console.warn(`      - ${line}`);
    if (problems.length > 20) console.warn(`      … and ${problems.length - 20} more`);
  }
  if (expectedTotal && items.length < expectedTotal) {
    console.warn(`  ! The site says it has ${expectedTotal} products but ${items.length} were saved. Check the skipped list above, or run again.`);
  }

  if (DRY_RUN) {
    console.log(`\n✔ Dry run: ${items.length} products found across ${pagesFetched} page(s). Nothing was written.`);
    return;
  }

  if (fs.existsSync(OUTPUT_FILE)) fs.copyFileSync(OUTPUT_FILE, BACKUP_FILE);
  const temp = OUTPUT_FILE + '.tmp';
  fs.writeFileSync(temp, JSON.stringify(items, null, 2) + '\n', 'utf8');
  fs.renameSync(temp, OUTPUT_FILE);

  const saved = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8')).length;
  console.log(`\n✔ Saved ${saved} products to src/data/products.json (${pagesFetched} page(s) read).`);
  console.log('  Next: run  npm run catalog:technocrat  to load them into the store.');
}

if (require.main === module) {
  main().catch((error) => {
    console.error('\n✖ Import failed:', error.message);
    process.exitCode = 1;
  });
}

module.exports = { parseHtml, parseListingPage, parsePriceNaira, categoryFor, unwrapOptimizer };
