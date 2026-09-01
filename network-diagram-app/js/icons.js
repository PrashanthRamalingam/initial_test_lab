/*
 * Network icon library — professional line-art style.
 *
 * Every icon is inline SVG in a 64x64 viewBox, drawn as stroke-based
 * glyphs (consistent ~3px stroke, round caps/joins, no solid fills) in
 * the manner of enterprise Visio/Cisco stencils. `currentColor` carries
 * the node's color, so per-node recoloring and theme changes flow
 * through, and the icons serialize into every export unchanged.
 *
 * To add a device type: add one entry (use L() for the standard stroke
 * treatment) and list it in a category. Vendor stencil SVGs can be
 * pasted in using the same format.
 */

// Standard line treatment: no fill, currentColor stroke, rounded joins.
const L = inner =>
  `<g fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">${inner}</g>`;

// Muted, enterprise palette (users can still recolor any node).
const C = {
  core: '#3b5b7e',      // steel blue — routing & switching
  security: '#a04844',  // muted brick — firewalls & security appliances
  shield: '#3e6b50',    // muted green — protective services
  cloud: '#4a6d8c',     // slate blue — internet & cloud
  compute: '#4f5d75',   // slate — servers & storage
  wireless: '#3e6b6b',  // muted teal — wireless & telecom
  endpoint: '#556070',  // gray slate — user devices
  people: '#5b5470'     // muted violet-gray — people
};

const NETWORK_ICONS = {
  // --- Core network -------------------------------------------------------
  router: {
    label: 'Router',
    color: C.core,
    svg: L(`
      <circle cx="32" cy="32" r="23"/>
      <path d="M20 25 h15 M30 19.5 l5.5 5.5 -5.5 5.5"/>
      <path d="M44 39 h-15 M34 33.5 l-5.5 5.5 5.5 5.5"/>`)
  },
  l3switch: {
    label: 'L3 Switch',
    color: C.core,
    svg: L(`
      <rect x="8" y="17" width="48" height="30" rx="6"/>
      <path d="M15 26 h12 M23 22.5 l4.5 3.5 -4.5 3.5"/>
      <path d="M49 38 h-12 M41 34.5 l-4.5 3.5 4.5 3.5"/>
      <path d="M40 23 l7 0 0 7 M47 23 l-8 8"/>
      <path d="M24 41 l-7 0 0 -7 M17 41 l8 -8"/>`)
  },
  switch: {
    label: 'Switch',
    color: C.core,
    svg: L(`
      <rect x="7" y="20" width="50" height="24" rx="5"/>
      <path d="M14 28 h13 M23 24.5 l4.5 3.5 -4.5 3.5"/>
      <path d="M50 36 h-13 M41.5 32.5 l-4.5 3.5 4.5 3.5"/>`)
  },
  hub: {
    label: 'Hub',
    color: C.core,
    svg: L(`
      <circle cx="32" cy="32" r="6.5"/>
      <path d="M32 25.5 V10 M37.5 28.5 L51 20 M37.5 35.5 L51 44 M32 38.5 V54 M26.5 35.5 L13 44 M26.5 28.5 L13 20"/>`) +
      `<g fill="currentColor"><circle cx="32" cy="9" r="2.6"/><circle cx="52" cy="19.5" r="2.6"/><circle cx="52" cy="44.5" r="2.6"/><circle cx="32" cy="55" r="2.6"/><circle cx="12" cy="44.5" r="2.6"/><circle cx="12" cy="19.5" r="2.6"/></g>`
  },
  firewall: {
    label: 'Firewall',
    color: C.security,
    svg: L(`
      <rect x="8" y="15" width="48" height="34" rx="3"/>
      <path d="M8 26.5 h48 M8 38 h48"/>
      <path d="M24 15 v11.5 M40 15 v11.5 M16 26.5 V38 M32 26.5 V38 M48 26.5 V38 M24 38 v11 M40 38 v11"/>`)
  },
  loadbalancer: {
    label: 'Load Balancer',
    color: C.core,
    svg: L(`
      <rect x="14" y="8" width="36" height="16" rx="4"/>
      <path d="M22 16 h12 M30 12.5 l4 3.5 -4 3.5"/>
      <path d="M32 24 v8 M32 32 L14 44 M32 32 v12 M32 32 L50 44"/>
      <circle cx="13" cy="49" r="4.5"/><circle cx="32" cy="51" r="4.5"/><circle cx="51" cy="49" r="4.5"/>`)
  },
  proxy: {
    label: 'Proxy',
    color: C.core,
    svg: L(`
      <rect x="8" y="17" width="48" height="30" rx="6"/>
      <circle cx="32" cy="32" r="4.5"/>
      <path d="M14 25 h11 M21 21.5 l4 3.5 -4 3.5"/>
      <path d="M50 39 h-11 M43 35.5 l-4 3.5 4 3.5"/>`)
  },
  vpn: {
    label: 'VPN Gateway',
    color: C.security,
    svg: L(`
      <rect x="8" y="24" width="48" height="22" rx="5"/>
      <rect x="26" y="31" width="12" height="9" rx="1.5"/>
      <path d="M28.5 31 v-3 a3.5 3.5 0 0 1 7 0 v3"/>
      <path d="M13 35.5 h7 M44 35.5 h7"/>`)
  },
  ids: {
    label: 'IDS / IPS',
    color: C.security,
    svg: L(`
      <path d="M32 7 L53 14.5 v15.5 c0 13 -8.5 21.5 -21 27 C19.5 51.5 11 43 11 30 V14.5 z"/>
      <path d="M18 32 h7.5 l3.5 -8 5.5 14.5 3.5 -6.5 h8"/>`)
  },
  gateway: {
    label: 'Gateway',
    color: C.core,
    svg: L(`
      <rect x="11" y="12" width="42" height="40" rx="4"/>
      <path d="M22 52 v-17 a10 10 0 0 1 20 0 v17"/>
      <path d="M27 41 h9 M32.5 37 l4 4 -4 4"/>`)
  },
  aci: {
    label: 'ACI Fabric',
    color: C.core,
    svg: L(`
      <rect x="12" y="8" width="15" height="11" rx="2.5"/>
      <rect x="37" y="8" width="15" height="11" rx="2.5"/>
      <rect x="6" y="45" width="13" height="11" rx="2.5"/>
      <rect x="25.5" y="45" width="13" height="11" rx="2.5"/>
      <rect x="45" y="45" width="13" height="11" rx="2.5"/>
      <path d="M19.5 19 L12.5 45 M19.5 19 L32 45 M19.5 19 L51.5 45 M44.5 19 L12.5 45 M44.5 19 L32 45 M44.5 19 L51.5 45" stroke-width="2"/>`)
  },
  modem: {
    label: 'Modem',
    color: C.core,
    svg: L(`
      <rect x="8" y="34" width="48" height="16" rx="4"/>
      <path d="M47 34 V19"/>
      <circle cx="47" cy="15.5" r="3"/>`) +
      `<g fill="currentColor"><circle cx="17" cy="42" r="2.2"/><circle cx="26" cy="42" r="2.2"/><circle cx="35" cy="42" r="2.2"/></g>`
  },

  // --- Internet & cloud ---------------------------------------------------
  internet: {
    label: 'Internet',
    color: C.cloud,
    svg: L(`
      <circle cx="32" cy="32" r="23"/>
      <ellipse cx="32" cy="32" rx="10" ry="23"/>
      <path d="M9.5 32 h45 M12.5 20.5 h39 M12.5 43.5 h39"/>`)
  },
  cloud: {
    label: 'Cloud',
    color: C.cloud,
    svg: L(`
      <path d="M18 45 a10 10 0 0 1 -2 -19.6 A14 14 0 0 1 43 21.5 a11 11 0 0 1 5 23.5 z"/>`)
  },
  privatecloud: {
    label: 'Private Cloud',
    color: C.cloud,
    svg: L(`
      <path d="M18 45 a10 10 0 0 1 -2 -19.6 A14 14 0 0 1 43 21.5 a11 11 0 0 1 5 23.5 z"/>
      <rect x="26.5" y="30" width="11" height="8.5" rx="1.5"/>
      <path d="M29 30 v-2.5 a3 3 0 0 1 6 0 V30"/>`)
  },
  cdn: {
    label: 'CDN',
    color: C.cloud,
    svg: L(`
      <circle cx="32" cy="32" r="10"/>
      <path d="M32 22 V12 M40.5 26.5 l9.5 -5.5 M40.5 37.5 l9.5 5.5 M32 42 v10 M23.5 37.5 l-9.5 5.5 M23.5 26.5 l-9.5 -5.5"/>
      <circle cx="32" cy="9.5" r="2.8"/><circle cx="52.5" cy="19" r="2.8"/><circle cx="52.5" cy="45" r="2.8"/>
      <circle cx="32" cy="54.5" r="2.8"/><circle cx="11.5" cy="45" r="2.8"/><circle cx="11.5" cy="19" r="2.8"/>`)
  },
  dns: {
    label: 'DNS',
    color: C.cloud,
    svg: L(`
      <rect x="8" y="16" width="48" height="26" rx="5"/>
      <path d="M16 48 l16 6 M48 48 l-16 6 M32 42 v12"/>`) +
      `<text x="32" y="34" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="13" font-weight="600" fill="currentColor">DNS</text>`
  },
  datacenter: {
    label: 'Data Center',
    color: C.cloud,
    svg: L(`
      <path d="M9 24 L32 11 L55 24"/>
      <path d="M13 24 V53 h38 V24"/>
      <rect x="19" y="30" width="7.5" height="17" rx="1"/>
      <rect x="28.5" y="30" width="7.5" height="17" rx="1"/>
      <rect x="38" y="30" width="7.5" height="17" rx="1"/>
      <path d="M9 53 h46"/>`)
  },

  // --- Compute & storage --------------------------------------------------
  server: {
    label: 'Server',
    color: C.compute,
    svg: L(`
      <rect x="15" y="8" width="34" height="48" rx="4"/>
      <path d="M21 17 h22 M21 26 h22 M21 35 h22"/>`) +
      `<g fill="currentColor"><circle cx="22.5" cy="47" r="2.2"/><circle cx="30" cy="47" r="2.2"/></g>`
  },
  webserver: {
    label: 'Web Server',
    color: C.compute,
    svg: L(`
      <rect x="12" y="8" width="30" height="44" rx="4"/>
      <path d="M18 16 h18 M18 24 h18"/>
      <circle cx="45" cy="44" r="12"/>
      <ellipse cx="45" cy="44" rx="5" ry="12"/>
      <path d="M33.5 44 h23 M35 38 h20 M35 50 h20"/>`)
  },
  mailserver: {
    label: 'Mail Server',
    color: C.compute,
    svg: L(`
      <rect x="12" y="8" width="30" height="44" rx="4"/>
      <path d="M18 16 h18 M18 24 h18"/>
      <rect x="33" y="36" width="24" height="17" rx="2.5"/>
      <path d="M34.5 38 L45 45.5 L55.5 38"/>`)
  },
  database: {
    label: 'Database',
    color: C.compute,
    svg: L(`
      <ellipse cx="32" cy="15.5" rx="17" ry="7"/>
      <path d="M15 15.5 V48 c0 4 7.5 7.5 17 7.5 s17 -3.5 17 -7.5 V15.5"/>
      <path d="M15 27 c0 4 7.5 7.5 17 7.5 s17 -3.5 17 -7.5 M15 38.5 c0 4 7.5 7.5 17 7.5 s17 -3.5 17 -7.5"/>`)
  },
  storage: {
    label: 'Storage / NAS',
    color: C.compute,
    svg: L(`
      <rect x="10" y="12" width="44" height="40" rx="4"/>
      <path d="M10 24.5 h44 M10 37 h44"/>`) +
      `<g fill="currentColor"><circle cx="46" cy="18.5" r="2"/><circle cx="46" cy="31" r="2"/><circle cx="46" cy="44" r="2"/></g>`
  },
  san: {
    label: 'SAN Fabric',
    color: C.compute,
    svg: L(`
      <ellipse cx="20" cy="13.5" rx="10" ry="4.5"/>
      <path d="M10 13.5 V27 c0 2.5 4.5 4.5 10 4.5 s10 -2 10 -4.5 V13.5"/>
      <ellipse cx="44" cy="21.5" rx="10" ry="4.5"/>
      <path d="M34 21.5 V35 c0 2.5 4.5 4.5 10 4.5 s10 -2 10 -4.5 V21.5"/>
      <path d="M20 32 L29 51 M44 40 L35 51"/>
      <rect x="24" y="49" width="16" height="8" rx="2.5"/>`)
  },
  backup: {
    label: 'Backup / Tape',
    color: C.compute,
    svg: L(`
      <rect x="8" y="14" width="48" height="36" rx="4"/>
      <circle cx="22" cy="29" r="6"/><circle cx="42" cy="29" r="6"/>
      <path d="M22 35 h20 M17 43 h30"/>`)
  },
  mainframe: {
    label: 'Mainframe',
    color: C.compute,
    svg: L(`
      <rect x="17" y="6" width="30" height="52" rx="3"/>
      <path d="M23 14 h18 M23 21 h18 M23 28 h18"/>
      <rect x="23" y="35" width="18" height="9" rx="1.5"/>`) +
      `<g fill="currentColor"><circle cx="24.5" cy="51" r="1.8"/><circle cx="31" cy="51" r="1.8"/></g>`
  },
  vm: {
    label: 'Virtual Machine',
    color: C.compute,
    svg: L(`
      <rect x="8" y="10" width="48" height="33" rx="4"/>
      <rect x="17" y="17" width="15" height="12" rx="2"/>
      <rect x="26" y="23" width="15" height="12" rx="2"/>
      <path d="M26 43 v6 M38 43 v6 M19 49 h26"/>`)
  },
  container: {
    label: 'Container',
    color: C.compute,
    svg: L(`
      <rect x="8" y="21" width="48" height="27" rx="3"/>
      <path d="M16 25.5 v18 M24 25.5 v18 M32 25.5 v18 M40 25.5 v18 M48 25.5 v18" stroke-width="2.4"/>
      <path d="M8 21 L14 13 h36 l6 8"/>`)
  },
  cluster: {
    label: 'Cluster',
    color: C.compute,
    svg: L(`
      <circle cx="32" cy="16" r="8"/>
      <circle cx="15" cy="46" r="8"/>
      <circle cx="49" cy="46" r="8"/>
      <path d="M28 23 L18.5 39 M36 23 L45.5 39 M23 46 h18"/>`)
  },

  // --- Wireless & telecom -------------------------------------------------
  wifi: {
    label: 'Wireless AP',
    color: C.wireless,
    svg: L(`
      <path d="M12 27 a28 28 0 0 1 40 0"/>
      <path d="M19 35 a18 18 0 0 1 26 0"/>
      <path d="M26 43 a9 9 0 0 1 12 0"/>`) +
      `<circle cx="32" cy="51" r="4" fill="currentColor"/>`
  },
  wlc: {
    label: 'WLAN Controller',
    color: C.wireless,
    svg: L(`
      <rect x="8" y="35" width="48" height="19" rx="4"/>
      <path d="M15 44.5 h9 M40 44.5 h9 M29.5 40.5 v8 M34.5 40.5 v8"/>
      <path d="M20 25 a17 17 0 0 1 24 0"/>
      <path d="M26 31 a8.5 8.5 0 0 1 12 0"/>`)
  },
  celltower: {
    label: 'Cell Tower',
    color: C.wireless,
    svg: L(`
      <path d="M26 57 L32 14 L38 57"/>
      <path d="M28 45 h8 M29.3 33 h5.4"/>
      <path d="M15 21 a19 19 0 0 1 7 -9.5"/>
      <path d="M49 21 a19 19 0 0 0 -7 -9.5"/>
      <path d="M20 26.5 a12 12 0 0 1 4.5 -6.5"/>
      <path d="M44 26.5 a12 12 0 0 0 -4.5 -6.5"/>`) +
      `<circle cx="32" cy="12" r="3" fill="currentColor"/>`
  },
  satellite: {
    label: 'Satellite Link',
    color: C.wireless,
    svg: L(`
      <path d="M14 33 a19 19 0 0 1 30 -15 L26 45 a19 19 0 0 1 -12 -12 z"/>
      <path d="M29.5 31.5 L43 18"/>
      <path d="M26 45 L22 57 M14 57 h19"/>
      <path d="M48 15 a10 10 0 0 1 3 7 M52 9.5 a16 16 0 0 1 4.5 11"/>`)
  },

  // --- Endpoints ----------------------------------------------------------
  workstation: {
    label: 'Workstation',
    color: C.endpoint,
    svg: L(`
      <rect x="10" y="10" width="44" height="30" rx="3"/>
      <path d="M27 40 v7 M37 40 v7 M19 47 h26"/>`)
  },
  laptop: {
    label: 'Laptop',
    color: C.endpoint,
    svg: L(`
      <rect x="14" y="13" width="36" height="26" rx="3"/>
      <path d="M10 46 l4 -7 M54 46 l-4 -7 M8 46 h48"/>`)
  },
  tablet: {
    label: 'Tablet',
    color: C.endpoint,
    svg: L(`
      <rect x="17" y="7" width="30" height="50" rx="5"/>
      <path d="M28 50 h8"/>`)
  },
  mobile: {
    label: 'Mobile',
    color: C.endpoint,
    svg: L(`
      <rect x="22" y="7" width="20" height="50" rx="5"/>
      <path d="M29 51 h6"/>`)
  },
  phone: {
    label: 'IP Phone',
    color: C.endpoint,
    svg: L(`
      <rect x="8" y="22" width="48" height="28" rx="5"/>
      <rect x="14" y="28" width="16" height="11" rx="1.5"/>
      <path d="M13 22 a25 11 0 0 1 38 0"/>
      <path d="M37 30 h4 M45 30 h4 M37 36 h4 M45 36 h4 M37 42 h4 M45 42 h4" stroke-width="2.6"/>`)
  },
  printer: {
    label: 'Printer',
    color: C.endpoint,
    svg: L(`
      <path d="M18 22 V11 h28 v11"/>
      <rect x="10" y="22" width="44" height="19" rx="3"/>
      <rect x="18" y="35" width="28" height="17" rx="2"/>
      <path d="M23 42 h18 M23 47 h12"/>`) +
      `<circle cx="47" cy="28" r="1.8" fill="currentColor"/>`
  },
  scanner: {
    label: 'Scanner',
    color: C.endpoint,
    svg: L(`
      <path d="M9 40 L21 27 h34 l-4 13"/>
      <rect x="9" y="40" width="46" height="12" rx="3"/>
      <path d="M15 34 h34"/>`) +
      `<circle cx="48" cy="46" r="1.8" fill="currentColor"/>`
  },
  camera: {
    label: 'IP Camera',
    color: C.endpoint,
    svg: L(`
      <rect x="7" y="19" width="37" height="17" rx="4" transform="rotate(-8 25 27)"/>
      <circle cx="41" cy="24" r="4"/>
      <path d="M18 39 v8 h-8 M6 52 h18"/>`)
  },
  tv: {
    label: 'Display / TV',
    color: C.endpoint,
    svg: L(`
      <rect x="7" y="12" width="50" height="32" rx="3"/>
      <path d="M26 51 l3 -7 M38 51 l-3 -7 M20 51 h24"/>`)
  },
  pos: {
    label: 'POS Terminal',
    color: C.endpoint,
    svg: L(`
      <path d="M17 10 h30 v13 l4 10 v19 H13 V33 l4 -10 z"/>
      <rect x="22" y="15" width="20" height="8" rx="1.5"/>
      <path d="M20 38 h6 M29 38 h6 M38 38 h6 M20 45 h6 M29 45 h6 M38 45 h6" stroke-width="2.6"/>`)
  },
  iot: {
    label: 'IoT Device',
    color: C.endpoint,
    svg: L(`
      <rect x="17" y="17" width="24" height="24" rx="4"/>
      <path d="M22 17 V10 M29 17 V10 M36 17 V10 M22 41 v7 M29 41 v7 M36 41 v7 M17 22 h-7 M17 29 h-7 M17 36 h-7" stroke-width="2.6"/>
      <path d="M46 25 a9 9 0 0 1 0 12 M51 20 a16 16 0 0 1 0 22"/>`)
  },

  // --- People & security --------------------------------------------------
  user: {
    label: 'User',
    color: C.people,
    svg: L(`
      <circle cx="32" cy="20" r="11"/>
      <path d="M12 55 a20 20 0 0 1 40 0"/>`)
  },
  usergroup: {
    label: 'User Group',
    color: C.people,
    svg: L(`
      <circle cx="24" cy="21" r="10"/>
      <path d="M7 54 a17 17 0 0 1 34 0"/>
      <path d="M44 12.5 a9.5 9.5 0 0 1 0 19"/>
      <path d="M46 38 a17 17 0 0 1 11 16"/>`)
  },
  admin: {
    label: 'Admin',
    color: C.people,
    svg: L(`
      <circle cx="27" cy="19" r="10.5"/>
      <path d="M8 53 a19 19 0 0 1 33 -13"/>
      <circle cx="47" cy="44" r="8"/>
      <path d="M47 33.5 v3 M47 54.5 v-3 M36.5 44 h3 M57.5 44 h-3 M39.6 36.6 l2.1 2.1 M54.4 51.4 l-2.1 -2.1 M39.6 51.4 l2.1 -2.1 M54.4 36.6 l-2.1 2.1" stroke-width="2.6"/>`)
  },
  shield: {
    label: 'Security',
    color: C.shield,
    svg: L(`
      <path d="M32 7 L53 14.5 v15.5 c0 13 -8.5 21.5 -21 27 C19.5 51.5 11 43 11 30 V14.5 z"/>
      <path d="M23 31.5 l6.5 6.5 12 -13"/>`)
  }
};

// Palette organization. Every icon must appear in exactly one category.
const ICON_CATEGORIES = [
  { name: 'Core Network',
    types: ['router', 'l3switch', 'switch', 'hub', 'firewall', 'loadbalancer',
            'proxy', 'vpn', 'ids', 'gateway', 'aci', 'modem'] },
  { name: 'Internet & Cloud',
    types: ['internet', 'cloud', 'privatecloud', 'cdn', 'dns', 'datacenter'] },
  { name: 'Compute & Storage',
    types: ['server', 'webserver', 'mailserver', 'database', 'storage', 'san',
            'backup', 'mainframe', 'vm', 'container', 'cluster'] },
  { name: 'Wireless & Telecom',
    types: ['wifi', 'wlc', 'celltower', 'satellite'] },
  { name: 'Endpoints',
    types: ['workstation', 'laptop', 'tablet', 'mobile', 'phone', 'printer',
            'scanner', 'camera', 'tv', 'pos', 'iot'] },
  { name: 'People & Security',
    types: ['user', 'usergroup', 'admin', 'shield'] }
];

// Flat list, kept for anything that just needs "all icons in order".
const ICON_ORDER = ICON_CATEGORIES.flatMap(c => c.types);
