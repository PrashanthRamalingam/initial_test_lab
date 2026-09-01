/*
 * Network icon library.
 *
 * Every icon is plain inline SVG drawn in a 64x64 viewBox. Because they are
 * vectors (not PNG files), they scale losslessly, can be recolored per-node,
 * and serialize directly into the SVG / PNG / PDF exports with zero extra
 * asset loading. To add a new device type, add one entry here — the palette
 * and the editor pick it up automatically.
 *
 * Convention: use `currentColor` for the accent color so a node's custom
 * color flows into the icon, and neutral grays for chassis/body strokes.
 */

const NETWORK_ICONS = {
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
  cloud: {
    label: 'Cloud',
    color: '#0284c7',
    svg: `
      <path d="M18 46 a10 10 0 0 1 -2 -19.8 A14 14 0 0 1 43 22 a11 11 0 0 1 5 24 z"
            fill="currentColor"/>`
  },
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
  laptop: {
    label: 'Laptop',
    color: '#475569',
    svg: `
      <rect x="14" y="14" width="36" height="26" rx="3" fill="currentColor"/>
      <rect x="17.5" y="17.5" width="29" height="19" rx="1.5" fill="#e0f2fe"/>
      <path d="M10 46 l4 -6 h36 l4 6 a2 2 0 0 1 -2 3 H12 a2 2 0 0 1 -2 -3 z" fill="currentColor"/>`
  },
  workstation: {
    label: 'Workstation',
    color: '#334155',
    svg: `
      <rect x="10" y="10" width="44" height="30" rx="3" fill="currentColor"/>
      <rect x="14" y="14" width="36" height="22" rx="1.5" fill="#dbeafe"/>
      <rect x="27" y="40" width="10" height="7" fill="currentColor"/>
      <rect x="18" y="47" width="28" height="5" rx="2" fill="currentColor"/>`
  },
  user: {
    label: 'User',
    color: '#9333ea',
    svg: `
      <circle cx="32" cy="20" r="12" fill="currentColor"/>
      <path d="M10 56 a22 22 0 0 1 44 0 z" fill="currentColor"/>`
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
  phone: {
    label: 'IP Phone',
    color: '#1d4ed8',
    svg: `
      <rect x="20" y="6" width="24" height="52" rx="5" fill="currentColor"/>
      <rect x="24" y="12" width="16" height="28" rx="2" fill="#dbeafe"/>
      <circle cx="32" cy="49" r="4" fill="#ffffff" opacity="0.85"/>`
  }
};

// Order shown in the palette.
const ICON_ORDER = [
  'internet', 'cloud', 'router', 'switch', 'firewall', 'loadbalancer',
  'server', 'database', 'storage', 'vpn', 'wifi',
  'workstation', 'laptop', 'phone', 'printer', 'user'
];
