/*
 * Network icon library.
 *
 * Every icon is plain inline SVG drawn in a 64x64 viewBox. Because they are
 * vectors (not PNG files), they scale losslessly, can be recolored per-node,
 * and serialize directly into the SVG / PNG / PDF exports with zero extra
 * asset loading. To add a new device type, add one entry here and list it
 * in a category — the palette, parser, and exporters pick it up
 * automatically. Vendor stencils (Cisco, AWS, Azure architecture icons)
 * can be pasted in using the same format.
 *
 * Convention: use `currentColor` for the accent color so a node's custom
 * color flows into the icon, and white/neutral fills for detail.
 */

const NETWORK_ICONS = {
  // --- Core network -------------------------------------------------------
  router: {
    label: 'Router',
    color: '#2563eb',
    svg: `
      <circle cx="32" cy="32" r="26" fill="currentColor"/>
      <circle cx="32" cy="32" r="26" fill="#ffffff" opacity="0.12"/>
      <g stroke="#ffffff" stroke-width="4" stroke-linecap="round" fill="none">
        <path d="M20 26 h16"/><path d="M31 20 l7 6 -7 6"/>
        <path d="M44 38 h-16"/><path d="M33 32 l-7 6 7 6"/>
      </g>`
  },
  l3switch: {
    label: 'L3 Switch',
    color: '#1d4ed8',
    svg: `
      <rect x="8" y="18" width="48" height="28" rx="6" fill="currentColor"/>
      <g stroke="#ffffff" stroke-width="3" stroke-linecap="round" fill="none">
        <path d="M15 27 h12"/><path d="M23 23.5 l5 3.5 -5 3.5"/>
        <path d="M49 37 h-12"/><path d="M41 33.5 l-5 3.5 5 3.5"/>
        <path d="M36 22 l4 -0 M40 22 l0 4"/><path d="M40 22 l-6 6"/>
        <path d="M28 42 l-4 0 M24 42 l0 -4"/><path d="M24 42 l6 -6"/>
      </g>`
  },
  switch: {
    label: 'Switch',
    color: '#0891b2',
    svg: `
      <rect x="6" y="20" width="52" height="24" rx="5" fill="currentColor"/>
      <g stroke="#ffffff" stroke-width="3.5" stroke-linecap="round" fill="none">
        <path d="M14 28 h14"/><path d="M24 24 l5 4 -5 4"/>
        <path d="M50 36 h-14"/><path d="M40 32 l-5 4 5 4"/>
      </g>`
  },
  hub: {
    label: 'Hub',
    color: '#0e7490',
    svg: `
      <g stroke="currentColor" stroke-width="3" stroke-linecap="round">
        <path d="M32 32 L32 10 M32 32 L51 21 M32 32 L51 43 M32 32 L32 54 M32 32 L13 43 M32 32 L13 21"/>
      </g>
      <g fill="currentColor">
        <circle cx="32" cy="10" r="4.5"/><circle cx="51" cy="21" r="4.5"/><circle cx="51" cy="43" r="4.5"/>
        <circle cx="32" cy="54" r="4.5"/><circle cx="13" cy="43" r="4.5"/><circle cx="13" cy="21" r="4.5"/>
      </g>
      <circle cx="32" cy="32" r="7" fill="currentColor"/>
      <circle cx="32" cy="32" r="3" fill="#ffffff"/>`
  },
  firewall: {
    label: 'Firewall',
    color: '#dc2626',
    svg: `
      <rect x="8" y="14" width="48" height="36" rx="4" fill="currentColor"/>
      <g stroke="#ffffff" stroke-width="2.5">
        <path d="M8 26 h48 M8 38 h48" fill="none"/>
        <path d="M24 14 v12 M40 14 v12 M16 26 v12 M32 26 v12 M48 26 v12 M24 38 v12 M40 38 v12" fill="none"/>
      </g>`
  },
  loadbalancer: {
    label: 'Load Balancer',
    color: '#d97706',
    svg: `
      <rect x="10" y="10" width="44" height="18" rx="4" fill="currentColor"/>
      <g stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round">
        <path d="M32 28 v8 M32 36 l-16 8 M32 36 v10 M32 36 l16 8"/>
      </g>
      <g fill="currentColor">
        <circle cx="14" cy="50" r="5"/><circle cx="32" cy="52" r="5"/><circle cx="50" cy="50" r="5"/>
      </g>
      <circle cx="18" cy="19" r="3" fill="#ffffff"/>
      <rect x="26" y="16.5" width="20" height="5" rx="2" fill="#ffffff" opacity="0.8"/>`
  },
  proxy: {
    label: 'Proxy',
    color: '#7c2d12',
    svg: `
      <rect x="8" y="16" width="48" height="32" rx="6" fill="currentColor"/>
      <circle cx="32" cy="32" r="6" fill="#ffffff"/>
      <g stroke="#ffffff" stroke-width="3" stroke-linecap="round" fill="none">
        <path d="M13 25 h12"/><path d="M21 21.5 l5 3.5 -5 3.5"/>
        <path d="M51 39 h-12"/><path d="M43 35.5 l-5 3.5 5 3.5"/>
      </g>`
  },
  vpn: {
    label: 'VPN Gateway',
    color: '#b91c1c',
    svg: `
      <rect x="8" y="22" width="48" height="22" rx="5" fill="currentColor"/>
      <g fill="#ffffff">
        <rect x="26" y="29" width="12" height="10" rx="2"/>
        <path d="M28.5 29 v-3 a3.5 3.5 0 0 1 7 0 v3 h-3 v-3 a0.9 0.9 0 0 0 -1 0 v3 z"/>
      </g>
      <g stroke="#ffffff" stroke-width="2.5" stroke-linecap="round">
        <path d="M13 33 h7 M44 33 h7"/>
      </g>`
  },
  ids: {
    label: 'IDS / IPS',
    color: '#be123c',
    svg: `
      <path d="M32 6 L54 14 v16 c0 14 -9 23 -22 28 C19 53 10 44 10 30 V14 z" fill="currentColor"/>
      <path d="M16 32 h8 l4 -9 6 16 4 -7 h10" stroke="#ffffff" stroke-width="3"
            fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
  },
  gateway: {
    label: 'Gateway',
    color: '#4338ca',
    svg: `
      <rect x="10" y="12" width="44" height="40" rx="4" fill="currentColor"/>
      <path d="M22 52 v-18 a10 10 0 0 1 20 0 v18 z" fill="#ffffff" opacity="0.92"/>
      <path d="M26 40 h8" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
      <path d="M31 36 l4 4 -4 4" stroke="currentColor" stroke-width="3" fill="none"
            stroke-linecap="round" stroke-linejoin="round"/>`
  },
  modem: {
    label: 'Modem',
    color: '#374151',
    svg: `
      <rect x="8" y="34" width="48" height="16" rx="5" fill="currentColor"/>
      <g fill="#86efac">
        <circle cx="17" cy="42" r="2.5"/><circle cx="26" cy="42" r="2.5"/>
      </g>
      <circle cx="35" cy="42" r="2.5" fill="#fde047"/>
      <path d="M48 34 V18" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/>
      <circle cx="48" cy="15" r="4" fill="currentColor"/>`
  },

  // --- Internet & cloud ---------------------------------------------------
  internet: {
    label: 'Internet',
    color: '#4f46e5',
    svg: `
      <circle cx="32" cy="32" r="25" fill="currentColor"/>
      <g stroke="#ffffff" stroke-width="2.5" fill="none" opacity="0.9">
        <ellipse cx="32" cy="32" rx="11" ry="25"/>
        <path d="M7 32 h50 M11 19 h42 M11 45 h42"/>
      </g>`
  },
  cloud: {
    label: 'Cloud',
    color: '#0284c7',
    svg: `
      <path d="M18 46 a10 10 0 0 1 -2 -19.8 A14 14 0 0 1 43 22 a11 11 0 0 1 5 24 z"
            fill="currentColor"/>`
  },
  privatecloud: {
    label: 'Private Cloud',
    color: '#0369a1',
    svg: `
      <path d="M18 46 a10 10 0 0 1 -2 -19.8 A14 14 0 0 1 43 22 a11 11 0 0 1 5 24 z"
            fill="currentColor"/>
      <g fill="#ffffff">
        <rect x="26" y="32" width="12" height="9" rx="2"/>
        <path d="M28.5 32 v-2.5 a3.5 3.5 0 0 1 7 0 V32 h-3 v-2.5 a0.9 0.9 0 0 0 -1 0 V32 z"/>
      </g>`
  },
  cdn: {
    label: 'CDN',
    color: '#0891b2',
    svg: `
      <circle cx="32" cy="32" r="12" fill="currentColor"/>
      <g stroke="currentColor" stroke-width="2.5">
        <path d="M32 20 V10 M43 26 l9 -6 M43 38 l9 6 M32 44 v10 M21 38 l-9 6 M21 26 l-9 -6"/>
      </g>
      <g fill="currentColor">
        <circle cx="32" cy="8" r="4"/><circle cx="54" cy="18" r="4"/><circle cx="54" cy="46" r="4"/>
        <circle cx="32" cy="56" r="4"/><circle cx="10" cy="46" r="4"/><circle cx="10" cy="18" r="4"/>
      </g>
      <path d="M25 32 a7 12 0 0 1 14 0 a7 12 0 0 1 -14 0 M25 32 h14" stroke="#ffffff"
            stroke-width="1.8" fill="none"/>`
  },
  dns: {
    label: 'DNS',
    color: '#5b21b6',
    svg: `
      <rect x="8" y="18" width="48" height="28" rx="6" fill="currentColor"/>
      <text x="32" y="38" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif"
            font-size="14" font-weight="700" fill="#ffffff">DNS</text>
      <circle cx="14" cy="52" r="2.5" fill="currentColor"/>
      <circle cx="32" cy="54" r="2.5" fill="currentColor"/>
      <circle cx="50" cy="52" r="2.5" fill="currentColor"/>
      <path d="M15 46 l16 7 M49 46 l-16 7 M32 46 v7" stroke="currentColor" stroke-width="2" fill="none"/>`
  },
  datacenter: {
    label: 'Data Center',
    color: '#1e40af',
    svg: `
      <path d="M8 24 L32 10 L56 24 v4 H8 z" fill="currentColor"/>
      <rect x="12" y="28" width="40" height="26" fill="currentColor" opacity="0.85"/>
      <g fill="#ffffff" opacity="0.9">
        <rect x="17" y="32" width="8" height="18" rx="1"/>
        <rect x="28" y="32" width="8" height="18" rx="1"/>
        <rect x="39" y="32" width="8" height="18" rx="1"/>
      </g>
      <g stroke="currentColor" stroke-width="1.5">
        <path d="M18.5 36 h5 M18.5 40 h5 M29.5 36 h5 M29.5 40 h5 M40.5 36 h5 M40.5 40 h5"/>
      </g>
      <rect x="8" y="54" width="48" height="3" rx="1.5" fill="currentColor"/>`
  },

  // --- Compute & storage --------------------------------------------------
  server: {
    label: 'Server',
    color: '#7c3aed',
    svg: `
      <rect x="14" y="8" width="36" height="48" rx="4" fill="currentColor"/>
      <g fill="#ffffff">
        <rect x="20" y="15" width="24" height="5" rx="2" opacity="0.9"/>
        <rect x="20" y="25" width="24" height="5" rx="2" opacity="0.9"/>
        <rect x="20" y="35" width="24" height="5" rx="2" opacity="0.9"/>
        <circle cx="23" cy="48" r="2.5"/>
        <circle cx="31" cy="48" r="2.5" opacity="0.6"/>
      </g>`
  },
  webserver: {
    label: 'Web Server',
    color: '#6d28d9',
    svg: `
      <rect x="12" y="8" width="32" height="46" rx="4" fill="currentColor"/>
      <g fill="#ffffff" opacity="0.9">
        <rect x="17" y="14" width="22" height="5" rx="2"/>
        <rect x="17" y="23" width="22" height="5" rx="2"/>
      </g>
      <circle cx="45" cy="44" r="13" fill="currentColor"/>
      <circle cx="45" cy="44" r="13" fill="#ffffff" opacity="0.18"/>
      <g stroke="#ffffff" stroke-width="1.8" fill="none">
        <circle cx="45" cy="44" r="9.5"/>
        <ellipse cx="45" cy="44" rx="4.2" ry="9.5"/>
        <path d="M35.5 44 h19 M37 39 h16 M37 49 h16"/>
      </g>`
  },
  mailserver: {
    label: 'Mail Server',
    color: '#9333ea',
    svg: `
      <rect x="12" y="8" width="32" height="46" rx="4" fill="currentColor"/>
      <g fill="#ffffff" opacity="0.9">
        <rect x="17" y="14" width="22" height="5" rx="2"/>
        <rect x="17" y="23" width="22" height="5" rx="2"/>
      </g>
      <rect x="32" y="36" width="26" height="18" rx="3" fill="currentColor"/>
      <rect x="32" y="36" width="26" height="18" rx="3" fill="#ffffff" opacity="0.16"/>
      <path d="M33.5 38 L45 46.5 L56.5 38" stroke="#ffffff" stroke-width="2.2" fill="none"
            stroke-linecap="round" stroke-linejoin="round"/>`
  },
  database: {
    label: 'Database',
    color: '#059669',
    svg: `
      <path d="M14 16 v32 c0 5 8 9 18 9 s18 -4 18 -9 V16" fill="currentColor"/>
      <ellipse cx="32" cy="16" rx="18" ry="8" fill="currentColor"/>
      <ellipse cx="32" cy="16" rx="18" ry="8" fill="#ffffff" opacity="0.3"/>
      <path d="M14 28 c0 5 8 9 18 9 s18 -4 18 -9 M14 40 c0 5 8 9 18 9 s18 -4 18 -9"
            stroke="#ffffff" stroke-width="2.5" fill="none" opacity="0.7"/>`
  },
  storage: {
    label: 'Storage / NAS',
    color: '#065f46',
    svg: `
      <rect x="10" y="12" width="44" height="40" rx="4" fill="currentColor"/>
      <g fill="#ffffff" opacity="0.9">
        <rect x="15" y="18" width="34" height="7" rx="2"/>
        <rect x="15" y="28.5" width="34" height="7" rx="2"/>
        <rect x="15" y="39" width="34" height="7" rx="2"/>
      </g>
      <g fill="currentColor">
        <circle cx="45" cy="21.5" r="1.8"/><circle cx="45" cy="32" r="1.8"/><circle cx="45" cy="42.5" r="1.8"/>
      </g>`
  },
  san: {
    label: 'SAN Fabric',
    color: '#047857',
    svg: `
      <path d="M10 14 v14 c0 3 5 5.5 11 5.5 s11 -2.5 11 -5.5 V14" fill="currentColor"/>
      <ellipse cx="21" cy="14" rx="11" ry="5" fill="currentColor"/>
      <ellipse cx="21" cy="14" rx="11" ry="5" fill="#ffffff" opacity="0.3"/>
      <path d="M32 22 v14 c0 3 5 5.5 11 5.5 s11 -2.5 11 -5.5 V22" fill="currentColor"/>
      <ellipse cx="43" cy="22" rx="11" ry="5" fill="currentColor"/>
      <ellipse cx="43" cy="22" rx="11" ry="5" fill="#ffffff" opacity="0.3"/>
      <g stroke="currentColor" stroke-width="2.5" fill="none">
        <path d="M21 34 L28 52 M43 42 L36 52"/>
      </g>
      <rect x="24" y="50" width="16" height="8" rx="2.5" fill="currentColor"/>`
  },
  backup: {
    label: 'Backup / Tape',
    color: '#115e59',
    svg: `
      <rect x="8" y="14" width="48" height="36" rx="5" fill="currentColor"/>
      <g fill="#ffffff">
        <circle cx="22" cy="30" r="7"/><circle cx="42" cy="30" r="7"/>
      </g>
      <g fill="currentColor">
        <circle cx="22" cy="30" r="2.8"/><circle cx="42" cy="30" r="2.8"/>
      </g>
      <path d="M22 37 h20" stroke="#ffffff" stroke-width="2.5"/>
      <rect x="16" y="42" width="32" height="5" rx="2" fill="#ffffff" opacity="0.7"/>`
  },
  mainframe: {
    label: 'Mainframe',
    color: '#3730a3',
    svg: `
      <rect x="16" y="6" width="32" height="52" rx="3" fill="currentColor"/>
      <g fill="#ffffff" opacity="0.85">
        <rect x="21" y="11" width="22" height="3" rx="1.5"/>
        <rect x="21" y="17" width="22" height="3" rx="1.5"/>
        <rect x="21" y="23" width="22" height="3" rx="1.5"/>
      </g>
      <rect x="21" y="31" width="22" height="10" rx="2" fill="#93c5fd"/>
      <g fill="#ffffff">
        <circle cx="24" cy="48" r="2"/><circle cx="31" cy="48" r="2" opacity="0.6"/>
        <circle cx="38" cy="48" r="2" opacity="0.35"/>
      </g>`
  },
  vm: {
    label: 'Virtual Machine',
    color: '#6366f1',
    svg: `
      <rect x="8" y="10" width="48" height="34" rx="4" fill="currentColor"/>
      <rect x="12" y="14" width="40" height="26" rx="2" fill="#e0e7ff"/>
      <rect x="18" y="19" width="17" height="13" rx="2" fill="currentColor" opacity="0.55"/>
      <rect x="26" y="24" width="17" height="13" rx="2" fill="currentColor"/>
      <rect x="26" y="44" width="12" height="5" fill="currentColor"/>
      <rect x="18" y="49" width="28" height="5" rx="2" fill="currentColor"/>`
  },
  container: {
    label: 'Container',
    color: '#0ea5e9',
    svg: `
      <rect x="8" y="20" width="48" height="28" rx="3" fill="currentColor"/>
      <g stroke="#ffffff" stroke-width="2.5" opacity="0.85">
        <path d="M16 24 v20 M24 24 v20 M32 24 v20 M40 24 v20 M48 24 v20"/>
      </g>
      <path d="M8 20 L14 12 h36 l6 8" fill="none" stroke="currentColor" stroke-width="3"/>`
  },
  cluster: {
    label: 'Cluster',
    color: '#2dd4bf',
    svg: `
      <g stroke="currentColor" stroke-width="3">
        <path d="M32 18 L16 44 M32 18 L48 44 M16 44 L48 44"/>
      </g>
      <g fill="currentColor">
        <circle cx="32" cy="16" r="9"/><circle cx="15" cy="46" r="9"/><circle cx="49" cy="46" r="9"/>
      </g>
      <g fill="#ffffff">
        <circle cx="32" cy="16" r="3.2"/><circle cx="15" cy="46" r="3.2"/><circle cx="49" cy="46" r="3.2"/>
      </g>`
  },

  // --- Wireless & telecom -------------------------------------------------
  wifi: {
    label: 'Wireless AP',
    color: '#0d9488',
    svg: `
      <g stroke="currentColor" stroke-width="4" fill="none" stroke-linecap="round">
        <path d="M12 26 a28 28 0 0 1 40 0"/>
        <path d="M19 34 a18 18 0 0 1 26 0"/>
        <path d="M26 42 a9 9 0 0 1 12 0"/>
      </g>
      <circle cx="32" cy="50" r="6" fill="currentColor"/>`
  },
  wlc: {
    label: 'WLAN Controller',
    color: '#0f766e',
    svg: `
      <rect x="8" y="34" width="48" height="20" rx="5" fill="currentColor"/>
      <g stroke="#ffffff" stroke-width="3" stroke-linecap="round" fill="none">
        <path d="M15 44 h10"/><path d="M39 44 h10"/><path d="M29 40 v8"/><path d="M35 40 v8"/>
      </g>
      <g stroke="currentColor" stroke-width="3.5" fill="none" stroke-linecap="round">
        <path d="M20 24 a17 17 0 0 1 24 0"/>
        <path d="M26 30 a8.5 8.5 0 0 1 12 0"/>
      </g>`
  },
  celltower: {
    label: 'Cell Tower',
    color: '#ca8a04',
    svg: `
      <g stroke="currentColor" stroke-width="3" stroke-linecap="round" fill="none">
        <path d="M26 58 L32 14 L38 58"/>
        <path d="M27.5 46 h9 M28.8 34 h6.4"/>
        <path d="M14 20 a20 20 0 0 1 8 -10"/>
        <path d="M50 20 a20 20 0 0 0 -8 -10"/>
        <path d="M19 26 a13 13 0 0 1 5 -7"/>
        <path d="M45 26 a13 13 0 0 0 -5 -7"/>
      </g>
      <circle cx="32" cy="12" r="4" fill="currentColor"/>`
  },
  satellite: {
    label: 'Satellite Link',
    color: '#a16207',
    svg: `
      <path d="M14 34 a20 20 0 0 1 32 -16 L26 46 a20 20 0 0 1 -12 -12 z" fill="currentColor"/>
      <circle cx="30" cy="32" r="4" fill="#ffffff"/>
      <path d="M30 32 L44 18" stroke="#ffffff" stroke-width="2.5"/>
      <path d="M26 46 L22 58 M14 58 h20" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" fill="none"/>
      <g fill="currentColor">
        <circle cx="50" cy="12" r="2.2"/><circle cx="55" cy="17" r="2.2"/><circle cx="58" cy="24" r="2.2"/>
      </g>`
  },

  // --- Endpoints ----------------------------------------------------------
  workstation: {
    label: 'Workstation',
    color: '#334155',
    svg: `
      <rect x="10" y="10" width="44" height="30" rx="3" fill="currentColor"/>
      <rect x="14" y="14" width="36" height="22" rx="1.5" fill="#dbeafe"/>
      <rect x="27" y="40" width="10" height="7" fill="currentColor"/>
      <rect x="18" y="47" width="28" height="5" rx="2" fill="currentColor"/>`
  },
  laptop: {
    label: 'Laptop',
    color: '#475569',
    svg: `
      <rect x="14" y="14" width="36" height="26" rx="3" fill="currentColor"/>
      <rect x="17.5" y="17.5" width="29" height="19" rx="1.5" fill="#e0f2fe"/>
      <path d="M10 46 l4 -6 h36 l4 6 a2 2 0 0 1 -2 3 H12 a2 2 0 0 1 -2 -3 z" fill="currentColor"/>`
  },
  tablet: {
    label: 'Tablet',
    color: '#52525b',
    svg: `
      <rect x="16" y="6" width="32" height="52" rx="5" fill="currentColor"/>
      <rect x="20" y="12" width="24" height="38" rx="2" fill="#e4e4e7"/>
      <circle cx="32" cy="54" r="2.5" fill="#ffffff"/>`
  },
  mobile: {
    label: 'Mobile',
    color: '#7c3aed',
    svg: `
      <rect x="22" y="6" width="20" height="52" rx="5" fill="currentColor"/>
      <rect x="25" y="12" width="14" height="38" rx="2" fill="#ede9fe"/>
      <rect x="28" y="8.2" width="8" height="2" rx="1" fill="#ffffff" opacity="0.8"/>
      <circle cx="32" cy="54" r="2" fill="#ffffff"/>`
  },
  phone: {
    label: 'IP Phone',
    color: '#1d4ed8',
    svg: `
      <rect x="8" y="20" width="48" height="30" rx="5" fill="currentColor"/>
      <rect x="13" y="25" width="18" height="12" rx="2" fill="#dbeafe"/>
      <g fill="#ffffff" opacity="0.9">
        <circle cx="39" cy="28" r="2"/><circle cx="46" cy="28" r="2"/><circle cx="53" cy="28" r="2" opacity="0"/>
        <circle cx="39" cy="34" r="2"/><circle cx="46" cy="34" r="2"/>
        <circle cx="39" cy="40" r="2"/><circle cx="46" cy="40" r="2"/>
      </g>
      <path d="M12 20 a24 10 0 0 1 40 0" fill="none" stroke="currentColor" stroke-width="3.5"/>`
  },
  printer: {
    label: 'Printer',
    color: '#57534e',
    svg: `
      <rect x="18" y="10" width="28" height="12" rx="2" fill="currentColor" opacity="0.6"/>
      <rect x="10" y="22" width="44" height="20" rx="4" fill="currentColor"/>
      <circle cx="46" cy="28" r="2.5" fill="#86efac"/>
      <rect x="18" y="36" width="28" height="16" rx="2" fill="#f1f5f9" stroke="currentColor" stroke-width="2"/>
      <path d="M22 42 h20 M22 47 h14" stroke="#94a3b8" stroke-width="2" stroke-linecap="round"/>`
  },
  scanner: {
    label: 'Scanner',
    color: '#78716c',
    svg: `
      <path d="M8 40 L20 26 h36 l-4 14 z" fill="currentColor" opacity="0.55"/>
      <rect x="8" y="40" width="48" height="12" rx="3" fill="currentColor"/>
      <path d="M14 33 L50 33" stroke="#fbbf24" stroke-width="3" stroke-linecap="round"/>
      <circle cx="49" cy="46" r="2.2" fill="#86efac"/>`
  },
  camera: {
    label: 'IP Camera',
    color: '#404040',
    svg: `
      <rect x="6" y="20" width="38" height="18" rx="5" fill="currentColor" transform="rotate(-8 25 29)"/>
      <circle cx="42" cy="25" r="5.5" fill="#93c5fd"/>
      <circle cx="42" cy="25" r="2.2" fill="currentColor"/>
      <path d="M18 40 v8 h-8" stroke="currentColor" stroke-width="3.5" fill="none" stroke-linecap="round"/>
      <rect x="4" y="48" width="18" height="5" rx="2.5" fill="currentColor"/>`
  },
  tv: {
    label: 'Display / TV',
    color: '#27272a',
    svg: `
      <rect x="6" y="12" width="52" height="32" rx="3" fill="currentColor"/>
      <rect x="9" y="15" width="46" height="26" rx="1.5" fill="#bfdbfe"/>
      <path d="M24 52 l4 -8 h8 l4 8 z" fill="currentColor"/>
      <rect x="18" y="52" width="28" height="4" rx="2" fill="currentColor"/>`
  },
  pos: {
    label: 'POS Terminal',
    color: '#166534',
    svg: `
      <path d="M16 10 h32 v14 l4 10 v18 H12 V34 l4 -10 z" fill="currentColor"/>
      <rect x="20" y="14" width="24" height="9" rx="2" fill="#bbf7d0"/>
      <g fill="#ffffff" opacity="0.9">
        <rect x="19" y="37" width="7" height="4.5" rx="1"/><rect x="28.5" y="37" width="7" height="4.5" rx="1"/><rect x="38" y="37" width="7" height="4.5" rx="1"/>
        <rect x="19" y="44" width="7" height="4.5" rx="1"/><rect x="28.5" y="44" width="7" height="4.5" rx="1"/><rect x="38" y="44" width="7" height="4.5" rx="1"/>
      </g>`
  },
  iot: {
    label: 'IoT Device',
    color: '#65a30d',
    svg: `
      <rect x="16" y="16" width="26" height="26" rx="5" fill="currentColor"/>
      <rect x="22" y="22" width="14" height="14" rx="2" fill="#ffffff" opacity="0.85"/>
      <g stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
        <path d="M21 16 V9 M29 16 V9 M37 16 V9 M21 42 v7 M29 42 v7 M37 42 v7 M16 21 H9 M16 29 H9 M16 37 H9"/>
      </g>
      <g stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round">
        <path d="M46 26 a9 9 0 0 1 0 12"/>
        <path d="M51 21 a16 16 0 0 1 0 22"/>
      </g>`
  },

  // --- People & security --------------------------------------------------
  user: {
    label: 'User',
    color: '#9333ea',
    svg: `
      <circle cx="32" cy="20" r="12" fill="currentColor"/>
      <path d="M10 56 a22 22 0 0 1 44 0 z" fill="currentColor"/>`
  },
  usergroup: {
    label: 'User Group',
    color: '#7e22ce',
    svg: `
      <circle cx="22" cy="22" r="10" fill="currentColor" opacity="0.55"/>
      <path d="M4 52 a18 18 0 0 1 36 0 z" fill="currentColor" opacity="0.55"/>
      <circle cx="40" cy="20" r="11" fill="currentColor"/>
      <path d="M20 54 a20 20 0 0 1 40 0 z" fill="currentColor"/>`
  },
  admin: {
    label: 'Admin',
    color: '#c026d3',
    svg: `
      <circle cx="28" cy="20" r="12" fill="currentColor"/>
      <path d="M6 56 a22 22 0 0 1 44 0 z" fill="currentColor"/>
      <g transform="translate(47,41)">
        <circle r="10" fill="currentColor"/>
        <g stroke="currentColor" stroke-width="3.5" stroke-linecap="round">
          <path d="M0 -13 V-10 M0 13 V10 M-13 0 H-10 M13 0 H10 M-9.2 -9.2 L-7 -7 M9.2 9.2 L7 7 M-9.2 9.2 L-7 7 M9.2 -9.2 L7 -7"/>
        </g>
        <circle r="4" fill="#ffffff"/>
      </g>`
  },
  shield: {
    label: 'Security',
    color: '#15803d',
    svg: `
      <path d="M32 6 L54 14 v16 c0 14 -9 23 -22 28 C19 53 10 44 10 30 V14 z" fill="currentColor"/>
      <path d="M22 32 l7 7 13 -14" stroke="#ffffff" stroke-width="4.5" fill="none"
            stroke-linecap="round" stroke-linejoin="round"/>`
  }
};

// Palette organization. Every icon must appear in exactly one category.
const ICON_CATEGORIES = [
  { name: 'Core Network',
    types: ['router', 'l3switch', 'switch', 'hub', 'firewall', 'loadbalancer',
            'proxy', 'vpn', 'ids', 'gateway', 'modem'] },
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
