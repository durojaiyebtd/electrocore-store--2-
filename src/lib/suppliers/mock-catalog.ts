/**
 * Built-in demo catalog used by the "mock" supplier adapter.
 * Brands here (ElectroCore, NexaByte, Lumio, Voltara, Kestrel) are demo house
 * brands. Replace this whole catalog by switching SUPPLIER_PROVIDER to "http".
 *
 * Prices are written in whole Naira for readability and converted to kobo by
 * the mock adapter.
 */
import type { SupplierCategory, SupplierFulfillment } from './types';

export type ArtKind =
  | 'laptop' | 'phone' | 'tablet' | 'monitor' | 'tower' | 'headphones' | 'earbuds' | 'watch'
  | 'keyboard' | 'mouse' | 'router' | 'ssd' | 'ram' | 'gpu' | 'powerbank' | 'inverter' | 'ups'
  | 'solar' | 'hub' | 'printer' | 'speaker' | 'software' | 'service' | 'app';

export interface MockAxisValue {
  value: string;
  /** short code used in SKUs and image filenames */
  code: string;
  /** Naira added to the base price */
  priceDelta?: number;
  /** colour swatch for colour axes (also used to tint product art) */
  colorHex?: string;
}

export interface MockAxis {
  name: string;
  values: MockAxisValue[];
}

export interface MockProductDef {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: string;
  short: string;
  description: string;
  specs: Array<[string, string]>;
  tags: string[];
  fulfillment: SupplierFulfillment;
  warrantyMonths: number;
  rating: number;
  reviewCount: number;
  featured: boolean;
  /** Naira */
  basePrice: number;
  /** Naira "was" price for the base configuration */
  compareAtPrice?: number;
  skuPrefix: string;
  axes: MockAxis[];
  /** default stock for every variant */
  stock: number;
  /** stock per variant, keyed by the variant's codes joined with "-" */
  stockOverrides?: Record<string, number>;
  art: { kind: ArtKind; color: string };
}

export const MOCK_CATEGORIES: SupplierCategory[] = [
  { slug: 'laptops-computers', name: 'Laptops & Computers', description: 'Business laptops, creator workstations, desktops and monitors.', icon: 'laptop', sortOrder: 1 },
  { slug: 'smartphones-tablets', name: 'Smartphones & Tablets', description: 'Flagship and rugged smartphones, tablets for work and study.', icon: 'phone', sortOrder: 2 },
  { slug: 'computer-parts', name: 'Computer Parts', description: 'SSDs, memory, graphics cards and upgrade components.', icon: 'chip', sortOrder: 3 },
  { slug: 'accessories-peripherals', name: 'Accessories & Peripherals', description: 'Keyboards, mice, hubs, printers and workspace essentials.', icon: 'keyboard', sortOrder: 4 },
  { slug: 'audio-wearables', name: 'Audio & Wearables', description: 'Headphones, earbuds, smartwatches and speakers.', icon: 'headphones', sortOrder: 5 },
  { slug: 'power-energy', name: 'Power & Energy', description: 'Inverters, UPS units, solar panels and power banks for reliable uptime.', icon: 'bolt', sortOrder: 6 },
  { slug: 'networking', name: 'Networking', description: 'Wi-Fi 6 mesh systems and mobile internet devices.', icon: 'wifi', sortOrder: 7 },
  { slug: 'software-apps', name: 'Software & Apps', description: 'Security suites, business software licences and custom mobile apps.', icon: 'code', sortOrder: 8 },
  { slug: 'repair-services', name: 'Repair & Engineering Services', description: 'Diagnostics, repairs, custom PC assembly and device servicing.', icon: 'wrench', sortOrder: 9 },
];

const SPACE_GRAY = '#3f4654';
const SILVER = '#c3c9d3';

export const MOCK_PRODUCTS: MockProductDef[] = [
  // ---------------------------------------------------------------- Laptops & Computers
  {
    id: 'MOCK-0001',
    slug: 'electrocore-probook-14',
    name: 'ElectroCore ProBook 14 Business Laptop',
    brand: 'ElectroCore',
    category: 'laptops-computers',
    short: '14" 2.2K IPS business laptop with Core Ultra 7, fingerprint login and all-day battery.',
    description:
      'Built for professionals who move between client sites and the office, the ProBook 14 pairs an Intel Core Ultra 7 processor with a bright anti-glare 2.2K display and a spill-resistant backlit keyboard. A precision-machined aluminium chassis keeps it under 1.4kg, while rapid charge delivers 50% battery in 30 minutes — ideal for unpredictable power days. Every unit is inspected, burn-in tested and imaged by our engineering team before dispatch.',
    specs: [
      ['Processor', 'Intel Core Ultra 7 155H (16 cores, up to 4.8GHz)'],
      ['Display', '14" 2240×1400 IPS, 400 nits, anti-glare'],
      ['Graphics', 'Intel Arc integrated'],
      ['Battery', '72Wh, up to 13 hours; 65W USB-C rapid charge'],
      ['Ports', '2× Thunderbolt 4, 2× USB-A, HDMI 2.1, microSD, 3.5mm'],
      ['Weight', '1.38kg'],
      ['OS', 'Windows 11 Pro (activated)'],
    ],
    tags: ['laptop', 'business', 'windows', 'ultrabook', 'core ultra'],
    fulfillment: 'PHYSICAL',
    warrantyMonths: 12,
    rating: 4.7,
    reviewCount: 128,
    featured: true,
    basePrice: 1150000,
    compareAtPrice: 1290000,
    skuPrefix: 'EC-PB14',
    axes: [
      { name: 'Color', values: [
        { value: 'Space Gray', code: 'gry', colorHex: SPACE_GRAY },
        { value: 'Silver', code: 'slv', colorHex: SILVER },
      ] },
      { name: 'Configuration', values: [
        { value: '16GB / 512GB', code: '16-512' },
        { value: '16GB / 1TB', code: '16-1t', priceDelta: 170000 },
        { value: '32GB / 1TB', code: '32-1t', priceDelta: 430000 },
      ] },
    ],
    stock: 14,
    stockOverrides: { 'slv-32-1t': 0 },
    art: { kind: 'laptop', color: SPACE_GRAY },
  },
  {
    id: 'MOCK-0002',
    slug: 'nexabyte-creator-16',
    name: 'NexaByte Creator 16 Workstation Laptop',
    brand: 'NexaByte',
    category: 'laptops-computers',
    short: '16" 165Hz QHD+ creator laptop with RTX-class graphics for video, 3D and engineering work.',
    description:
      'The Creator 16 is a portable workstation for editors, architects and engineers. A 165Hz colour-calibrated QHD+ panel covers 100% DCI-P3, while a 12GB discrete GPU accelerates rendering, CAD and AI workloads. Vapour-chamber cooling keeps performance steady through long exports. Ships with our free performance tuning and driver setup.',
    specs: [
      ['Processor', 'Intel Core i9-14900HX (24 cores)'],
      ['Graphics', '12GB GDDR6 discrete GPU'],
      ['Display', '16" 2560×1600, 165Hz, 100% DCI-P3, factory calibrated'],
      ['Memory', '32GB DDR5-5600 (upgradable to 64GB)'],
      ['Cooling', 'Vapour chamber, dual fans'],
      ['Weight', '2.3kg'],
    ],
    tags: ['laptop', 'creator', 'gpu', 'workstation', 'video editing', 'cad'],
    fulfillment: 'PHYSICAL',
    warrantyMonths: 24,
    rating: 4.8,
    reviewCount: 64,
    featured: true,
    basePrice: 2450000,
    compareAtPrice: 2690000,
    skuPrefix: 'NB-CR16',
    axes: [
      { name: 'Storage', values: [
        { value: '1TB SSD', code: '1t' },
        { value: '2TB SSD', code: '2t', priceDelta: 330000 },
      ] },
    ],
    stock: 6,
    art: { kind: 'laptop', color: '#1f2937' },
  },
  {
    id: 'MOCK-0003',
    slug: 'electrocore-office-tower-i5',
    name: 'ElectroCore Office Tower i5 Desktop',
    brand: 'ElectroCore',
    category: 'laptops-computers',
    short: 'Assembled in-house: Core i5, 16GB RAM, 512GB NVMe — the dependable office workhorse.',
    description:
      'Designed and assembled by our engineering team for offices, schools and cyber cafés. The Office Tower uses quality-certified components, a 80+ Bronze power supply that tolerates fluctuating grid power, and tool-free upgrade bays. Each build is stress-tested for 24 hours before it leaves our workshop.',
    specs: [
      ['Processor', 'Intel Core i5-14400 (10 cores)'],
      ['Memory', '16GB DDR4-3200'],
      ['Storage', '512GB NVMe SSD + spare 3.5" bay'],
      ['PSU', '550W 80+ Bronze, wide-range input'],
      ['Connectivity', 'Wi-Fi 6, Bluetooth 5.2, Gigabit Ethernet'],
      ['OS', 'Windows 11 Pro (activated)'],
    ],
    tags: ['desktop', 'tower', 'office', 'assembled', 'pc'],
    fulfillment: 'PHYSICAL',
    warrantyMonths: 12,
    rating: 4.6,
    reviewCount: 41,
    featured: false,
    basePrice: 685000,
    skuPrefix: 'EC-OT5',
    axes: [],
    stock: 22,
    art: { kind: 'tower', color: '#111827' },
  },
  {
    id: 'MOCK-0004',
    slug: 'voltara-qhd-monitor',
    name: 'Voltara UltraClear IPS Monitor',
    brand: 'Voltara',
    category: 'laptops-computers',
    short: 'Colour-accurate IPS monitor with USB-C 65W power delivery and height-adjustable stand.',
    description:
      'A single-cable desk upgrade: connect your laptop over USB-C to get picture, data and 65W charging at once. The UltraClear panel covers 99% sRGB with factory calibration, and the ergonomic stand tilts, swivels, pivots and adjusts in height.',
    specs: [
      ['Panel', 'IPS, 99% sRGB, ΔE < 2'],
      ['Refresh rate', '100Hz'],
      ['Inputs', 'USB-C (65W PD), HDMI 2.0, DisplayPort 1.4'],
      ['Stand', 'Height, tilt, swivel, pivot; VESA 100'],
    ],
    tags: ['monitor', 'display', 'usb-c', 'ips', '4k', 'qhd'],
    fulfillment: 'PHYSICAL',
    warrantyMonths: 24,
    rating: 4.5,
    reviewCount: 77,
    featured: false,
    basePrice: 395000,
    compareAtPrice: 440000,
    skuPrefix: 'VT-UCM',
    axes: [
      { name: 'Size', values: [
        { value: '27" QHD', code: '27q' },
        { value: '32" 4K UHD', code: '32k', priceDelta: 245000 },
      ] },
    ],
    stock: 10,
    art: { kind: 'monitor', color: '#1e293b' },
  },

  // ---------------------------------------------------------------- Smartphones & Tablets
  {
    id: 'MOCK-0005',
    slug: 'lumio-x12-smartphone',
    name: 'Lumio X12 5G Smartphone',
    brand: 'Lumio',
    category: 'smartphones-tablets',
    short: '6.7" AMOLED 120Hz, 50MP triple camera, 5,000mAh battery with 67W fast charging.',
    description:
      'The Lumio X12 brings flagship features at a sensible price: a 120Hz AMOLED display that stays readable in harsh sunlight, a 50MP main camera with optical stabilisation and a two-day battery that refills in under 45 minutes. Dual SIM with 5G support on all major Nigerian networks.',
    specs: [
      ['Display', '6.7" AMOLED, 120Hz, 1,800 nits peak'],
      ['Chipset', 'Octa-core 4nm, 5G'],
      ['RAM', '8GB'],
      ['Cameras', '50MP OIS main + 12MP ultra-wide + 10MP telephoto; 32MP selfie'],
      ['Battery', '5,000mAh, 67W wired charging'],
      ['SIM', 'Dual nano-SIM, 5G'],
    ],
    tags: ['phone', 'smartphone', '5g', 'android', 'amoled'],
    fulfillment: 'PHYSICAL',
    warrantyMonths: 12,
    rating: 4.6,
    reviewCount: 212,
    featured: true,
    basePrice: 489000,
    compareAtPrice: 535000,
    skuPrefix: 'LM-X12',
    axes: [
      { name: 'Color', values: [
        { value: 'Midnight', code: 'mid', colorHex: '#111827' },
        { value: 'Glacier Blue', code: 'gla', colorHex: '#7dd3fc' },
        { value: 'Ember', code: 'emb', colorHex: '#c2410c' },
      ] },
      { name: 'Storage', values: [
        { value: '128GB', code: '128' },
        { value: '256GB', code: '256', priceDelta: 60000 },
      ] },
    ],
    stock: 25,
    stockOverrides: { 'emb-256': 3 },
    art: { kind: 'phone', color: '#111827' },
  },
  {
    id: 'MOCK-0006',
    slug: 'lumio-tab-11',
    name: 'Lumio Tab 11 Tablet',
    brand: 'Lumio',
    category: 'smartphones-tablets',
    short: '11" 2K display tablet with stylus support — for study, sketching and field work.',
    description:
      'A versatile 11-inch tablet with a sharp 2K display, quad speakers and stylus support. The LTE model keeps field teams connected for order taking, inspections and point-of-sale apps — no Wi-Fi needed.',
    specs: [
      ['Display', '11" 2000×1200, 90Hz'],
      ['Memory', '6GB RAM / 128GB storage, microSD up to 1TB'],
      ['Battery', '8,000mAh, 33W'],
      ['Audio', 'Quad speakers'],
    ],
    tags: ['tablet', 'android', 'stylus', 'lte', 'study'],
    fulfillment: 'PHYSICAL',
    warrantyMonths: 12,
    rating: 4.4,
    reviewCount: 58,
    featured: false,
    basePrice: 355000,
    skuPrefix: 'LM-T11',
    axes: [
      { name: 'Connectivity', values: [
        { value: 'Wi-Fi', code: 'wifi' },
        { value: 'Wi-Fi + LTE', code: 'lte', priceDelta: 57000 },
      ] },
    ],
    stock: 15,
    art: { kind: 'tablet', color: '#334155' },
  },
  {
    id: 'MOCK-0007',
    slug: 'kestrel-a5-rugged-phone',
    name: 'Kestrel A5 Rugged Phone',
    brand: 'Kestrel',
    category: 'smartphones-tablets',
    short: 'IP68/IP69K rugged phone with 10,000mAh battery, built for sites, farms and logistics.',
    description:
      'Drop-tested to 1.5m and sealed against dust and water, the Kestrel A5 is made for construction sites, oil & gas fields and dispatch riders. Its 10,000mAh battery lasts up to three days, and it doubles as a power bank for other devices via reverse charging.',
    specs: [
      ['Protection', 'IP68 / IP69K, MIL-STD-810H'],
      ['Battery', '10,000mAh with reverse charging'],
      ['Display', '6.3" FHD+, Gorilla Glass 5'],
      ['Extras', 'Programmable key, NFC, 120dB loudspeaker'],
    ],
    tags: ['phone', 'rugged', 'waterproof', 'long battery'],
    fulfillment: 'PHYSICAL',
    warrantyMonths: 12,
    rating: 4.3,
    reviewCount: 36,
    featured: false,
    basePrice: 265000,
    skuPrefix: 'KS-A5',
    axes: [],
    stock: 18,
    art: { kind: 'phone', color: '#f59e0b' },
  },

  // ---------------------------------------------------------------- Computer Parts
  {
    id: 'MOCK-0008',
    slug: 'nexabyte-nvme-gen4-ssd',
    name: 'NexaByte Velocity NVMe Gen4 SSD',
    brand: 'NexaByte',
    category: 'computer-parts',
    short: 'Up to 7,000MB/s M.2 2280 SSD with heatsink-ready design and 5-year warranty.',
    description:
      'Give any laptop or desktop a new lease of life. The Velocity Gen4 delivers sequential reads up to 7,000MB/s, boots Windows in seconds and loads large projects instantly. Need help? Add our installation & data migration service at checkout.',
    specs: [
      ['Interface', 'PCIe 4.0 x4, NVMe 2.0'],
      ['Form factor', 'M.2 2280'],
      ['Read / write', 'Up to 7,000 / 6,500 MB/s'],
      ['Endurance', '600TBW (1TB) / 1,200TBW (2TB)'],
    ],
    tags: ['ssd', 'nvme', 'storage', 'upgrade', 'm.2'],
    fulfillment: 'PHYSICAL',
    warrantyMonths: 60,
    rating: 4.9,
    reviewCount: 143,
    featured: true,
    basePrice: 98000,
    compareAtPrice: 112000,
    skuPrefix: 'NB-VG4',
    axes: [
      { name: 'Capacity', values: [
        { value: '1TB', code: '1t' },
        { value: '2TB', code: '2t', priceDelta: 78000 },
      ] },
    ],
    stock: 40,
    art: { kind: 'ssd', color: '#0f172a' },
  },
  {
    id: 'MOCK-0009',
    slug: 'nexabyte-ddr5-memory-kit',
    name: 'NexaByte DDR5-5600 Desktop Memory Kit',
    brand: 'NexaByte',
    category: 'computer-parts',
    short: 'Dual-channel DDR5 kit with aluminium heat spreaders and XMP 3.0 profiles.',
    description:
      'Matched dual-channel DDR5 modules, tested together for stability at 5600MT/s. Low-profile aluminium heat spreaders fit under most CPU coolers.',
    specs: [
      ['Type', 'DDR5 UDIMM, 288-pin'],
      ['Speed', '5600MT/s, CL36'],
      ['Profile', 'Intel XMP 3.0 / AMD EXPO'],
      ['Voltage', '1.25V'],
    ],
    tags: ['ram', 'memory', 'ddr5', 'upgrade'],
    fulfillment: 'PHYSICAL',
    warrantyMonths: 36,
    rating: 4.7,
    reviewCount: 52,
    featured: false,
    basePrice: 72000,
    skuPrefix: 'NB-D5K',
    axes: [
      { name: 'Capacity', values: [
        { value: '16GB (2×8GB)', code: '16' },
        { value: '32GB (2×16GB)', code: '32', priceDelta: 66000 },
      ] },
    ],
    stock: 30,
    art: { kind: 'ram', color: '#1e3a8a' },
  },
  {
    id: 'MOCK-0010',
    slug: 'voltara-12gb-graphics-card',
    name: 'Voltara Forge 12GB Graphics Card',
    brand: 'Voltara',
    category: 'computer-parts',
    short: '12GB GDDR6 graphics card for 1440p gaming, rendering and AI acceleration.',
    description:
      'Triple-fan cooling, a reinforced backplate and 12GB of fast GDDR6 memory make the Forge a strong upgrade for creators and gamers. Our technicians can verify PSU compatibility and install it for you.',
    specs: [
      ['Memory', '12GB GDDR6, 192-bit'],
      ['Outputs', '3× DisplayPort 1.4a, 1× HDMI 2.1'],
      ['Power', '1× 8-pin, 650W PSU recommended'],
      ['Length', '285mm, 2.5 slots'],
    ],
    tags: ['gpu', 'graphics card', 'gaming', 'rendering', 'ai'],
    fulfillment: 'PHYSICAL',
    warrantyMonths: 36,
    rating: 4.6,
    reviewCount: 29,
    featured: false,
    basePrice: 720000,
    compareAtPrice: 789000,
    skuPrefix: 'VT-FG12',
    axes: [],
    stock: 5,
    art: { kind: 'gpu', color: '#111827' },
  },

  // ---------------------------------------------------------------- Accessories & Peripherals
  {
    id: 'MOCK-0011',
    slug: 'electrocore-mechanical-keyboard-tkl',
    name: 'ElectroCore TKL Mechanical Keyboard',
    brand: 'ElectroCore',
    category: 'accessories-peripherals',
    short: 'Hot-swappable tenkeyless keyboard, tri-mode wireless, PBT keycaps.',
    description:
      'A compact, typist-friendly mechanical keyboard with hot-swappable switches, tri-mode connectivity (USB-C, 2.4GHz, Bluetooth) and a 4,000mAh battery. Pre-lubed switches and foam dampening deliver a quiet, premium feel.',
    specs: [
      ['Layout', 'Tenkeyless (87 keys), UK/US'],
      ['Connectivity', 'USB-C, 2.4GHz dongle, Bluetooth 5.1 (3 devices)'],
      ['Battery', '4,000mAh'],
      ['Keycaps', 'Double-shot PBT'],
    ],
    tags: ['keyboard', 'mechanical', 'wireless', 'peripherals'],
    fulfillment: 'PHYSICAL',
    warrantyMonths: 12,
    rating: 4.8,
    reviewCount: 96,
    featured: false,
    basePrice: 58500,
    skuPrefix: 'EC-TKL',
    axes: [
      { name: 'Switch', values: [
        { value: 'Linear Red', code: 'red' },
        { value: 'Tactile Brown', code: 'brn' },
      ] },
    ],
    stock: 35,
    art: { kind: 'keyboard', color: '#1f2937' },
  },
  {
    id: 'MOCK-0012',
    slug: 'electrocore-ergo-wireless-mouse',
    name: 'ElectroCore Ergo Wireless Mouse',
    brand: 'ElectroCore',
    category: 'accessories-peripherals',
    short: 'Silent-click ergonomic mouse, 4,000 DPI, 70-day battery, multi-device.',
    description:
      'Sculpted to support your hand through long workdays, with silent clicks, a precision 4,000 DPI sensor and seamless switching between three devices.',
    specs: [
      ['Sensor', '4,000 DPI optical'],
      ['Connectivity', '2.4GHz + Bluetooth (3 devices)'],
      ['Battery', 'USB-C rechargeable, up to 70 days'],
    ],
    tags: ['mouse', 'wireless', 'ergonomic', 'peripherals'],
    fulfillment: 'PHYSICAL',
    warrantyMonths: 12,
    rating: 4.5,
    reviewCount: 119,
    featured: false,
    basePrice: 24900,
    skuPrefix: 'EC-ERGO',
    axes: [
      { name: 'Color', values: [
        { value: 'Graphite', code: 'gra', colorHex: '#374151' },
        { value: 'Arctic White', code: 'wht', colorHex: '#e5e7eb' },
      ] },
    ],
    stock: 60,
    art: { kind: 'mouse', color: '#374151' },
  },
  {
    id: 'MOCK-0013',
    slug: 'kestrel-8-in-1-usb-c-hub',
    name: 'Kestrel 8-in-1 USB-C Hub',
    brand: 'Kestrel',
    category: 'accessories-peripherals',
    short: '4K HDMI, Gigabit Ethernet, 100W pass-through, SD/microSD and 3× USB-A.',
    description:
      'Turn a single USB-C port into a full workstation. Aluminium housing dissipates heat, and a braided cable resists daily wear.',
    specs: [
      ['Video', 'HDMI 4K@60Hz'],
      ['Network', 'Gigabit Ethernet'],
      ['Power', '100W USB-C PD pass-through'],
      ['Ports', '3× USB-A 3.2, SD + microSD'],
    ],
    tags: ['hub', 'usb-c', 'dongle', 'adapter', 'accessories'],
    fulfillment: 'PHYSICAL',
    warrantyMonths: 12,
    rating: 4.4,
    reviewCount: 88,
    featured: false,
    basePrice: 38000,
    skuPrefix: 'KS-HUB8',
    axes: [],
    stock: 50,
    art: { kind: 'hub', color: '#475569' },
  },
  {
    id: 'MOCK-0014',
    slug: 'kestrel-mono-laser-printer',
    name: 'Kestrel LaserJet Mono Wireless Printer',
    brand: 'Kestrel',
    category: 'accessories-peripherals',
    short: 'Fast 30ppm mono laser with duplex, Wi-Fi and mobile printing.',
    description:
      'A compact, economical office laser printer with automatic two-sided printing and low cost per page. Print straight from phones and laptops over Wi-Fi.',
    specs: [
      ['Speed', 'Up to 30 pages per minute'],
      ['Duplex', 'Automatic'],
      ['Connectivity', 'Wi-Fi, USB, Ethernet'],
      ['Monthly duty', 'Up to 20,000 pages'],
    ],
    tags: ['printer', 'laser', 'office', 'wireless'],
    fulfillment: 'PHYSICAL',
    warrantyMonths: 12,
    rating: 4.3,
    reviewCount: 23,
    featured: false,
    basePrice: 215000,
    skuPrefix: 'KS-LJM',
    axes: [],
    stock: 9,
    art: { kind: 'printer', color: '#e2e8f0' },
  },

  // ---------------------------------------------------------------- Audio & Wearables
  {
    id: 'MOCK-0015',
    slug: 'lumio-anc-headphones',
    name: 'Lumio Studio ANC Headphones',
    brand: 'Lumio',
    category: 'audio-wearables',
    short: 'Adaptive noise cancelling, 60-hour battery, multipoint Bluetooth and clear-call mics.',
    description:
      'Shut out generator hum, traffic and open-office noise. Adaptive ANC tunes itself to your environment, while six beamforming microphones keep your voice crisp on calls.',
    specs: [
      ['Drivers', '40mm dynamic'],
      ['Battery', 'Up to 60 hours (ANC off) / 40 hours (ANC on)'],
      ['Codec', 'AAC, LDAC'],
      ['Connectivity', 'Bluetooth 5.3, multipoint'],
    ],
    tags: ['headphones', 'anc', 'noise cancelling', 'bluetooth', 'audio'],
    fulfillment: 'PHYSICAL',
    warrantyMonths: 12,
    rating: 4.7,
    reviewCount: 174,
    featured: true,
    basePrice: 145000,
    compareAtPrice: 165000,
    skuPrefix: 'LM-ANC',
    axes: [
      { name: 'Color', values: [
        { value: 'Carbon Black', code: 'blk', colorHex: '#18181b' },
        { value: 'Sand', code: 'snd', colorHex: '#d6c7a1' },
        { value: 'Navy', code: 'nav', colorHex: '#1e3a8a' },
      ] },
    ],
    stock: 28,
    art: { kind: 'headphones', color: '#18181b' },
  },
  {
    id: 'MOCK-0016',
    slug: 'lumio-buds-pro',
    name: 'Lumio Buds Pro True Wireless Earbuds',
    brand: 'Lumio',
    category: 'audio-wearables',
    short: 'ANC earbuds with spatial audio, IPX5 sweat resistance and wireless charging case.',
    description:
      'Pocket-size sound with active noise cancelling, a transparency mode for staying aware, and a wireless charging case that adds 24 hours of playback.',
    specs: [
      ['Battery', '8h buds + 24h case'],
      ['Water resistance', 'IPX5'],
      ['Charging', 'USB-C + Qi wireless'],
    ],
    tags: ['earbuds', 'tws', 'anc', 'bluetooth', 'audio'],
    fulfillment: 'PHYSICAL',
    warrantyMonths: 12,
    rating: 4.5,
    reviewCount: 203,
    featured: false,
    basePrice: 68000,
    skuPrefix: 'LM-BDP',
    axes: [
      { name: 'Color', values: [
        { value: 'Pearl White', code: 'wht', colorHex: '#f1f5f9' },
        { value: 'Onyx', code: 'onx', colorHex: '#1f2937' },
      ] },
    ],
    stock: 45,
    art: { kind: 'earbuds', color: '#f1f5f9' },
  },
  {
    id: 'MOCK-0017',
    slug: 'lumio-fit-watch-2',
    name: 'Lumio Fit Watch 2',
    brand: 'Lumio',
    category: 'audio-wearables',
    short: 'AMOLED smartwatch with GPS, SpO₂, heart-rate tracking and 12-day battery.',
    description:
      'Track workouts, sleep and heart health with built-in GPS and 120+ sport modes. Bluetooth calling and message replies keep you connected without reaching for your phone.',
    specs: [
      ['Display', '1.43" AMOLED, always-on'],
      ['Sensors', 'Heart rate, SpO₂, GPS, accelerometer'],
      ['Battery', 'Up to 12 days'],
      ['Water resistance', '5ATM'],
    ],
    tags: ['smartwatch', 'wearable', 'fitness', 'gps'],
    fulfillment: 'PHYSICAL',
    warrantyMonths: 12,
    rating: 4.4,
    reviewCount: 81,
    featured: false,
    basePrice: 112000,
    skuPrefix: 'LM-FW2',
    axes: [
      { name: 'Case size', values: [
        { value: '41mm', code: '41' },
        { value: '45mm', code: '45', priceDelta: 9000 },
      ] },
    ],
    stock: 20,
    art: { kind: 'watch', color: '#0f172a' },
  },
  {
    id: 'MOCK-0018',
    slug: 'voltara-boom-party-speaker',
    name: 'Voltara Boom Bluetooth Party Speaker',
    brand: 'Voltara',
    category: 'audio-wearables',
    short: '80W portable speaker with deep bass, light show, karaoke mic input and 20-hour battery.',
    description:
      'Room-filling sound for events, churches, shops and parties. Pair two units for stereo, plug in a microphone for karaoke and keep the music going for up to 20 hours.',
    specs: [
      ['Output', '80W RMS'],
      ['Battery', 'Up to 20 hours'],
      ['Inputs', 'Bluetooth 5.3, AUX, USB, 6.35mm mic'],
      ['Protection', 'IPX4 splash resistant'],
    ],
    tags: ['speaker', 'bluetooth', 'party', 'audio'],
    fulfillment: 'PHYSICAL',
    warrantyMonths: 12,
    rating: 4.5,
    reviewCount: 67,
    featured: false,
    basePrice: 89000,
    skuPrefix: 'VT-BOOM',
    axes: [],
    stock: 16,
    art: { kind: 'speaker', color: '#111827' },
  },

  // ---------------------------------------------------------------- Power & Energy
  {
    id: 'MOCK-0019',
    slug: 'electrocore-hybrid-inverter-3-5kva',
    name: 'ElectroCore 3.5kVA Hybrid Solar Inverter',
    brand: 'ElectroCore',
    category: 'power-energy',
    short: 'Pure sine wave hybrid inverter with 100A MPPT, Wi-Fi monitoring and lithium support.',
    description:
      'Keep homes and offices running through outages. The 3.5kVA hybrid inverter blends solar, grid and battery power intelligently, with a built-in 100A MPPT solar charge controller and app-based monitoring. Professional installation by our certified technicians is available on request.',
    specs: [
      ['Rated power', '3.5kVA / 3.5kW, 24V system'],
      ['Waveform', 'Pure sine wave'],
      ['Solar controller', '100A MPPT, PV input up to 450V'],
      ['Batteries', 'Lithium (LiFePO₄) & lead-acid compatible'],
      ['Monitoring', 'Wi-Fi app & LCD'],
    ],
    tags: ['inverter', 'solar', 'power', 'backup', 'hybrid'],
    fulfillment: 'PHYSICAL',
    warrantyMonths: 24,
    rating: 4.8,
    reviewCount: 94,
    featured: true,
    basePrice: 1180000,
    compareAtPrice: 1295000,
    skuPrefix: 'EC-HI35',
    axes: [],
    stock: 8,
    art: { kind: 'inverter', color: '#e2e8f0' },
  },
  {
    id: 'MOCK-0020',
    slug: 'electrocore-ups-1200va',
    name: 'ElectroCore 1200VA Line-Interactive UPS',
    brand: 'ElectroCore',
    category: 'power-energy',
    short: 'Protects PCs and routers from surges and blackouts with AVR and 6 outlets.',
    description:
      'Automatic voltage regulation corrects low and high mains voltage without draining the battery, while battery backup gives you time to save work and shut down safely.',
    specs: [
      ['Capacity', '1200VA / 720W'],
      ['Topology', 'Line-interactive with AVR'],
      ['Outlets', '6 (4 battery + surge, 2 surge only)'],
      ['Backup time', '~25 minutes for a typical office PC'],
    ],
    tags: ['ups', 'power', 'surge', 'backup'],
    fulfillment: 'PHYSICAL',
    warrantyMonths: 12,
    rating: 4.4,
    reviewCount: 57,
    featured: false,
    basePrice: 145000,
    skuPrefix: 'EC-UPS12',
    axes: [],
    stock: 24,
    art: { kind: 'ups', color: '#1f2937' },
  },
  {
    id: 'MOCK-0021',
    slug: 'voltara-20000mah-power-bank',
    name: 'Voltara 20,000mAh 65W Power Bank',
    brand: 'Voltara',
    category: 'power-energy',
    short: 'Charges laptops, phones and tablets — 65W USB-C PD, digital display.',
    description:
      'A high-capacity power bank that can charge a USB-C laptop as well as phones. A digital display shows the exact charge remaining. Airline-safe capacity.',
    specs: [
      ['Capacity', '20,000mAh / 74Wh'],
      ['Output', '65W USB-C PD + 2× USB-A 22.5W'],
      ['Recharge', '2.5 hours with 65W charger'],
    ],
    tags: ['power bank', 'charger', 'usb-c', 'portable'],
    fulfillment: 'PHYSICAL',
    warrantyMonths: 12,
    rating: 4.6,
    reviewCount: 241,
    featured: false,
    basePrice: 32500,
    skuPrefix: 'VT-PB20',
    axes: [
      { name: 'Color', values: [
        { value: 'Black', code: 'blk', colorHex: '#1f2937' },
        { value: 'Electric Blue', code: 'blu', colorHex: '#1a4ef5' },
      ] },
    ],
    stock: 80,
    art: { kind: 'powerbank', color: '#1f2937' },
  },
  {
    id: 'MOCK-0022',
    slug: 'voltara-450w-mono-solar-panel',
    name: 'Voltara 450W Monocrystalline Solar Panel',
    brand: 'Voltara',
    category: 'power-energy',
    short: 'High-efficiency 21% half-cut cell panel, 25-year performance warranty.',
    description:
      'Half-cut monocrystalline cells deliver strong output even in partial shade and Nigerian harmattan haze. Anodised aluminium frame and tempered glass withstand tropical weather.',
    specs: [
      ['Max power', '450W'],
      ['Efficiency', '21.1%'],
      ['Cells', '144 half-cut mono PERC'],
      ['Dimensions', '2094 × 1038 × 35mm'],
    ],
    tags: ['solar', 'panel', 'renewable', 'power'],
    fulfillment: 'PHYSICAL',
    warrantyMonths: 120,
    rating: 4.7,
    reviewCount: 49,
    featured: false,
    basePrice: 168000,
    skuPrefix: 'VT-SP450',
    axes: [],
    stock: 60,
    art: { kind: 'solar', color: '#1e3a8a' },
  },

  // ---------------------------------------------------------------- Networking
  {
    id: 'MOCK-0023',
    slug: 'nexabyte-wifi-6-mesh-system',
    name: 'NexaByte AX3000 Wi-Fi 6 Mesh System',
    brand: 'NexaByte',
    category: 'networking',
    short: 'Seamless whole-home and office Wi-Fi 6 coverage; each node covers up to 2,500 sq ft.',
    description:
      'Eliminate dead zones across duplexes, offices and warehouses. Nodes connect automatically into one network with a single name, and the app makes parental controls and guest access easy.',
    specs: [
      ['Standard', 'Wi-Fi 6 (802.11ax), dual-band AX3000'],
      ['Coverage', 'Up to 2,500 sq ft per node'],
      ['Ports', '3× Gigabit Ethernet per node'],
      ['Security', 'WPA3'],
    ],
    tags: ['router', 'wifi', 'mesh', 'networking', 'internet'],
    fulfillment: 'PHYSICAL',
    warrantyMonths: 24,
    rating: 4.6,
    reviewCount: 72,
    featured: false,
    basePrice: 96000,
    skuPrefix: 'NB-MESH',
    axes: [
      { name: 'Pack', values: [
        { value: '1-Pack', code: '1p' },
        { value: '2-Pack', code: '2p', priceDelta: 82000 },
        { value: '3-Pack', code: '3p', priceDelta: 153000 },
      ] },
    ],
    stock: 20,
    art: { kind: 'router', color: '#f8fafc' },
  },
  {
    id: 'MOCK-0024',
    slug: 'nexabyte-4g-lte-mifi',
    name: 'NexaByte 4G LTE Portable MiFi',
    brand: 'NexaByte',
    category: 'networking',
    short: 'Unlocked pocket hotspot for up to 16 devices, works with all Nigerian networks.',
    description:
      'Share fast 4G internet with your team anywhere. Unlocked for every major Nigerian network with a 3,000mAh battery for a full workday.',
    specs: [
      ['Network', '4G LTE Cat 6, unlocked'],
      ['Devices', 'Up to 16'],
      ['Battery', '3,000mAh, ~10 hours'],
    ],
    tags: ['mifi', 'hotspot', '4g', 'lte', 'networking'],
    fulfillment: 'PHYSICAL',
    warrantyMonths: 12,
    rating: 4.2,
    reviewCount: 39,
    featured: false,
    basePrice: 42000,
    skuPrefix: 'NB-MIFI',
    axes: [],
    stock: 33,
    art: { kind: 'router', color: '#1f2937' },
  },

  // ---------------------------------------------------------------- Software & Apps
  {
    id: 'MOCK-0025',
    slug: 'electrocore-securesuite-antivirus',
    name: 'ElectroCore SecureSuite Total Security (1 Year)',
    brand: 'ElectroCore',
    category: 'software-apps',
    short: 'Antivirus, ransomware shield, firewall and VPN — licence key delivered by email.',
    description:
      'Complete protection for Windows, macOS and Android. Your licence key is emailed within minutes of payment, and our support team will help with installation remotely if needed.',
    specs: [
      ['Platforms', 'Windows, macOS, Android'],
      ['Includes', 'Antivirus, ransomware shield, firewall, 10GB/day VPN'],
      ['Delivery', 'Licence key by email'],
      ['Term', '12 months'],
    ],
    tags: ['software', 'antivirus', 'security', 'licence', 'digital'],
    fulfillment: 'DIGITAL',
    warrantyMonths: 0,
    rating: 4.5,
    reviewCount: 156,
    featured: false,
    basePrice: 18500,
    skuPrefix: 'EC-SSTS',
    axes: [
      { name: 'Devices', values: [
        { value: '1 Device', code: '1d' },
        { value: '3 Devices', code: '3d', priceDelta: 13500 },
        { value: '5 Devices', code: '5d', priceDelta: 26500 },
      ] },
    ],
    stock: 9999,
    art: { kind: 'software', color: '#0d7a72' },
  },
  {
    id: 'MOCK-0026',
    slug: 'electrocore-bizdesk-pos-inventory',
    name: 'ElectroCore BizDesk POS & Inventory Software',
    brand: 'ElectroCore',
    category: 'software-apps',
    short: 'Point-of-sale, inventory and sales reporting for Nigerian retailers — works offline.',
    description:
      'Run your shop with confidence: barcode sales, stock alerts, staff accounts, receipts and daily reports. Works offline and syncs when internet returns. Includes onboarding and staff training.',
    specs: [
      ['Platforms', 'Windows desktop + Android companion app'],
      ['Features', 'POS, inventory, multi-branch, VAT-ready receipts'],
      ['Offline', 'Yes, automatic sync'],
      ['Includes', 'Remote onboarding session'],
    ],
    tags: ['software', 'pos', 'inventory', 'business', 'licence', 'digital'],
    fulfillment: 'DIGITAL',
    warrantyMonths: 0,
    rating: 4.6,
    reviewCount: 44,
    featured: false,
    basePrice: 120000,
    skuPrefix: 'EC-BZD',
    axes: [
      { name: 'Plan', values: [
        { value: 'Starter (1 terminal)', code: 'st' },
        { value: 'Business (5 terminals)', code: 'bz', priceDelta: 160000 },
      ] },
    ],
    stock: 9999,
    art: { kind: 'software', color: '#0f766e' },
  },
  {
    id: 'MOCK-0027',
    slug: 'mobile-app-development-discovery',
    name: 'Custom Mobile App Development — Discovery Package',
    brand: 'ElectroCore',
    category: 'software-apps',
    short: 'Kick off your Android/iOS app: requirements workshop, UX wireframes and a fixed quote.',
    description:
      'Our product team runs a structured discovery: stakeholder workshop, feature map, clickable wireframes and a technical architecture with a fixed delivery quote. The package fee is credited against the full build if you proceed with us.',
    specs: [
      ['Deliverables', 'Requirements doc, wireframes, architecture, fixed quote'],
      ['Timeline', '2–3 weeks'],
      ['Platforms', 'Android, iOS, cross-platform'],
      ['Credit', '100% credited to full build'],
    ],
    tags: ['mobile app', 'development', 'software', 'service', 'android', 'ios'],
    fulfillment: 'SERVICE',
    warrantyMonths: 0,
    rating: 4.9,
    reviewCount: 18,
    featured: false,
    basePrice: 350000,
    skuPrefix: 'EC-MAD',
    axes: [],
    stock: 9999,
    art: { kind: 'app', color: '#0d7a72' },
  },

  // ---------------------------------------------------------------- Repair & Services
  {
    id: 'MOCK-0028',
    slug: 'device-diagnostic-repair-booking',
    name: 'Device Diagnostic & Repair Booking',
    brand: 'ElectroCore',
    category: 'repair-services',
    short: 'Certified diagnosis for phones, laptops and desktops. Fee is deducted from the repair cost.',
    description:
      'Book a professional diagnosis at our workshop or arrange pickup. Our technicians test hardware and software, send you a written quote, and only proceed with your approval. The booking fee is deducted from the final repair bill. All repairs carry a 90-day workmanship warranty.',
    specs: [
      ['Turnaround', 'Diagnosis within 24–48 hours'],
      ['Covers', 'Screens, batteries, boards, charging ports, software, data recovery'],
      ['Warranty', '90 days on workmanship'],
      ['Credit', 'Fee deducted from final repair bill'],
    ],
    tags: ['repair', 'service', 'diagnostic', 'laptop repair', 'phone repair'],
    fulfillment: 'SERVICE',
    warrantyMonths: 3,
    rating: 4.8,
    reviewCount: 312,
    featured: true,
    basePrice: 10000,
    skuPrefix: 'EC-SRV-DX',
    axes: [
      { name: 'Device type', values: [
        { value: 'Smartphone / Tablet', code: 'mob' },
        { value: 'Laptop', code: 'lap', priceDelta: 5000 },
        { value: 'Desktop / Server', code: 'dsk', priceDelta: 10000 },
      ] },
    ],
    stock: 9999,
    art: { kind: 'service', color: '#0d7a72' },
  },
  {
    id: 'MOCK-0029',
    slug: 'custom-pc-assembly-service',
    name: 'Custom PC Assembly & Build Service',
    brand: 'ElectroCore',
    category: 'repair-services',
    short: 'We assemble, cable-manage, update BIOS, install Windows and stress-test your build.',
    description:
      'Bring your parts or buy them here. Our engineers assemble your PC, route cables cleanly, update firmware, install the operating system and drivers, then run a 12-hour stability test before handover.',
    specs: [
      ['Includes', 'Assembly, cable management, BIOS update, OS + drivers'],
      ['Testing', '12-hour stress & thermal test'],
      ['Turnaround', '2–3 business days'],
    ],
    tags: ['pc build', 'assembly', 'service', 'custom pc'],
    fulfillment: 'SERVICE',
    warrantyMonths: 3,
    rating: 4.9,
    reviewCount: 61,
    featured: false,
    basePrice: 45000,
    skuPrefix: 'EC-SRV-PC',
    axes: [],
    stock: 9999,
    art: { kind: 'service', color: '#0f172a' },
  },
];
