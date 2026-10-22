/**
 * Generates the demo product images in public/products/*.svg from the mock catalog.
 * Each product gets 3 gallery views (-1 studio, -2 dark, -3 close-up) plus one
 * image per colour variant. Real suppliers provide their own image URLs instead.
 *
 * Run with:  npm run art:generate
 */
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { MOCK_PRODUCTS, type ArtKind } from '../src/lib/suppliers/mock-catalog';

const OUT_DIR = join(process.cwd(), 'public', 'products');
const BLUE = '#0d7a72'; // brand teal
const CYAN = '#f5b942'; // accent amber

function clamp(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

/** Lighten (amount > 0) or darken (amount < 0) a hex colour. */
function shade(hex: string, amount: number): string {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  const mix = (c: number) => (amount >= 0 ? c + (255 - c) * amount : c * (1 + amount));
  return `#${[mix(r), mix(g), mix(b)].map((c) => clamp(c).toString(16).padStart(2, '0')).join('')}`;
}

function isLight(hex: string): boolean {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 160;
}

/** A dark screen with a soft UI suggestion. */
function screen(x: number, y: number, w: number, h: number, r: number): string {
  const rows = Array.from({ length: 4 }, (_, i) => {
    const ry = y + h * 0.3 + i * h * 0.13;
    const rw = w * (i % 2 === 0 ? 0.55 : 0.38);
    return `<rect x="${x + w * 0.1}" y="${ry}" width="${rw}" height="${Math.max(4, h * 0.045)}" rx="3" fill="#ffffff" opacity="${0.18 - i * 0.03}"/>`;
  }).join('');
  return `
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="url(#screen)"/>
    <rect x="${x + w * 0.1}" y="${y + h * 0.12}" width="${w * 0.28}" height="${Math.max(6, h * 0.08)}" rx="4" fill="${CYAN}" opacity="0.85"/>
    ${rows}
    <circle cx="${x + w * 0.78}" cy="${y + h * 0.58}" r="${Math.min(w, h) * 0.16}" fill="none" stroke="${BLUE}" stroke-width="${Math.max(3, w * 0.02)}" opacity="0.9"/>
    <path d="M${x + w * 0.78} ${y + h * 0.58 - Math.min(w, h) * 0.16} A ${Math.min(w, h) * 0.16} ${Math.min(w, h) * 0.16} 0 0 1 ${x + w * 0.78 + Math.min(w, h) * 0.16} ${y + h * 0.58}" fill="none" stroke="${CYAN}" stroke-width="${Math.max(3, w * 0.02)}"/>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="url(#glare)"/>`;
}

function device(kind: ArtKind, color: string): string {
  const light = shade(color, 0.25);
  const dark = shade(color, -0.35);
  const edge = isLight(color) ? shade(color, -0.2) : shade(color, 0.15);

  switch (kind) {
    case 'laptop':
      return `
        <rect x="190" y="190" width="420" height="285" rx="16" fill="${color}" stroke="${edge}" stroke-width="3"/>
        ${screen(207, 207, 386, 250, 6)}
        <path d="M140 482 H660 L700 524 Q702 534 690 534 H110 Q98 534 100 524 Z" fill="${light}" stroke="${edge}" stroke-width="3"/>
        <rect x="355" y="482" width="90" height="10" rx="5" fill="${dark}"/>`;
    case 'phone':
      return `
        <rect x="292" y="165" width="216" height="440" rx="36" fill="${color}" stroke="${edge}" stroke-width="3"/>
        ${screen(306, 180, 188, 410, 26)}
        <rect x="370" y="192" width="60" height="12" rx="6" fill="#020617"/>
        <rect x="508" y="270" width="5" height="60" rx="2" fill="${dark}"/>`;
    case 'tablet':
      return `
        <rect x="185" y="215" width="430" height="300" rx="28" fill="${color}" stroke="${edge}" stroke-width="3"/>
        ${screen(203, 233, 394, 264, 14)}
        <rect x="400" y="530" width="14" height="70" rx="7" transform="rotate(35 407 565)" fill="${BLUE}"/>`;
    case 'monitor':
      return `
        <rect x="160" y="175" width="480" height="300" rx="14" fill="${color}" stroke="${edge}" stroke-width="3"/>
        ${screen(174, 189, 452, 272, 6)}
        <path d="M375 475 H425 L440 560 H360 Z" fill="${light}"/>
        <rect x="290" y="556" width="220" height="20" rx="10" fill="${light}" stroke="${edge}" stroke-width="2"/>`;
    case 'tower':
      return `
        <rect x="285" y="165" width="230" height="440" rx="16" fill="${color}" stroke="${edge}" stroke-width="3"/>
        <rect x="300" y="182" width="120" height="406" rx="8" fill="#0b1220" opacity="0.85"/>
        <circle cx="360" cy="265" r="38" fill="none" stroke="${BLUE}" stroke-width="5"/>
        <circle cx="360" cy="375" r="38" fill="none" stroke="${CYAN}" stroke-width="5"/>
        <circle cx="360" cy="485" r="38" fill="none" stroke="${BLUE}" stroke-width="5"/>
        ${Array.from({ length: 12 }, (_, i) => `<rect x="440" y="${200 + i * 30}" width="58" height="8" rx="4" fill="${light}"/>`).join('')}
        <circle cx="469" cy="572" r="9" fill="${CYAN}"/>`;
    case 'headphones':
      return `
        <path d="M245 430 C245 230 555 230 555 430" fill="none" stroke="${color}" stroke-width="34" stroke-linecap="round"/>
        <path d="M245 430 C245 250 555 250 555 430" fill="none" stroke="${light}" stroke-width="8" stroke-linecap="round" opacity="0.6"/>
        <rect x="190" y="390" width="110" height="170" rx="50" fill="${color}" stroke="${edge}" stroke-width="3"/>
        <rect x="500" y="390" width="110" height="170" rx="50" fill="${color}" stroke="${edge}" stroke-width="3"/>
        <rect x="212" y="415" width="66" height="120" rx="33" fill="${dark}"/>
        <rect x="522" y="415" width="66" height="120" rx="33" fill="${dark}"/>
        <circle cx="245" cy="475" r="8" fill="${CYAN}"/>`;
    case 'earbuds':
      return `
        <rect x="270" y="380" width="260" height="190" rx="80" fill="${color}" stroke="${edge}" stroke-width="3"/>
        <line x1="285" y1="440" x2="515" y2="440" stroke="${edge}" stroke-width="3"/>
        <circle cx="400" cy="505" r="7" fill="${BLUE}"/>
        <g transform="translate(300 230) rotate(-12)">
          <circle cx="0" cy="0" r="45" fill="${color}" stroke="${edge}" stroke-width="3"/>
          <rect x="-16" y="20" width="32" height="105" rx="16" fill="${color}" stroke="${edge}" stroke-width="3"/>
          <circle cx="0" cy="0" r="18" fill="${dark}"/>
        </g>
        <g transform="translate(500 230) rotate(12)">
          <circle cx="0" cy="0" r="45" fill="${color}" stroke="${edge}" stroke-width="3"/>
          <rect x="-16" y="20" width="32" height="105" rx="16" fill="${color}" stroke="${edge}" stroke-width="3"/>
          <circle cx="0" cy="0" r="18" fill="${dark}"/>
        </g>`;
    case 'watch':
      return `
        <rect x="340" y="130" width="120" height="170" rx="24" fill="${dark}"/>
        <rect x="340" y="500" width="120" height="170" rx="24" fill="${dark}"/>
        <rect x="290" y="270" width="220" height="260" rx="60" fill="${color}" stroke="${edge}" stroke-width="4"/>
        ${screen(312, 292, 176, 216, 44)}
        <rect x="508" y="350" width="14" height="50" rx="6" fill="${light}"/>`;
    case 'keyboard':
      return `
        <rect x="120" y="300" width="560" height="210" rx="20" fill="${color}" stroke="${edge}" stroke-width="3"/>
        ${Array.from({ length: 4 }, (_, row) =>
          Array.from({ length: 13 }, (_, col) =>
            `<rect x="${140 + col * 40}" y="${320 + row * 42}" width="32" height="32" rx="6" fill="${row === 0 && col < 2 ? BLUE : light}"/>`,
          ).join(''),
        ).join('')}
        <rect x="260" y="470" width="280" height="26" rx="6" fill="${light}"/>`;
    case 'mouse':
      return `
        <path d="M400 190 C500 190 525 290 525 420 C525 545 470 610 400 610 C330 610 275 545 275 420 C275 290 300 190 400 190 Z" fill="${color}" stroke="${edge}" stroke-width="3"/>
        <line x1="400" y1="192" x2="400" y2="350" stroke="${edge}" stroke-width="3"/>
        <rect x="388" y="250" width="24" height="56" rx="12" fill="${dark}"/>
        <rect x="392" y="262" width="16" height="12" rx="4" fill="${CYAN}"/>`;
    case 'router':
      return `
        <rect x="260" y="200" width="16" height="200" rx="8" fill="${dark}"/>
        <rect x="524" y="200" width="16" height="200" rx="8" fill="${dark}"/>
        <rect x="200" y="390" width="400" height="140" rx="30" fill="${color}" stroke="${edge}" stroke-width="3"/>
        ${[0, 1, 2, 3, 4].map((i) => `<circle cx="${290 + i * 55}" cy="460" r="9" fill="${i < 4 ? CYAN : BLUE}"/>`).join('')}
        <path d="M360 300 Q400 270 440 300" fill="none" stroke="${BLUE}" stroke-width="8" stroke-linecap="round"/>
        <path d="M335 270 Q400 225 465 270" fill="none" stroke="${BLUE}" stroke-width="8" stroke-linecap="round" opacity="0.6"/>
        <circle cx="400" cy="325" r="10" fill="${BLUE}"/>`;
    case 'ssd':
      return `
        <rect x="160" y="335" width="480" height="130" rx="10" fill="${color}" stroke="${edge}" stroke-width="3"/>
        ${Array.from({ length: 14 }, (_, i) => `<rect x="${136 + 0}" y="${345 + i * 8}" width="26" height="5" fill="#d4a017"/>`).join('')}
        <rect x="230" y="355" width="330" height="90" rx="8" fill="${BLUE}"/>
        <rect x="250" y="375" width="160" height="14" rx="4" fill="#ffffff" opacity="0.9"/>
        <rect x="250" y="400" width="100" height="10" rx="4" fill="#ffffff" opacity="0.5"/>
        <circle cx="610" cy="400" r="14" fill="none" stroke="${light}" stroke-width="4"/>`;
    case 'ram':
      return [0, 1].map((i) => `
        <g transform="translate(0 ${i * 120})">
          <rect x="130" y="280" width="540" height="100" rx="8" fill="${color}" stroke="${edge}" stroke-width="3"/>
          <path d="M130 300 L250 300 L280 285 L520 285 L550 300 L670 300" fill="none" stroke="${CYAN}" stroke-width="4"/>
          ${Array.from({ length: 30 }, (_, k) => `<rect x="${145 + k * 17.5}" y="380" width="10" height="16" fill="#d4a017"/>`).join('')}
          <rect x="300" y="320" width="200" height="16" rx="4" fill="#ffffff" opacity="0.8"/>
        </g>`).join('');
    case 'gpu':
      return `
        <rect x="120" y="290" width="560" height="220" rx="22" fill="${color}" stroke="${edge}" stroke-width="3"/>
        ${[230, 400, 570].map((cx) => `
          <circle cx="${cx}" cy="400" r="74" fill="${dark}" stroke="${light}" stroke-width="3"/>
          ${Array.from({ length: 7 }, (_, k) => `<path d="M${cx} 400 L${cx + 62 * Math.cos((k * 2 * Math.PI) / 7)} ${400 + 62 * Math.sin((k * 2 * Math.PI) / 7)}" stroke="${light}" stroke-width="12" stroke-linecap="round" opacity="0.7"/>`).join('')}
          <circle cx="${cx}" cy="400" r="18" fill="${BLUE}"/>`).join('')}
        <rect x="200" y="510" width="260" height="22" fill="#d4a017"/>
        <rect x="120" y="296" width="560" height="10" rx="5" fill="${CYAN}" opacity="0.8"/>`;
    case 'powerbank':
      return `
        <rect x="280" y="200" width="240" height="400" rx="36" fill="${color}" stroke="${edge}" stroke-width="3"/>
        <rect x="320" y="250" width="160" height="80" rx="14" fill="#020617"/>
        <text x="400" y="304" text-anchor="middle" font-family="monospace" font-size="44" font-weight="700" fill="${CYAN}">87%</text>
        ${[0, 1, 2, 3].map((i) => `<circle cx="${352 + i * 32}" cy="372" r="7" fill="${i < 3 ? CYAN : light}"/>`).join('')}
        <rect x="350" y="580" width="100" height="10" rx="5" fill="${dark}"/>`;
    case 'inverter':
      return `
        <rect x="255" y="150" width="290" height="480" rx="20" fill="${color}" stroke="${edge}" stroke-width="3"/>
        <rect x="295" y="200" width="210" height="110" rx="10" fill="#0b1220"/>
        <text x="400" y="268" text-anchor="middle" font-family="monospace" font-size="40" font-weight="700" fill="${CYAN}">3.5kW</text>
        ${[0, 1, 2].map((i) => `<circle cx="${335 + i * 65}" cy="350" r="12" fill="${i === 0 ? '#22c55e' : i === 1 ? BLUE : '#f59e0b'}"/>`).join('')}
        ${Array.from({ length: 8 }, (_, i) => `<rect x="295" y="${400 + i * 22}" width="210" height="9" rx="4" fill="${shade(color, -0.12)}"/>`).join('')}
        <path d="M400 585 l-14 22 h12 l-8 20 l24-28 h-12 l8-14 z" fill="${BLUE}"/>`;
    case 'ups':
      return `
        <rect x="265" y="230" width="270" height="360" rx="18" fill="${color}" stroke="${edge}" stroke-width="3"/>
        <rect x="300" y="265" width="200" height="70" rx="8" fill="#020617"/>
        <rect x="318" y="285" width="120" height="12" rx="4" fill="${CYAN}"/>
        <rect x="318" y="306" width="80" height="10" rx="4" fill="${BLUE}"/>
        <circle cx="400" cy="400" r="30" fill="none" stroke="${CYAN}" stroke-width="6"/>
        <line x1="400" y1="380" x2="400" y2="400" stroke="${CYAN}" stroke-width="6" stroke-linecap="round"/>
        ${Array.from({ length: 6 }, (_, i) => `<rect x="${305 + (i % 3) * 66}" y="${470 + Math.floor(i / 3) * 52}" width="50" height="36" rx="6" fill="${light}"/>`).join('')}`;
    case 'solar':
      return `
        <path d="M200 240 L600 240 L660 560 L140 560 Z" fill="${color}" stroke="#cbd5e1" stroke-width="8"/>
        ${Array.from({ length: 5 }, (_, i) => {
          const t = (i + 1) / 6;
          return `<line x1="${200 + 400 * t}" y1="240" x2="${140 + 520 * t}" y2="560" stroke="#93c5fd" stroke-width="2" opacity="0.6"/>`;
        }).join('')}
        ${Array.from({ length: 5 }, (_, i) => {
          const t = (i + 1) / 6;
          const y = 240 + 320 * t;
          return `<line x1="${200 - 60 * t}" y1="${y}" x2="${600 + 60 * t}" y2="${y}" stroke="#93c5fd" stroke-width="2" opacity="0.6"/>`;
        }).join('')}
        <path d="M200 240 L600 240 L420 400 Z" fill="#ffffff" opacity="0.08"/>
        <rect x="380" y="560" width="40" height="70" fill="#94a3b8"/>`;
    case 'hub':
      return `
        <path d="M250 330 C180 330 160 250 220 210" fill="none" stroke="${dark}" stroke-width="16" stroke-linecap="round"/>
        <rect x="190" y="190" width="50" height="34" rx="8" fill="${light}"/>
        <rect x="240" y="320" width="380" height="140" rx="30" fill="${color}" stroke="${edge}" stroke-width="3"/>
        ${[0, 1, 2].map((i) => `<rect x="${300 + i * 70}" y="370" width="44" height="18" rx="3" fill="#0b1220"/>`).join('')}
        <rect x="520" y="366" width="56" height="26" rx="4" fill="#0b1220"/>
        <rect x="300" y="410" width="34" height="10" rx="3" fill="#0b1220"/>
        <circle cx="580" cy="425" r="6" fill="${CYAN}"/>`;
    case 'printer':
      return `
        <rect x="270" y="190" width="260" height="120" fill="#ffffff" stroke="#cbd5e1" stroke-width="3"/>
        <rect x="200" y="290" width="400" height="200" rx="22" fill="${color}" stroke="${edge}" stroke-width="3"/>
        <rect x="230" y="320" width="120" height="40" rx="8" fill="#0b1220"/>
        <rect x="244" y="334" width="70" height="10" rx="4" fill="${CYAN}"/>
        <circle cx="545" cy="340" r="12" fill="${BLUE}"/>
        <rect x="250" y="470" width="300" height="80" rx="6" fill="${shade(color, -0.1)}"/>
        <rect x="280" y="500" width="240" height="90" fill="#ffffff" stroke="#cbd5e1" stroke-width="3"/>
        <rect x="300" y="520" width="150" height="8" fill="#94a3b8"/>
        <rect x="300" y="540" width="190" height="8" fill="#cbd5e1"/>`;
    case 'speaker':
      return `
        <rect x="285" y="160" width="230" height="460" rx="40" fill="${color}" stroke="${edge}" stroke-width="3"/>
        <circle cx="400" cy="290" r="62" fill="${dark}" stroke="${light}" stroke-width="4"/>
        <circle cx="400" cy="290" r="22" fill="${light}"/>
        <circle cx="400" cy="470" r="86" fill="${dark}" stroke="${BLUE}" stroke-width="8"/>
        <circle cx="400" cy="470" r="32" fill="${light}"/>
        <circle cx="400" cy="470" r="100" fill="none" stroke="${CYAN}" stroke-width="4" opacity="0.6"/>`;
    case 'software':
      return `
        <path d="M300 180 L520 180 L560 210 L560 610 L340 610 L300 580 Z" fill="${shade(color, -0.3)}"/>
        <rect x="300" y="180" width="220" height="400" rx="6" fill="${color}"/>
        <path d="M410 250 L470 275 V340 C470 385 440 412 410 425 C380 412 350 385 350 340 V275 Z" fill="#ffffff" opacity="0.95"/>
        <path d="M385 335 L404 354 L438 318" fill="none" stroke="${color}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
        <rect x="330" y="470" width="160" height="16" rx="6" fill="#ffffff" opacity="0.85"/>
        <rect x="330" y="500" width="110" height="12" rx="6" fill="#ffffff" opacity="0.5"/>`;
    case 'app':
      return `
        <rect x="292" y="165" width="216" height="440" rx="36" fill="#0f172a" stroke="#334155" stroke-width="3"/>
        <rect x="306" y="180" width="188" height="410" rx="26" fill="${shade(color, 0.85)}"/>
        <rect x="324" y="210" width="152" height="70" rx="14" fill="${color}"/>
        ${Array.from({ length: 6 }, (_, i) => `<rect x="${324 + (i % 3) * 54}" y="${300 + Math.floor(i / 3) * 62}" width="44" height="44" rx="12" fill="${i % 2 === 0 ? color : CYAN}" opacity="${0.55 + (i % 3) * 0.15}"/>`).join('')}
        <rect x="324" y="440" width="152" height="12" rx="6" fill="#94a3b8"/>
        <rect x="324" y="462" width="110" height="12" rx="6" fill="#cbd5e1"/>
        <text x="530" y="250" font-family="monospace" font-size="56" font-weight="700" fill="${color}">&lt;/&gt;</text>`;
    case 'service':
      return `
        <g transform="translate(400 400)">
          <circle r="150" fill="none" stroke="${color}" stroke-width="40" stroke-dasharray="52 26"/>
          <circle r="95" fill="${shade(color, 0.85)}" stroke="${color}" stroke-width="10"/>
          <g transform="rotate(-45)">
            <rect x="-22" y="-150" width="44" height="230" rx="18" fill="#334155"/>
            <path d="M-60 -170 a60 60 0 1 0 120 0 l-30 0 l0 36 l-60 0 l0 -36 z" fill="#334155"/>
          </g>
          <circle r="20" fill="${CYAN}"/>
        </g>`;
    default:
      return `<rect x="250" y="250" width="300" height="300" rx="40" fill="${color}"/>`;
  }
}

const DEFS = `
  <defs>
    <linearGradient id="screen" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0b1a44"/>
      <stop offset="0.55" stop-color="#0f172a"/>
      <stop offset="1" stop-color="#132b7a"/>
    </linearGradient>
    <linearGradient id="glare" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.18"/>
      <stop offset="0.4" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="bgLight" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f8fafc"/>
      <stop offset="1" stop-color="#e2e8f0"/>
    </linearGradient>
    <radialGradient id="bgDark" cx="0.5" cy="0.45" r="0.7">
      <stop offset="0" stop-color="#1e3a8a"/>
      <stop offset="0.6" stop-color="#0f172a"/>
      <stop offset="1" stop-color="#020617"/>
    </radialGradient>
    <linearGradient id="bgBlue" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#eef5ff"/>
      <stop offset="1" stop-color="#bcd6ff"/>
    </linearGradient>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M40 0 H0 V40" fill="none" stroke="#94a3b8" stroke-width="1" opacity="0.18"/>
    </pattern>
  </defs>`;

type View = 'studio' | 'dark' | 'detail';

function render(kind: ArtKind, color: string, view: View): string {
  const art = device(kind, color);
  let background: string;
  let body: string;
  if (view === 'studio') {
    background = `<rect width="800" height="800" fill="url(#bgLight)"/><rect width="800" height="800" fill="url(#grid)"/>`;
    body = `<ellipse cx="400" cy="660" rx="260" ry="26" fill="#0f172a" opacity="0.10"/>${art}`;
  } else if (view === 'dark') {
    background = `<rect width="800" height="800" fill="url(#bgDark)"/><rect width="800" height="800" fill="url(#grid)" opacity="0.6"/>`;
    body = `<ellipse cx="400" cy="660" rx="240" ry="22" fill="#000000" opacity="0.35"/><g transform="rotate(-8 400 400) translate(20 0)">${art}</g>`;
  } else {
    background = `<rect width="800" height="800" fill="url(#bgBlue)"/>`;
    body = `<g transform="translate(400 400) scale(1.55) translate(-400 -400) translate(40 30)">${art}</g>
      <rect x="40" y="704" width="250" height="52" rx="26" fill="#ffffff" opacity="0.92"/>
      <circle cx="72" cy="730" r="10" fill="${BLUE}"/>
      <text x="92" y="737" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="700" fill="#0f172a">Quality inspected</text>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="800" height="800" role="img">${DEFS}${background}${body}</svg>\n`;
}

function placeholder(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="800" height="800" role="img">${DEFS}
  <rect width="800" height="800" fill="url(#bgLight)"/><rect width="800" height="800" fill="url(#grid)"/>
  <rect x="300" y="300" width="200" height="200" rx="32" fill="none" stroke="#94a3b8" stroke-width="10"/>
  <path d="M340 460 L390 400 L430 440 L455 415 L470 460 Z" fill="#94a3b8"/>
  <circle cx="440" cy="350" r="18" fill="#94a3b8"/>
</svg>\n`;
}

function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  let count = 0;
  for (const product of MOCK_PRODUCTS) {
    const colorAxis = product.axes.find((axis) => axis.values.some((value) => value.colorHex));
    const defaultColor = colorAxis?.values[0].colorHex ?? product.art.color;
    const views: View[] = ['studio', 'dark', 'detail'];
    views.forEach((view, index) => {
      writeFileSync(join(OUT_DIR, `${product.slug}-${index + 1}.svg`), render(product.art.kind, defaultColor, view));
      count += 1;
    });
    for (const value of colorAxis?.values ?? []) {
      if (value.colorHex) {
        writeFileSync(join(OUT_DIR, `${product.slug}-${value.code}.svg`), render(product.art.kind, value.colorHex, 'studio'));
        count += 1;
      }
    }
  }
  writeFileSync(join(OUT_DIR, 'placeholder.svg'), placeholder());
  count += 1;
  console.log(`✔ Generated ${count} product images in public/products`);
}

main();
