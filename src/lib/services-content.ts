/**
 * Content for the "Learn more" service pages (/services/[slug]).
 *
 * Honesty rules used throughout:
 *  - basis "listing" = taken from the store's own published service listing (the product page).
 *  - basis "policy"  = taken from the published policies (/policies/...).
 *  - basis "typical" = general industry guidance, shown with an "estimate" label; the real figure is always
 *    confirmed in the written quotation.
 * No prices are written here: live prices are read from the store catalogue on the page itself.
 */

export type Basis = 'listing' | 'policy' | 'typical';

export interface Fact { label: string; value: string; basis: Basis }
export interface Step { title: string; body: string }
export interface Fault { fault: string; symptoms: string }
export interface Faq { q: string; a: string }

export interface ServiceContent {
  slug: string;
  title: string;
  /** What kind of service: repairs get a request form, the app discovery gets the product page. */
  kind: 'repair' | 'assembly' | 'development';
  summary: string;
  intro: string;
  /** Catalogue product whose live price is shown on the page. */
  productSlug: string;
  devices: string[];
  faults: Fault[];
  methods: string[];
  steps: Step[];
  facts: Fact[];
  benefits: string[];
  safety: string[];
  prepare: string[];
  aftercare: string[];
  faqs: Faq[];
}

const COMMON_STEPS: Step[] = [
  { title: 'Send your request', body: 'Describe the fault and upload clear photos (up to 6) on the request form. Add the brand, model and your contact details.' },
  { title: 'We review and quote', body: 'Our team looks at your photos and description and sends a written quotation on your tracking page. Nothing is repaired before you approve it.' },
  { title: 'Agree the price', body: 'Accept the quotation, decline it, or suggest your own price. You and our team can message each other and share photos until you both agree.' },
  { title: 'Book a repairer', body: 'Pick a repairer, a date and a time from the Book a repairer page. Our team confirms the appointment, and you can see the confirmation on your tracking page.' },
  { title: 'Hand over the device', body: 'Bring the device to the workshop, or ask for an on-site visit where your chosen repairer offers it. Our team records each stage of the repair on your tracking page.' },
  { title: 'Pay and collect', body: 'Pay online, by bank transfer or at our office. When the repair is ready you are told on your tracking page.' },
];

export const SERVICES: ServiceContent[] = [
  {
    slug: 'device-diagnosis-repair',
    title: 'Diagnosis & repair',
    kind: 'repair',
    summary: 'Screens, batteries, boards, charging ports, software and data recovery for phones, laptops and desktops, with a written quote before any work.',
    intro: 'Book a professional diagnosis at our workshop or arrange pickup. Our technicians test hardware and software, send you a written quote, and only proceed with your approval.',
    productSlug: 'device-diagnostic-repair-booking',
    devices: ['Smartphones and tablets', 'Laptops', 'Desktops and small servers'],
    faults: [
      { fault: 'Screens', symptoms: 'Cracks, lines, dead patches or a black display.' },
      { fault: 'Batteries', symptoms: 'Fast drain, shutdowns, swelling or a device that only works plugged in.' },
      { fault: 'Boards', symptoms: 'Will not power on, restarts, no signal or no display after a drop or spill.' },
      { fault: 'Charging ports', symptoms: 'Loose connector, charges only at certain angles or not at all.' },
      { fault: 'Software', symptoms: 'Will not start, crashes, viruses or a failed update.' },
      { fault: 'Data recovery', symptoms: 'Files you need from a device that fails or was wiped.' },
    ],
    methods: ['Hardware testing and software checks', 'Part replacement', 'Board-level inspection', 'Software repair and reinstall', 'Data recovery assessment'],
    steps: COMMON_STEPS,
    facts: [
      { label: 'Diagnosis time', value: 'Within 24–48 hours', basis: 'listing' },
      { label: 'Repairs covered', value: 'Screens, batteries, boards, charging ports, software, data recovery', basis: 'listing' },
      { label: 'Quotation', value: 'Written quote before any work; we only proceed with your approval', basis: 'listing' },
      { label: 'Diagnostic booking fee', value: 'Deducted from the final repair bill', basis: 'policy' },
      { label: 'Warranty', value: '90-day workmanship warranty on the parts replaced and the work done', basis: 'policy' },
      { label: 'Repair time after approval', value: 'Depends on the fault and on parts availability. We give it in your quotation.', basis: 'typical' },
    ],
    benefits: ['A written price before work starts', 'Negotiate the price with our team', 'Track every stage online', '90-day workmanship warranty'],
    safety: ['Switch off and unplug a device after a liquid spill.', 'Do not keep using a device with a swollen battery.', 'Back up your data first where you can.'],
    prepare: ['Back up your data if the device still works.', 'Bring the charger for laptops.', 'Photograph the damage and the model label.', 'Note when the fault started.'],
    aftercare: ['Use quality chargers and a protective case or sleeve.', 'Keep backups of important files.', 'Keep your repair reference for the 90-day workmanship warranty.'],
    faqs: [
      { q: 'Which devices do you repair?', a: 'Phones, tablets, laptops and desktops. Each has its own page with common faults and steps.' },
      { q: 'Do I have to proceed after the diagnosis?', a: 'No. You can decline the quotation. The diagnostic booking fee is deducted from the final repair bill if you proceed.' },
    ],
  },
  {
    slug: 'smartphone-tablet-repair',
    title: 'Smartphone & tablet repair',
    kind: 'repair',
    summary: 'Screens, batteries, charging ports, boards and software faults on phones and tablets, with a written quote first.',
    intro: 'Our workshop engineers diagnose and repair smartphones and tablets. You send photos and a description, we send a written quotation, and work only starts once you approve the price.',
    productSlug: 'device-diagnostic-repair-booking',
    devices: ['Android smartphones', 'iPhones', 'Android tablets', 'iPads', 'Other mobile devices (ask us if yours is not listed)'],
    faults: [
      { fault: 'Cracked or unresponsive screen', symptoms: 'Visible cracks, lines or dead patches, touch not responding, display flickering or black.' },
      { fault: 'Weak or swollen battery', symptoms: 'Fast drain, sudden shutdowns, phone getting hot, back panel lifting or screen bulging.' },
      { fault: 'Charging port problems', symptoms: 'Charges only at certain angles, will not charge, cable will not stay in.' },
      { fault: 'Water or liquid damage', symptoms: 'Phone fell in water, speaker or camera fogged, device will not switch on.' },
      { fault: 'Board-level faults', symptoms: 'Will not power on, restarts in a loop, no signal or no Wi-Fi after a drop.' },
      { fault: 'Software problems', symptoms: 'Stuck on the logo, crashes, forgotten updates or failed update.' },
    ],
    methods: ['Hardware testing and software checks to find the real cause', 'Part replacement (screen, battery, charging port and similar)', 'Board-level inspection where the fault is on the motherboard', 'Software repair and reinstall'],
    steps: COMMON_STEPS,
    facts: [
      { label: 'Diagnosis time', value: 'Within 24–48 hours', basis: 'listing' },
      { label: 'Repairs covered', value: 'Screens, batteries, boards, charging ports, software, data recovery', basis: 'listing' },
      { label: 'Quotation', value: 'Written quote before any work; we only proceed with your approval', basis: 'listing' },
      { label: 'Diagnostic booking fee', value: 'Deducted from the final repair bill', basis: 'policy' },
      { label: 'Warranty', value: '90-day workmanship warranty on the parts replaced and the work done', basis: 'policy' },
      { label: 'Repair time after approval', value: 'Depends on the fault and on parts availability. We give it in your quotation.', basis: 'typical' },
    ],
    benefits: ['A written price before work starts', 'Negotiate the price directly with our team', 'Track every stage online', '90-day workmanship warranty'],
    safety: ['Never charge a phone with a swollen or leaking battery. Switch it off and bring it to us.', 'Do not try to dry a wet phone with heat or rice. Switch it off, remove the case and SIM, and contact us quickly.', 'Back up your data first if the phone still works.'],
    prepare: ['Back up photos, contacts and chats if you can.', 'Be ready to unlock the phone for testing when you hand it over. Do not post your passcode in public messages.', 'Remove your SIM, memory card and case.', 'Take clear photos of the damage and of the model label.'],
    aftercare: ['Use a good case and screen protector after a screen repair.', 'Use the original or a quality charger and cable.', 'Keep your 90-day workmanship warranty details from your tracking page.'],
    faqs: [
      { q: 'Do I pay before you look at the phone?', a: 'You pay a diagnostic booking fee, which is deducted from the final repair bill if you go ahead. The current fee is shown on this page.' },
      { q: 'What if I do not like the quotation?', a: 'Decline it or send your own price from your tracking page. You are never obliged to proceed.' },
      { q: 'Can you repair at my home or office?', a: 'Only where your chosen repairer offers on-site visits. The Book a repairer page shows who does and which areas they cover.' },
      { q: 'Is my data safe?', a: 'We treat your data as private, but repairs can sometimes erase it. Always back up first where possible.' },
    ],
  },
  {
    slug: 'laptop-repair',
    title: 'Laptop repair',
    kind: 'repair',
    summary: 'Screen, keyboard, battery, charging, overheating, storage and software repairs for laptops.',
    intro: 'We diagnose laptop faults at the workshop, quote the repair in writing and only begin once you agree the price.',
    productSlug: 'device-diagnostic-repair-booking',
    devices: ['Windows laptops', 'MacBooks', 'Chromebooks', 'Gaming laptops', 'Ultrabooks and business laptops'],
    faults: [
      { fault: 'Broken or dim screen', symptoms: 'Cracks, lines, flickering, very dim picture, black screen with sound.' },
      { fault: 'Battery or charging problems', symptoms: 'Only works plugged in, will not charge, charger gets very hot, loose charging port.' },
      { fault: 'Overheating and loud fans', symptoms: 'Shuts down under load, very hot underneath, fan noise.' },
      { fault: 'Keyboard or touchpad faults', symptoms: 'Keys not working, spilled drink, cursor jumping.' },
      { fault: 'Slow or failing storage', symptoms: 'Very slow start, freezing, clicking sounds, files disappearing, "no boot device".' },
      { fault: 'Will not switch on', symptoms: 'No lights, no response to the charger, or powers on and off immediately.' },
      { fault: 'Software and operating system issues', symptoms: 'Windows will not start, constant crashes, viruses.' },
    ],
    methods: ['Hardware and software diagnostics', 'Replacement of screens, batteries, keyboards, storage and charging ports', 'Cleaning and cooling-system service', 'Operating-system repair or reinstall', 'Board-level inspection where needed'],
    steps: COMMON_STEPS,
    facts: [
      { label: 'Diagnosis time', value: 'Within 24–48 hours', basis: 'listing' },
      { label: 'Repairs covered', value: 'Screens, batteries, boards, charging ports, software, data recovery', basis: 'listing' },
      { label: 'Quotation', value: 'Written quote before any work; we only proceed with your approval', basis: 'listing' },
      { label: 'Diagnostic booking fee', value: 'Deducted from the final repair bill', basis: 'policy' },
      { label: 'Warranty', value: '90-day workmanship warranty on the parts replaced and the work done', basis: 'policy' },
      { label: 'Repair time after approval', value: 'Depends on the fault and on parts availability. We give it in your quotation.', basis: 'typical' },
    ],
    benefits: ['Written quotation and price negotiation', 'Photo-based pre-assessment from home', 'Progress tracking online', '90-day workmanship warranty'],
    safety: ['Switch the laptop off and unplug it straight away after a liquid spill.', 'Do not keep using a laptop with a swollen battery.', 'Back up important files before bringing it in if it still starts.'],
    prepare: ['Bring the original charger.', 'Back up your files if possible.', 'Photograph the damage, the model label on the underside and any error messages.', 'Note when the fault started and anything that happened before it.'],
    aftercare: ['Keep vents clear and use the laptop on a hard, flat surface.', 'Keep your operating system and antivirus updated.', 'Use a surge protector with your charger.'],
    faqs: [
      { q: 'How do I know the price before I bring it in?', a: 'Upload photos and describe the fault. We send a written quotation on your tracking page, and you can negotiate it.' },
      { q: 'Can you recover my files?', a: 'Often, but it cannot be promised before the drive is assessed. See the data recovery page.' },
      { q: 'Is the diagnostic fee refunded?', a: 'It is deducted from the final repair bill if you proceed. For other cases, read our terms or contact us.' },
    ],
  },
  {
    slug: 'desktop-repair',
    title: 'Desktop & workstation repair',
    kind: 'repair',
    summary: 'Diagnosis and repair of desktop PCs and small servers: power, boards, memory, storage, cooling and software.',
    intro: 'Desktop faults are usually found quickly with the right tests. We diagnose, quote in writing and repair only after you approve.',
    productSlug: 'device-diagnostic-repair-booking',
    devices: ['Desktop PCs', 'All-in-one PCs', 'Workstations', 'Small servers', 'Custom-built and branded computers'],
    faults: [
      { fault: 'No power or random shutdowns', symptoms: 'Nothing happens when you press the button, or the PC switches off by itself.' },
      { fault: 'Beeps or no display', symptoms: 'Fans spin but the screen stays black, or the PC beeps at start-up.' },
      { fault: 'Overheating', symptoms: 'Loud fans, shutdowns while gaming or working, very hot case.' },
      { fault: 'Storage failure', symptoms: 'Very slow, freezing, "boot device not found", clicking noises.' },
      { fault: 'Memory or board faults', symptoms: 'Blue screens, restarts, devices not detected.' },
      { fault: 'Software and virus problems', symptoms: 'Windows will not load, constant pop-ups, corrupted updates.' },
    ],
    methods: ['Component-by-component testing', 'Replacement of power supplies, memory, storage, fans and other parts', 'Cleaning and re-pasting of cooling systems', 'Operating-system repair or reinstall', 'Board-level inspection where needed'],
    steps: COMMON_STEPS,
    facts: [
      { label: 'Diagnosis time', value: 'Within 24–48 hours', basis: 'listing' },
      { label: 'Repairs covered', value: 'Screens, batteries, boards, charging ports, software, data recovery', basis: 'listing' },
      { label: 'Quotation', value: 'Written quote before any work; we only proceed with your approval', basis: 'listing' },
      { label: 'Diagnostic booking fee', value: 'Deducted from the final repair bill', basis: 'policy' },
      { label: 'Warranty', value: '90-day workmanship warranty on the parts replaced and the work done', basis: 'policy' },
      { label: 'Repair time after approval', value: 'Depends on the fault and on parts availability. We give it in your quotation.', basis: 'typical' },
    ],
    benefits: ['Clear written quotation', 'Pick a repairer and a time that suits you', 'On-site visits where a repairer offers them', 'Track progress online'],
    safety: ['Unplug the computer from the wall before opening anything.', 'If you smell burning or see smoke, unplug it and do not switch it on again.', 'Do not open a power supply unit. It can hold a dangerous charge even when unplugged.'],
    prepare: ['Bring only the tower or system unit unless the screen is part of the fault.', 'Back up your files if it still starts.', 'Note any error messages or beep patterns.', 'Photograph the fault and the label on the case or board.'],
    aftercare: ['Keep dust out of the case and the vents clear.', 'Use a surge protector or UPS.', 'Keep your system updated and backed up.'],
    faqs: [
      { q: 'Can a desktop be repaired where it stands?', a: 'Where your chosen repairer offers on-site visits and covers your area. Otherwise bring the system unit to the workshop.' },
      { q: 'Do you repair servers?', a: 'Small servers are listed in our diagnostic service. Describe yours in the request and we will confirm.' },
    ],
  },
  {
    slug: 'data-recovery',
    title: 'Data recovery',
    kind: 'repair',
    summary: 'Assessment and recovery of files from phones, laptops and desktops. No promises before the device is examined.',
    intro: 'Data recovery is part of our diagnostic and repair service. We examine the device, tell you in writing what can be attempted and what it will cost, and you decide whether to proceed.',
    productSlug: 'device-diagnostic-repair-booking',
    devices: ['Phones and tablets', 'Laptop and desktop hard drives and SSDs', 'Memory cards and USB drives (describe yours in the request)'],
    faults: [
      { fault: 'Device will not start', symptoms: 'You need the files but the device no longer boots.' },
      { fault: 'Deleted or lost files', symptoms: 'Files removed by mistake or lost after a reset or reinstall.' },
      { fault: 'Failing storage', symptoms: 'Clicking sounds, drive not detected, frequent freezing.' },
      { fault: 'Water or physical damage', symptoms: 'Device dropped or wet and the data matters more than the device.' },
    ],
    methods: ['Assessment of the storage device', 'Recovery attempts using software and hardware tools suited to the fault', 'Copying recovered files to media you choose'],
    steps: [
      { title: 'Tell us what happened', body: 'Describe what the device holds, what went wrong and what must be saved. Add photos of the device.' },
      { title: 'Stop using the device', body: 'Do not keep switching it on or installing anything. Further use can overwrite data.' },
      { title: 'Assessment and written quotation', body: 'We examine the device and send a written quotation and what can realistically be attempted. You approve, negotiate or decline.' },
      { title: 'Recovery attempt', body: 'After your approval we attempt the recovery and tell you what was found.' },
      { title: 'Pay and collect', body: 'Pay online, by bank transfer or at our office, and collect your files and your device.' },
    ],
    facts: [
      { label: 'Assessment time', value: 'Diagnosis within 24–48 hours', basis: 'listing' },
      { label: 'Listed with', value: 'Data recovery is included in our diagnostic service', basis: 'listing' },
      { label: 'Quotation', value: 'Written quote before any work; we only proceed with your approval', basis: 'listing' },
      { label: 'Diagnostic booking fee', value: 'Deducted from the final repair bill', basis: 'policy' },
      { label: 'Result', value: 'Recovery cannot be guaranteed. How much can be recovered depends on the damage. We tell you after the assessment.', basis: 'typical' },
    ],
    benefits: ['An honest assessment before any recovery work', 'Written quotation you can negotiate', 'Progress tracking online'],
    safety: ['Switch the device off if it makes clicking or grinding sounds.', 'Never open a hard drive yourself.', 'Do not run "repair" or "format" tools on the drive.'],
    prepare: ['Stop using the device.', 'List the files that matter most (documents, photos, chats).', 'Have a storage device ready for the recovered files if you want them on your own media.'],
    aftercare: ['Keep at least two backups of important files, one of them off the device.', 'Replace a failing drive instead of continuing to use it.'],
    faqs: [
      { q: 'Can you guarantee my files will come back?', a: 'No. We cannot promise a result before the device is examined, and we will not pretend otherwise.' },
      { q: 'What do I pay if nothing can be recovered?', a: 'This is set out in your written quotation before you approve anything. Ask about it in the negotiation.' },
    ],
  },
  {
    slug: 'custom-pc-assembly',
    title: 'Custom PC assembly',
    kind: 'assembly',
    summary: 'We build your PC from your parts or ours, cable-manage it, install the OS and stress-test it for 12 hours.',
    intro: 'Bring your parts or buy them from us. Our engineers assemble the PC, route the cables cleanly, update the firmware, install the operating system and drivers, then test it before handover.',
    productSlug: 'custom-pc-assembly-service',
    devices: ['Gaming PCs', 'Workstations for design and video', 'Office and home desktops', 'Upgrades to existing desktops (ask us)'],
    faults: [
      { fault: 'Not sure the parts work together', symptoms: 'You bought parts and want them checked for compatibility before assembly. Tell us the list in your request.' },
      { fault: 'Build that crashes or overheats', symptoms: 'A PC built elsewhere that restarts, overheats or will not start. Use the desktop repair service for this.' },
    ],
    methods: ['Assembly and cable management', 'BIOS update', 'Operating system and driver installation', '12-hour stress and thermal test'],
    steps: [
      { title: 'Tell us your parts', body: 'Send your parts list, or ask which parts we recommend, through the request form.' },
      { title: 'Written quotation', body: 'We confirm what is included and the price. Negotiate it on your tracking page if you wish.' },
      { title: 'Book a repairer', body: 'Choose a time to hand over your parts or to start the build.' },
      { title: 'Assembly and setup', body: 'We assemble, route the cables, update the BIOS and install the OS and drivers.' },
      { title: 'Stress test', body: 'The finished PC is stress-tested and thermally tested for 12 hours.' },
      { title: 'Pay and collect', body: 'Pay online, by bank transfer or at our office, then collect the finished PC.' },
    ],
    facts: [
      { label: 'Includes', value: 'Assembly, cable management, BIOS update, OS and drivers', basis: 'listing' },
      { label: 'Testing', value: '12-hour stress and thermal test', basis: 'listing' },
      { label: 'Turnaround', value: '2–3 business days', basis: 'listing' },
      { label: 'Warranty', value: 'The service listing records 3 months. Our repair workmanship warranty is 90 days. Exact terms are confirmed in your quotation.', basis: 'listing' },
    ],
    benefits: ['Build tested for 12 hours before handover', 'Use your own parts or buy them here', 'Clean cable management', 'Online progress tracking'],
    safety: ['Never open a power supply unit.', 'Keep your parts in their anti-static packaging until the build.'],
    prepare: ['Have all parts, screws and cables from the boxes ready.', 'Tell us which operating system and software you want installed.', 'Keep licence keys and receipts.'],
    aftercare: ['Keep the case vents clear and dust the PC regularly.', 'Install updates and keep your files backed up.'],
    faqs: [
      { q: 'Can I buy the parts from you?', a: 'Yes. Browse the shop, or tell us your budget and we will advise.' },
      { q: 'How long does a build take?', a: 'Our listing says 2–3 business days. Your quotation confirms it for your build.' },
    ],
  },
  {
    slug: 'mobile-app-development',
    title: 'Mobile app development',
    kind: 'development',
    summary: 'A structured discovery for your Android or iOS app: requirements, wireframes, architecture and a fixed quote.',
    intro: 'Our product team runs a structured discovery: stakeholder workshop, feature map, clickable wireframes and a technical architecture with a fixed delivery quote.',
    productSlug: 'mobile-app-development-discovery',
    devices: ['Android apps', 'iOS apps', 'Cross-platform apps'],
    faults: [],
    methods: ['Stakeholder workshop', 'Feature map', 'Clickable wireframes', 'Technical architecture', 'Fixed delivery quotation'],
    steps: [
      { title: 'Order the discovery package', body: 'Buy the discovery package from its product page.' },
      { title: 'Requirements workshop', body: 'We map what the app must do and who it is for.' },
      { title: 'Wireframes and architecture', body: 'You receive clickable wireframes and a technical architecture.' },
      { title: 'Fixed quote', body: 'You receive a fixed delivery quotation for the full build.' },
    ],
    facts: [
      { label: 'Deliverables', value: 'Requirements document, wireframes, architecture, fixed quote', basis: 'listing' },
      { label: 'Timeline', value: '2–3 weeks', basis: 'listing' },
      { label: 'Platforms', value: 'Android, iOS, cross-platform', basis: 'listing' },
      { label: 'Credit', value: '100% of the package fee is credited to the full build if you proceed with us', basis: 'listing' },
    ],
    benefits: ['A fixed quote before you commit to a build', 'Fee credited in full if you build with us'],
    safety: [],
    prepare: ['Write down the problem the app solves and who will use it.', 'Collect examples of apps you like.', 'Decide who in your team can attend the workshop.'],
    aftercare: ['Keep the requirements document and wireframes: they are yours to reuse.'],
    faqs: [
      { q: 'Is there a price?', a: 'The package price is shown on this page, from the store catalogue.' },
      { q: 'Do I have to build with you afterwards?', a: 'No. The package gives you a fixed quote. The fee is credited in full only if you build with us.' },
    ],
  },
];

export function getService(slug: string): ServiceContent | undefined {
  return SERVICES.find((s) => s.slug === slug);
}

/** Services a repair request can be filed under (everything except app development). */
export const REPAIRABLE_SERVICES = SERVICES.filter((s) => s.kind !== 'development');
