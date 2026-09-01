/*
 * NetDraw — SVG network diagram editor.
 *
 * Architecture: a single `state` object (nodes + edges) is the source of
 * truth. Every mutation goes through render(), which redraws the SVG scene
 * from state. Exports (export.js) read the same state / SVG, so what you
 * see is exactly what you download.
 */

'use strict';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const NODE_W = 96;          // node hit-box width
const NODE_H = 96;          // icon + label
const ICON_SIZE = 60;
const GRID = 8;             // snap grid

let state = {
  nodes: [],   // {id, type, x, y, label, sub?, color} — sub = detail line (IP, VLAN…)
  edges: [],   // {id, from, to, label, fromLabel?, toLabel?, style, shape}
  zones: [],   // {id, x, y, w, h, label, color} — named container boxes (DCs, sites)
  notes: [],   // {id, x, y, w, h, text, color} — free-text annotation blocks
  bg: null,    // custom canvas background color, null = theme default
  counter: 1
};

let selection = null;        // {kind:'node'|'edge', id}
let mode = 'select';         // 'select' | 'connect'
let connectSource = null;    // node id while connecting
let undoStack = [];
let redoStack = [];
let view = { x: 0, y: 0, zoom: 1 };

const svg = document.getElementById('canvas');
const scene = document.getElementById('scene');
const zoneLayer = document.getElementById('zone-layer');
const edgeLayer = document.getElementById('edge-layer');
const nodeLayer = document.getElementById('node-layer');
const noteLayer = document.getElementById('note-layer');
const overlayLayer = document.getElementById('overlay-layer');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const $ = (sel) => document.querySelector(sel);
const uid = (p) => p + (state.counter++);
const snap = (v) => Math.round(v / GRID) * GRID;
const nodeById = (id) => state.nodes.find(n => n.id === id);
const zoneById = (id) => (state.zones || []).find(z => z.id === id);

// Older saved diagrams predate zones/notes/bg — normalize after any swap.
function normalizeState() {
  if (!Array.isArray(state.zones)) state.zones = [];
  if (!Array.isArray(state.notes)) state.notes = [];
  if (!state.customIcons || typeof state.customIcons !== 'object') state.customIcons = {};
  if (state.bg === undefined) state.bg = null;
}
const noteById = (id) => (state.notes || []).find(n => n.id === id);

// A node whose icon type is unknown (older file, missing import) still
// renders — as a generic server — instead of crashing.
const iconFor = (type) => NETWORK_ICONS[type] || NETWORK_ICONS.server;

// Imported (vendor) icons live in state.customIcons so they travel with
// saved files and share links; register them into the icon table.
function registerCustomIcons() {
  for (const [key, ic] of Object.entries(state.customIcons || {})) {
    if (ic && ic.svg) NETWORK_ICONS[key] = ic;
  }
}

function toScene(evt) {
  // Convert a mouse event to scene (diagram) coordinates, honoring pan/zoom.
  const r = svg.getBoundingClientRect();
  return {
    x: (evt.clientX - r.left - view.x) / view.zoom,
    y: (evt.clientY - r.top - view.y) / view.zoom
  };
}

function pushUndo() {
  undoStack.push(JSON.stringify(state));
  if (undoStack.length > 100) undoStack.shift();
  redoStack = [];
}

function setStatus(msg) { $('#status').textContent = msg; }

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

function render() {
  registerCustomIcons();
  scene.setAttribute('transform', `translate(${view.x},${view.y}) scale(${view.zoom})`);
  svg.style.background = state.bg || '';
  // On small screens the properties panel is a bottom sheet shown only
  // while something is selected (see the media query in styles.css).
  document.body.classList.toggle('has-selection', !!selection);
  renderZones();
  renderEdges();
  renderNodes();
  renderNotes();
  renderProperties();
  saveLocal();
}

function nodeCenter(n) { return { x: n.x + NODE_W / 2, y: n.y + ICON_SIZE / 2 + 10 }; }

// Point where the edge meets the icon's edge — lines touch the device with
// no visible gap, without running underneath it.
function clipToNode(n, towards) {
  const c = nodeCenter(n);
  const hw = ICON_SIZE / 2 + 2, hh = ICON_SIZE / 2 + 2;
  const dx = towards.x - c.x, dy = towards.y - c.y;
  if (dx === 0 && dy === 0) return c;
  const sx = hw / Math.abs(dx || 1e-9), sy = hh / Math.abs(dy || 1e-9);
  const s = Math.min(sx, sy);
  return { x: c.x + dx * s, y: c.y + dy * s };
}

function edgePath(e) {
  const a = nodeById(e.from), b = nodeById(e.to);
  if (!a || !b) return null;
  const ca = nodeCenter(a), cb = nodeCenter(b);
  if (e.shape === 'elbow') {
    // Route along the dominant direction so connections terminate on the
    // facing side of each icon: vertical flows leave the bottom of one
    // node and enter the top of the next (and vice versa), horizontal
    // flows use the left/right sides.
    if (Math.abs(cb.y - ca.y) >= Math.abs(cb.x - ca.x)) {
      const p1 = clipToNode(a, { x: ca.x, y: cb.y });
      const p2 = clipToNode(b, { x: cb.x, y: ca.y });
      const midY = (p1.y + p2.y) / 2;
      return {
        d: `M ${p1.x} ${p1.y} L ${p1.x} ${midY} L ${p2.x} ${midY} L ${p2.x} ${p2.y}`,
        mid: { x: (p1.x + p2.x) / 2, y: midY },
        lerp: t => ({ x: p1.x + (p2.x - p1.x) * t, y: midY }),
        endA: { x: p1.x, y: p1.y + 22 * Math.sign(midY - p1.y || 1) },
        endB: { x: p2.x, y: p2.y + 22 * Math.sign(midY - p2.y || -1) }
      };
    }
    const p1 = clipToNode(a, { x: cb.x, y: ca.y });
    const p2 = clipToNode(b, { x: ca.x, y: cb.y });
    const midX = (p1.x + p2.x) / 2;
    return {
      d: `M ${p1.x} ${p1.y} L ${midX} ${p1.y} L ${midX} ${p2.y} L ${p2.x} ${p2.y}`,
      mid: { x: midX, y: (p1.y + p2.y) / 2 },
      lerp: t => ({ x: midX, y: p1.y + (p2.y - p1.y) * t }),
      endA: { x: p1.x + 26 * Math.sign(midX - p1.x || 1), y: p1.y },
      endB: { x: p2.x + 26 * Math.sign(midX - p2.x || -1), y: p2.y }
    };
  }
  const p1 = clipToNode(a, cb), p2 = clipToNode(b, ca);
  const len = Math.hypot(p2.x - p1.x, p2.y - p1.y) || 1;
  const ux = (p2.x - p1.x) / len, uy = (p2.y - p1.y) / len;
  return {
    d: `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`,
    mid: { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 },
    lerp: t => ({ x: p1.x + (p2.x - p1.x) * t, y: p1.y + (p2.y - p1.y) * t }),
    endA: { x: p1.x + ux * 26, y: p1.y + uy * 26 },
    endB: { x: p2.x - ux * 26, y: p2.y - uy * 26 }
  };
}

// Links converging on one device would stack their labels on top of each
// other; slide each label a little along its own line instead.
function edgeLabelFractions(edges) {
  const seen = {};
  const fractions = {};
  for (const e of edges) {
    const i = (seen[e.from] = (seen[e.from] || 0) + 1) - 1;
    fractions[e.id] = 0.5 + ((i % 3) - 1) * 0.13;
  }
  return fractions;
}

function renderZones() {
  zoneLayer.innerHTML = '';
  for (const z of (state.zones || [])) {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.classList.add('zone');
    g.dataset.id = z.id;
    const selected = selection && selection.kind === 'zone' && selection.id === z.id;
    if (selected) g.classList.add('selected');
    g.innerHTML = `
      <rect class="zone-rect" x="${z.x}" y="${z.y}" width="${z.w}" height="${z.h}" rx="12"
            fill="${z.color}" stroke="${z.color}"/>
      <text class="zone-title" x="${z.x + 14}" y="${z.y + 22}" fill="${z.color}">${escapeHtml(z.label)}</text>
      ${selected ? `<rect class="zone-resize" x="${z.x + z.w - 9}" y="${z.y + z.h - 9}"
            width="16" height="16" rx="4" fill="${z.color}"/>` : ''}`;
    zoneLayer.appendChild(g);
  }
}

// Nodes whose center sits inside the zone rectangle move with it.
function zoneMembers(z) {
  return state.nodes.filter(n => {
    const c = nodeCenter(n);
    return c.x >= z.x && c.x <= z.x + z.w && c.y >= z.y && c.y <= z.y + z.h;
  });
}

function renderEdges() {
  edgeLayer.innerHTML = '';
  const fractions = edgeLabelFractions(state.edges);
  for (const e of state.edges) {
    const path = edgePath(e);
    if (!path) continue;
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.classList.add('edge');
    g.dataset.id = e.id;
    if (selection && selection.kind === 'edge' && selection.id === e.id) g.classList.add('selected');

    // Wide invisible stroke first, so edges are easy to click.
    const hit = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    hit.setAttribute('d', path.d);
    hit.setAttribute('class', 'edge-hit');

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    line.setAttribute('d', path.d);
    line.setAttribute('class', 'edge-line');
    if (e.style === 'dashed') line.setAttribute('stroke-dasharray', '7 5');

    g.append(hit, line);

    // Labels: one mid-link plus optional per-end interface labels
    // (Eth8/4 where the wire leaves one device, Te0/1/4 where it enters
    // the other).
    const addLabel = (x, y, text) => {
      const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      txt.setAttribute('x', x);
      txt.setAttribute('y', y);
      txt.setAttribute('class', 'edge-label');
      txt.textContent = text;
      g.append(bg, txt);
      // Size the backing rect after the text is in the DOM.
      requestAnimationFrame(() => {
        try {
          const bb = txt.getBBox();
          bg.setAttribute('x', bb.x - 4); bg.setAttribute('y', bb.y - 2);
          bg.setAttribute('width', bb.width + 8); bg.setAttribute('height', bb.height + 4);
          bg.setAttribute('class', 'edge-label-bg');
        } catch (_) { /* detached during re-render */ }
      });
    };
    if (e.label) {
      const at = path.lerp ? path.lerp(fractions[e.id] ?? 0.5) : path.mid;
      addLabel(at.x, at.y, e.label);
    }
    if (e.fromLabel) addLabel(path.endA.x, path.endA.y, e.fromLabel);
    if (e.toLabel) addLabel(path.endB.x, path.endB.y, e.toLabel);
    edgeLayer.appendChild(g);
  }
}

function renderNodes() {
  nodeLayer.innerHTML = '';
  for (const n of state.nodes) {
    const icon = iconFor(n.type);
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.classList.add('node');
    g.dataset.id = n.id;
    g.setAttribute('transform', `translate(${n.x},${n.y})`);
    if (selection && selection.kind === 'node' && selection.id === n.id) g.classList.add('selected');
    if (connectSource === n.id) g.classList.add('connect-source');

    const pad = (NODE_W - ICON_SIZE) / 2;
    g.innerHTML = `
      <rect class="node-box" x="${pad - 6}" y="4" width="${ICON_SIZE + 12}" height="${ICON_SIZE + 12}" rx="10"/>
      <g class="node-icon" transform="translate(${pad},10) scale(${ICON_SIZE / 64})"
         color="${n.color || icon.color}">${icon.svg}</g>
      <text class="node-label" x="${NODE_W / 2}" y="${ICON_SIZE + 24}">${escapeHtml(n.label)}</text>
      ${n.sub ? `<text class="node-sub" x="${NODE_W / 2}" y="${ICON_SIZE + 38}">${escapeHtml(n.sub)}</text>` : ''}`;
    nodeLayer.appendChild(g);
  }
}

function renderNotes() {
  noteLayer.innerHTML = '';
  for (const note of (state.notes || [])) {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.classList.add('note');
    g.dataset.id = note.id;
    const selected = selection && selection.kind === 'note' && selection.id === note.id;
    if (selected) g.classList.add('selected');
    const lines = String(note.text || '').split('\n');
    const tspans = lines.map((line, i) =>
      `<tspan x="${note.x + 12}" dy="${i === 0 ? 0 : 17}">${escapeHtml(line) || ' '}</tspan>`).join('');
    g.innerHTML = `
      <rect class="note-rect" x="${note.x}" y="${note.y}" width="${note.w}" height="${note.h}" rx="8"
            stroke="${note.color}"/>
      <text class="note-text" x="${note.x + 12}" y="${note.y + 22}" fill="${note.color}">${tspans}</text>
      ${selected ? `<rect class="note-resize" x="${note.x + note.w - 9}" y="${note.y + note.h - 9}"
            width="16" height="16" rx="4" fill="${note.color}"/>` : ''}`;
    noteLayer.appendChild(g);
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

// ---------------------------------------------------------------------------
// Palette
// ---------------------------------------------------------------------------

function buildPalette() {
  rebuildPalette();
  // Live search: hide non-matching items and any category left empty.
  $('#palette-search').addEventListener('input', ev => applyPaletteFilter(ev.target.value));
}

function applyPaletteFilter(query) {
  const q = (query || '').trim().toLowerCase();
  for (const grid of $('#palette').querySelectorAll('.palette-grid')) {
    let visible = 0;
    for (const item of grid.children) {
      const show = !q || item.dataset.search.includes(q);
      item.hidden = !show;
      if (show) visible++;
    }
    grid.hidden = visible === 0;
    grid.previousElementSibling.hidden = visible === 0;
  }
}

function rebuildPalette() {
  registerCustomIcons();
  const pal = $('#palette');
  pal.innerHTML = '';
  const cats = [...ICON_CATEGORIES];
  const customKeys = Object.keys(state.customIcons || {});
  if (customKeys.length) cats.push({ name: 'Imported', types: customKeys });
  for (const cat of cats) {
    const title = document.createElement('h3');
    title.className = 'palette-cat';
    title.textContent = cat.name;
    pal.appendChild(title);
    const grid = document.createElement('div');
    grid.className = 'palette-grid';
    for (const key of cat.types) {
      const icon = NETWORK_ICONS[key];
      if (!icon) continue;
      const item = document.createElement('div');
      item.className = 'palette-item';
      item.draggable = true;
      item.dataset.type = key;
      item.dataset.search = (icon.label + ' ' + key).toLowerCase();
      item.title = `Drag onto canvas (or tap) to add ${icon.label}`;
      item.innerHTML = `
        <svg viewBox="0 0 64 64" style="color:${icon.color}">${icon.svg}</svg>
        <span>${icon.label}</span>`;
      item.addEventListener('dragstart', ev => {
        ev.dataTransfer.setData('text/x-netdraw-type', key);
        ev.dataTransfer.effectAllowed = 'copy';
      });
      item.addEventListener('click', () => {
        // Tap/click-to-add: place near center of the current viewport.
        const r = svg.getBoundingClientRect();
        addNode(key,
          snap((r.width / 2 - view.x) / view.zoom - NODE_W / 2 + (Math.random() * 60 - 30)),
          snap((r.height / 2 - view.y) / view.zoom - NODE_H / 2 + (Math.random() * 60 - 30)));
      });
      grid.appendChild(item);
    }
    pal.appendChild(grid);
  }
  applyPaletteFilter($('#palette-search').value);
}

svg.addEventListener('dragover', ev => { ev.preventDefault(); ev.dataTransfer.dropEffect = 'copy'; });
svg.addEventListener('drop', ev => {
  ev.preventDefault();
  const type = ev.dataTransfer.getData('text/x-netdraw-type');
  if (!type) return;
  const p = toScene(ev);
  addNode(type, snap(p.x - NODE_W / 2), snap(p.y - NODE_H / 2));
});

function addNode(type, x, y) {
  pushUndo();
  const icon = iconFor(type);
  const count = state.nodes.filter(n => n.type === type).length + 1;
  const node = { id: uid('n'), type, x, y, label: `${icon.label} ${count}`, color: icon.color };
  state.nodes.push(node);
  selection = { kind: 'node', id: node.id };
  render();
}

// ---------------------------------------------------------------------------
// Canvas interactions: select, move, connect, pan
// ---------------------------------------------------------------------------

let drag = null; // {kind:'node', id, dx, dy} | {kind:'pan', sx, sy, vx, vy}

// Pointer events cover mouse, touch, and pen with one code path. For touch,
// two active pointers on the canvas become a pinch (zoom + pan) and cancel
// any in-progress node drag.
const activePointers = new Map();
let pinch = null;

// touch-action: none in CSS should stop the browser from claiming touch
// gestures, but some engines still issue a pointercancel unless the raw
// touch events are also prevented — so do both.
svg.addEventListener('touchstart', ev => ev.preventDefault(), { passive: false });
svg.addEventListener('touchmove', ev => ev.preventDefault(), { passive: false });

svg.addEventListener('pointerdown', ev => {
  // Touch pointers implicitly capture to the element under the finger; our
  // re-render replaces that element, which would fire pointercancel and
  // kill the drag. Capturing on the SVG root (never rebuilt) prevents that.
  try { svg.setPointerCapture(ev.pointerId); } catch (_) {}
  activePointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
  if (activePointers.size === 2) {
    drag = null;
    const [p1, p2] = [...activePointers.values()];
    pinch = {
      dist: Math.hypot(p2.x - p1.x, p2.y - p1.y),
      mid: { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 },
      zoom: view.zoom, vx: view.x, vy: view.y
    };
    return;
  }
  if (activePointers.size > 2) return;

  const nodeEl = ev.target.closest('.node');
  const edgeEl = ev.target.closest('.edge');
  const noteHandleEl = ev.target.closest('.note-resize');
  const noteEl = ev.target.closest('.note');
  const zoneHandleEl = ev.target.closest('.zone-resize');
  const zoneEl = ev.target.closest('.zone');

  if (noteHandleEl && mode === 'select') {
    const id = noteHandleEl.closest('.note').dataset.id;
    selection = { kind: 'note', id };
    drag = { kind: 'note-resize', id, moved: false };
    render();
  } else if (noteEl && mode === 'select') {
    const id = noteEl.dataset.id;
    const note = noteById(id);
    const p = toScene(ev);
    selection = { kind: 'note', id };
    drag = { kind: 'note', id, dx: p.x - note.x, dy: p.y - note.y, moved: false };
    render();
  } else if (nodeEl) {
    const id = nodeEl.dataset.id;
    if (mode === 'connect') {
      handleConnectClick(id);
      return;
    }
    selection = { kind: 'node', id };
    const n = nodeById(id);
    const p = toScene(ev);
    drag = { kind: 'node', id, dx: p.x - n.x, dy: p.y - n.y, moved: false };
    render();
  } else if (edgeEl && mode === 'select') {
    selection = { kind: 'edge', id: edgeEl.dataset.id };
    render();
  } else if (zoneHandleEl && mode === 'select') {
    const id = zoneHandleEl.closest('.zone').dataset.id;
    selection = { kind: 'zone', id };
    drag = { kind: 'zone-resize', id, moved: false };
    render();
  } else if (zoneEl && mode === 'select') {
    const id = zoneEl.dataset.id;
    const z = zoneById(id);
    const p = toScene(ev);
    selection = { kind: 'zone', id };
    drag = {
      kind: 'zone', id, dx: p.x - z.x, dy: p.y - z.y, moved: false,
      members: zoneMembers(z).map(n => ({ id: n.id, dx: p.x - n.x, dy: p.y - n.y }))
    };
    render();
  } else {
    // Empty canvas: deselect; middle-drag or space/left-drag pans.
    if (mode === 'connect') { connectSource = null; setStatus('Connect: click a source node.'); render(); return; }
    selection = null;
    drag = { kind: 'pan', sx: ev.clientX, sy: ev.clientY, vx: view.x, vy: view.y };
    render();
  }
});

window.addEventListener('pointermove', ev => {
  if (activePointers.has(ev.pointerId)) {
    activePointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
  }
  if (pinch && activePointers.size >= 2) {
    const [p1, p2] = [...activePointers.values()];
    const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y) || 1;
    const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
    const z = Math.min(3, Math.max(0.25, pinch.zoom * dist / pinch.dist));
    const r = svg.getBoundingClientRect();
    // Keep the scene point that started under the pinch midpoint under the
    // current midpoint.
    view.x = (mid.x - r.left) - ((pinch.mid.x - r.left - pinch.vx) / pinch.zoom) * z;
    view.y = (mid.y - r.top) - ((pinch.mid.y - r.top - pinch.vy) / pinch.zoom) * z;
    view.zoom = z;
    render();
    return;
  }
  if (!drag) {
    if (mode === 'connect' && connectSource) drawConnectPreview(ev);
    return;
  }
  if (drag.kind === 'node') {
    const n = nodeById(drag.id);
    const p = toScene(ev);
    if (!drag.moved) { pushUndo(); drag.moved = true; }
    n.x = snap(p.x - drag.dx);
    n.y = snap(p.y - drag.dy);
    render();
  } else if (drag.kind === 'zone') {
    const z = zoneById(drag.id);
    const p = toScene(ev);
    if (!drag.moved) { pushUndo(); drag.moved = true; }
    z.x = snap(p.x - drag.dx);
    z.y = snap(p.y - drag.dy);
    for (const m of drag.members) {
      const n = nodeById(m.id);
      if (n) { n.x = snap(p.x - m.dx); n.y = snap(p.y - m.dy); }
    }
    render();
  } else if (drag.kind === 'note') {
    const note = noteById(drag.id);
    const p = toScene(ev);
    if (!drag.moved) { pushUndo(); drag.moved = true; }
    note.x = snap(p.x - drag.dx);
    note.y = snap(p.y - drag.dy);
    render();
  } else if (drag.kind === 'note-resize') {
    const note = noteById(drag.id);
    const p = toScene(ev);
    if (!drag.moved) { pushUndo(); drag.moved = true; }
    note.w = Math.max(120, snap(p.x - note.x));
    note.h = Math.max(50, snap(p.y - note.y));
    render();
  } else if (drag.kind === 'zone-resize') {
    const z = zoneById(drag.id);
    const p = toScene(ev);
    if (!drag.moved) { pushUndo(); drag.moved = true; }
    z.w = Math.max(120, snap(p.x - z.x));
    z.h = Math.max(90, snap(p.y - z.y));
    render();
  } else if (drag.kind === 'pan') {
    view.x = drag.vx + (ev.clientX - drag.sx);
    view.y = drag.vy + (ev.clientY - drag.sy);
    render();
  }
});

function endPointer(ev) {
  activePointers.delete(ev.pointerId);
  if (activePointers.size < 2) pinch = null;
  if (activePointers.size === 0) drag = null;
}
window.addEventListener('pointerup', endPointer);
window.addEventListener('pointercancel', endPointer);

svg.addEventListener('dblclick', ev => {
  const nodeEl = ev.target.closest('.node');
  const edgeEl = ev.target.closest('.edge');
  const zoneEl = ev.target.closest('.zone');
  if (nodeEl) {
    const n = nodeById(nodeEl.dataset.id);
    const label = prompt('Node label:', n.label);
    if (label !== null) { pushUndo(); n.label = label.trim() || n.label; render(); }
  } else if (edgeEl) {
    const e = state.edges.find(x => x.id === edgeEl.dataset.id);
    const label = prompt('Connection label (e.g. "GigE 1/0/1", "VPN"):', e.label || '');
    if (label !== null) { pushUndo(); e.label = label.trim(); render(); }
  } else if (ev.target.closest('.note')) {
    // Note editing happens in the properties panel (multi-line textarea);
    // double-click just selects it.
    selection = { kind: 'note', id: ev.target.closest('.note').dataset.id };
    render();
  } else if (zoneEl) {
    const z = zoneById(zoneEl.dataset.id);
    const label = prompt('Zone name (e.g. "DC-EAST"):', z.label);
    if (label !== null) { pushUndo(); z.label = label.trim() || z.label; render(); }
  }
});

// Wheel: zoom around cursor.
svg.addEventListener('wheel', ev => {
  ev.preventDefault();
  const factor = ev.deltaY < 0 ? 1.1 : 1 / 1.1;
  const z = Math.min(3, Math.max(0.25, view.zoom * factor));
  const r = svg.getBoundingClientRect();
  const mx = ev.clientX - r.left, my = ev.clientY - r.top;
  view.x = mx - ((mx - view.x) / view.zoom) * z;
  view.y = my - ((my - view.y) / view.zoom) * z;
  view.zoom = z;
  render();
}, { passive: false });

function handleConnectClick(id) {
  if (!connectSource) {
    connectSource = id;
    setStatus(`Connect: "${nodeById(id).label}" → click a target node.`);
    render();
    return;
  }
  if (connectSource !== id) {
    pushUndo();
    state.edges.push({
      id: uid('e'), from: connectSource, to: id, label: '',
      style: 'solid', shape: 'straight'
    });
  }
  connectSource = null;
  overlayLayer.innerHTML = '';
  setStatus('Connect: click a source node (Esc or V to go back to Select).');
  render();
}

function drawConnectPreview(ev) {
  const n = nodeById(connectSource);
  if (!n) return;
  const c = nodeCenter(n);
  const p = toScene(ev);
  overlayLayer.innerHTML =
    `<line x1="${c.x}" y1="${c.y}" x2="${p.x}" y2="${p.y}" class="connect-preview"/>`;
}

// ---------------------------------------------------------------------------
// Modes, keyboard, undo/redo, delete
// ---------------------------------------------------------------------------

function setMode(m) {
  mode = m;
  connectSource = null;
  overlayLayer.innerHTML = '';
  $('#btn-select').classList.toggle('active', m === 'select');
  $('#btn-connect').classList.toggle('active', m === 'connect');
  svg.style.cursor = m === 'connect' ? 'crosshair' : 'default';
  setStatus(m === 'connect'
    ? 'Connect: click a source node, then a target node.'
    : 'Select: drag icons from the palette; drag nodes to move; double-click to rename.');
  render();
}

function deleteSelection() {
  if (!selection) return;
  pushUndo();
  if (selection.kind === 'node') {
    state.nodes = state.nodes.filter(n => n.id !== selection.id);
    state.edges = state.edges.filter(e => e.from !== selection.id && e.to !== selection.id);
  } else if (selection.kind === 'zone') {
    // Deleting a zone keeps the devices inside it.
    state.zones = state.zones.filter(z => z.id !== selection.id);
  } else if (selection.kind === 'note') {
    state.notes = state.notes.filter(n => n.id !== selection.id);
  } else {
    state.edges = state.edges.filter(e => e.id !== selection.id);
  }
  selection = null;
  render();
}

function undo() {
  if (!undoStack.length) return;
  redoStack.push(JSON.stringify(state));
  state = JSON.parse(undoStack.pop());
  selection = null;
  render();
}

function redo() {
  if (!redoStack.length) return;
  undoStack.push(JSON.stringify(state));
  state = JSON.parse(redoStack.pop());
  selection = null;
  render();
}

window.addEventListener('keydown', ev => {
  if (ev.target.tagName === 'INPUT' || ev.target.tagName === 'SELECT' || ev.target.tagName === 'TEXTAREA') return;
  if ((ev.key === 'Delete' || ev.key === 'Backspace')) { ev.preventDefault(); deleteSelection(); }
  else if (ev.key === 'Escape') setMode('select');
  else if (ev.key.toLowerCase() === 'v') setMode('select');
  else if (ev.key.toLowerCase() === 'c' && !ev.ctrlKey && !ev.metaKey) setMode('connect');
  else if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'z' && !ev.shiftKey) { ev.preventDefault(); undo(); }
  else if ((ev.ctrlKey || ev.metaKey) && (ev.key.toLowerCase() === 'y' || (ev.key.toLowerCase() === 'z' && ev.shiftKey))) { ev.preventDefault(); redo(); }
});

// ---------------------------------------------------------------------------
// Properties panel
// ---------------------------------------------------------------------------

function renderProperties() {
  const panel = $('#props');
  if (!selection) {
    panel.innerHTML = '<p class="props-hint">Select a node or connection to edit its properties.</p>';
    return;
  }
  if (selection.kind === 'note') {
    const note = noteById(selection.id);
    if (!note) { panel.innerHTML = ''; return; }
    panel.innerHTML = `
      <h3>Note</h3>
      <label>Text <textarea id="p-ntext" rows="6">${escapeHtml(note.text || '')}</textarea></label>
      <label>Color <input id="p-ncolor" type="color" value="${note.color}"></label>
      <button id="p-ndelete" class="danger">Delete note</button>`;
    $('#p-ntext').addEventListener('change', ev => { pushUndo(); note.text = ev.target.value; render(); });
    $('#p-ncolor').addEventListener('input', ev => { note.color = ev.target.value; renderNotes(); saveLocal(); });
    $('#p-ndelete').addEventListener('click', deleteSelection);
    return;
  }
  if (selection.kind === 'zone') {
    const z = zoneById(selection.id);
    if (!z) { panel.innerHTML = ''; return; }
    panel.innerHTML = `
      <h3>Zone</h3>
      <label>Name <input id="p-zlabel" type="text" value="${escapeHtml(z.label)}"></label>
      <label>Color <input id="p-zcolor" type="color" value="${z.color}"></label>
      <p class="props-hint">${zoneMembers(z).length} device(s) inside. Drag the zone to move them together; drag the corner handle to resize.</p>
      <button id="p-zdelete" class="danger">Delete zone (keeps devices)</button>`;
    $('#p-zlabel').addEventListener('change', ev => { pushUndo(); z.label = ev.target.value; render(); });
    $('#p-zcolor').addEventListener('input', ev => { z.color = ev.target.value; renderZones(); saveLocal(); });
    $('#p-zdelete').addEventListener('click', deleteSelection);
    return;
  }
  if (selection.kind === 'node') {
    const n = nodeById(selection.id);
    if (!n) { panel.innerHTML = ''; return; }
    const typeKeys = ICON_ORDER.concat(Object.keys(state.customIcons || {}))
      .filter(t => NETWORK_ICONS[t]);
    if (!typeKeys.includes(n.type)) typeKeys.unshift(n.type);
    panel.innerHTML = `
      <h3>${iconFor(n.type).label}</h3>
      <label>Label <input id="p-label" type="text" value="${escapeHtml(n.label)}"></label>
      <label>Device type
        <select id="p-type">${typeKeys.map(t =>
          `<option value="${t}"${t === n.type ? ' selected' : ''}>${escapeHtml(iconFor(t).label)}</option>`
        ).join('')}</select></label>
      <label>Details (IP, VLAN, model…) <input id="p-sub" type="text" value="${escapeHtml(n.sub || '')}"></label>
      <label>Color <input id="p-color" type="color" value="${n.color}"></label>
      <button id="p-delete" class="danger">Delete node</button>`;
    $('#p-label').addEventListener('change', ev => { pushUndo(); n.label = ev.target.value; render(); });
    $('#p-type').addEventListener('change', ev => {
      pushUndo();
      const previous = iconFor(n.type);
      n.type = ev.target.value;
      // Keep a hand-picked color; refresh one that was the type default.
      if (n.color === previous.color) n.color = iconFor(n.type).color;
      render();
    });
    $('#p-sub').addEventListener('change', ev => { pushUndo(); n.sub = ev.target.value.trim(); render(); });
    $('#p-color').addEventListener('input', ev => { n.color = ev.target.value; renderNodes(); saveLocal(); });
    $('#p-delete').addEventListener('click', deleteSelection);
  } else {
    const e = state.edges.find(x => x.id === selection.id);
    if (!e) { panel.innerHTML = ''; return; }
    const fromNode = nodeById(e.from), toNode = nodeById(e.to);
    panel.innerHTML = `
      <h3>Connection</h3>
      <label>Label (middle) <input id="p-elabel" type="text" value="${escapeHtml(e.label || '')}"></label>
      <label>Label at ${escapeHtml(fromNode ? fromNode.label : 'A')}
        <input id="p-eflabel" type="text" value="${escapeHtml(e.fromLabel || '')}" placeholder="e.g. Eth8/4"></label>
      <label>Label at ${escapeHtml(toNode ? toNode.label : 'B')}
        <input id="p-etlabel" type="text" value="${escapeHtml(e.toLabel || '')}" placeholder="e.g. Te0/1/4"></label>
      <label>Line style
        <select id="p-estyle">
          <option value="solid"${e.style === 'solid' ? ' selected' : ''}>Solid</option>
          <option value="dashed"${e.style === 'dashed' ? ' selected' : ''}>Dashed</option>
        </select></label>
      <label>Routing
        <select id="p-eshape">
          <option value="straight"${e.shape === 'straight' ? ' selected' : ''}>Straight</option>
          <option value="elbow"${e.shape === 'elbow' ? ' selected' : ''}>Right-angle</option>
        </select></label>
      <button id="p-edelete" class="danger">Delete connection</button>`;
    $('#p-elabel').addEventListener('change', ev => { pushUndo(); e.label = ev.target.value; render(); });
    $('#p-eflabel').addEventListener('change', ev => { pushUndo(); e.fromLabel = ev.target.value.trim(); render(); });
    $('#p-etlabel').addEventListener('change', ev => { pushUndo(); e.toLabel = ev.target.value.trim(); render(); });
    $('#p-estyle').addEventListener('change', ev => { pushUndo(); e.style = ev.target.value; render(); });
    $('#p-eshape').addEventListener('change', ev => { pushUndo(); e.shape = ev.target.value; render(); });
    $('#p-edelete').addEventListener('click', deleteSelection);
  }
}

// ---------------------------------------------------------------------------
// Persistence: localStorage autosave + JSON file save/open
// ---------------------------------------------------------------------------

function saveLocal() {
  try { localStorage.setItem('netdraw-diagram', JSON.stringify(state)); } catch (_) {}
}

function loadLocal() {
  try {
    const raw = localStorage.getItem('netdraw-diagram');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.nodes)) state = parsed;
    }
  } catch (_) {}
  normalizeState();
}

function downloadBlob(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

$('#btn-save-json').addEventListener('click', () => {
  downloadBlob(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }),
    'network-diagram.json');
});

$('#file-open').addEventListener('change', ev => {
  const f = ev.target.files[0];
  if (!f) return;
  f.text().then(text => {
    try {
      const parsed = JSON.parse(text);
      if (!parsed || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) throw new Error('bad file');
      pushUndo();
      state = parsed;
      normalizeState();
      selection = null;
      render();
      setStatus(`Loaded ${f.name} (${state.nodes.length} nodes, ${state.edges.length} connections).`);
    } catch (_) {
      alert('That file is not a NetDraw diagram JSON.');
    }
    ev.target.value = '';
  });
});

$('#btn-clear').addEventListener('click', () => {
  if (!state.nodes.length || confirm('Clear the whole diagram?')) {
    pushUndo();
    state = { nodes: [], edges: [], zones: [], notes: [], bg: state.bg, counter: state.counter };
    selection = null;
    render();
  }
});

$('#btn-add-note').addEventListener('click', () => {
  pushUndo();
  const r = svg.getBoundingClientRect();
  const note = {
    id: uid('t'),
    x: snap((r.width / 2 - view.x) / view.zoom + 120),
    y: snap((r.height / 2 - view.y) / view.zoom - 160),
    w: 240, h: 110, color: '#64748b',
    text: 'Note\nDouble-click to select, edit text in\nthe Properties panel.'
  };
  state.notes.push(note);
  selection = { kind: 'note', id: note.id };
  render();
});

// ---------------------------------------------------------------------------
// Icon import: load SVG files (e.g. the official Cisco / Azure / AWS
// stencil SVGs the user downloaded from the vendor) into the palette.
// Icons are sanitized, normalized to the 64x64 icon grid, stored in
// state.customIcons (so they travel with saved files and share links),
// and flow into every export like the built-ins.
// ---------------------------------------------------------------------------

function sanitizeSvg(text) {
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
  const svg = doc.documentElement;
  if (!svg || svg.nodeName.toLowerCase() !== 'svg' || doc.querySelector('parsererror')) return null;
  // Strip anything active or external.
  doc.querySelectorAll('script, foreignObject, iframe, animate, set, animateTransform, animateMotion')
    .forEach(n => n.remove());
  for (const el of doc.querySelectorAll('*')) {
    for (const attr of [...el.attributes]) {
      const name = attr.name.toLowerCase();
      if (name.startsWith('on') ||
          ((name === 'href' || name === 'xlink:href') && !attr.value.trim().startsWith('#'))) {
        el.removeAttribute(attr.name);
      }
    }
  }
  // Normalize the artwork into our 64x64 icon grid, centered.
  let vb = (svg.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number);
  if (vb.length !== 4 || vb.some(isNaN) || vb[2] <= 0 || vb[3] <= 0) {
    const w = parseFloat(svg.getAttribute('width')) || 64;
    const h = parseFloat(svg.getAttribute('height')) || 64;
    vb = [0, 0, w > 0 ? w : 64, h > 0 ? h : 64];
  }
  const s = 64 / Math.max(vb[2], vb[3]);
  const tx = -vb[0] * s + (64 - vb[2] * s) / 2;
  const ty = -vb[1] * s + (64 - vb[3] * s) / 2;
  const inner = svg.innerHTML;
  if (!inner.trim() || inner.length > 200000) return null;
  return `<g transform="translate(${tx.toFixed(2)},${ty.toFixed(2)}) scale(${s.toFixed(4)})">${inner}</g>`;
}

$('#icon-files').addEventListener('change', async ev => {
  const files = [...ev.target.files].filter(f => /\.svg$/i.test(f.name)).slice(0, 200);
  if (!files.length) return;
  pushUndo();
  let ok = 0, failed = 0;
  for (const f of files) {
    try {
      const svg = sanitizeSvg(await f.text());
      if (!svg) { failed++; continue; }
      const label = (f.name.replace(/\.svg$/i, '').replace(/[-_.]+/g, ' ').trim()
        .replace(/\b\w/g, c => c.toUpperCase()) || 'Icon').slice(0, 30);
      const key = ('x_' + label.toLowerCase().replace(/[^a-z0-9]+/g, '_')).slice(0, 48);
      state.customIcons[key] = { label, color: '#3b5b7e', svg, custom: true };
      ok++;
    } catch (_) { failed++; }
  }
  registerCustomIcons();
  rebuildPalette();
  render();
  setStatus(ok
    ? `Imported ${ok} icon(s)${failed ? ` (${failed} skipped)` : ''} — see “Imported” in the palette. They save and share with your diagrams, and the text generator knows them by name.`
    : 'No usable SVG files found in that selection.');
  ev.target.value = '';
});

// ---------------------------------------------------------------------------
// Share via URL: the whole diagram travels inside the link (#d=…), gzipped
// with the browser's native CompressionStream when available. Fully offline
// once the page is loaded — no server stores anything.
// ---------------------------------------------------------------------------

function b64FromBytes(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  }
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function bytesFromB64(b64) {
  const s = atob(b64.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
  return bytes;
}

async function encodeDiagram() {
  const json = JSON.stringify(state);
  const raw = new TextEncoder().encode(json);
  try {
    if (window.CompressionStream) {
      const stream = new Blob([raw]).stream().pipeThrough(new CompressionStream('gzip'));
      const buf = new Uint8Array(await new Response(stream).arrayBuffer());
      return 'z' + b64FromBytes(buf);
    }
  } catch (_) {}
  return 'j' + b64FromBytes(raw);
}

async function decodeDiagram(data) {
  const kind = data[0];
  const bytes = bytesFromB64(data.slice(1));
  let json;
  if (kind === 'z') {
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    json = await new Response(stream).text();
  } else {
    json = new TextDecoder().decode(bytes);
  }
  const parsed = JSON.parse(json);
  if (!parsed || !Array.isArray(parsed.nodes)) throw new Error('bad diagram');
  return parsed;
}

$('#btn-share').addEventListener('click', async () => {
  const data = await encodeDiagram();
  const url = location.origin + location.pathname + '#d=' + data;
  history.replaceState(null, '', '#d=' + data);
  try {
    await navigator.clipboard.writeText(url);
    setStatus('Link copied — anyone who opens it sees this exact diagram.');
  } catch (_) {
    prompt('Copy this link to share the diagram:', url);
  }
});

$('#btn-add-zone').addEventListener('click', () => {
  pushUndo();
  const r = svg.getBoundingClientRect();
  const cx = (r.width / 2 - view.x) / view.zoom;
  const cy = (r.height / 2 - view.y) / view.zoom;
  const zone = {
    id: uid('z'), x: snap(cx - 170), y: snap(cy - 120),
    w: 340, h: 240, label: 'Zone', color: '#3b82f6'
  };
  state.zones.push(zone);
  selection = { kind: 'zone', id: zone.id };
  render();
  setStatus('Zone added — double-click to name it (e.g. "DC-EAST"); drag devices inside.');
});

$('#bg-color').addEventListener('input', ev => {
  state.bg = ev.target.value;
  render();
});
$('#btn-bg-reset').addEventListener('click', () => {
  state.bg = null;
  render();
  setStatus('Background follows the theme again.');
});

// ---------------------------------------------------------------------------
// Wire up toolbar
// ---------------------------------------------------------------------------

$('#btn-select').addEventListener('click', () => setMode('select'));
$('#btn-connect').addEventListener('click', () => setMode('connect'));
$('#btn-undo').addEventListener('click', undo);
$('#btn-redo').addEventListener('click', redo);
$('#btn-zoom-fit').addEventListener('click', () => {
  if (!state.nodes.length) { view = { x: 0, y: 0, zoom: 1 }; render(); return; }
  const xs = state.nodes.map(n => n.x), ys = state.nodes.map(n => n.y);
  const minX = Math.min(...xs) - 40, minY = Math.min(...ys) - 40;
  const maxX = Math.max(...xs) + NODE_W + 40, maxY = Math.max(...ys) + NODE_H + 40;
  const r = svg.getBoundingClientRect();
  const zoom = Math.min(2, r.width / (maxX - minX), r.height / (maxY - minY));
  view = {
    zoom,
    x: (r.width - (maxX - minX) * zoom) / 2 - minX * zoom,
    y: (r.height - (maxY - minY) * zoom) / 2 - minY * zoom
  };
  render();
});

// ---------------------------------------------------------------------------
// Boot: palette, saved diagram (or a small demo), first render
// ---------------------------------------------------------------------------

buildPalette();

// A shared link (#d=…) beats the locally saved diagram.
const sharedHash = location.hash.match(/^#d=(.+)$/);
if (sharedHash) {
  decodeDiagram(sharedHash[1]).then(parsed => {
    pushUndo(); // the previously saved diagram stays one Ctrl+Z away
    state = parsed;
    normalizeState();
    selection = null;
    render();
    document.getElementById('btn-zoom-fit').click();
    setStatus(`Opened shared diagram (${state.nodes.length} devices).`);
  }).catch(() => {
    setStatus('That shared link couldn’t be read — showing your saved diagram instead.');
    loadLocal();
    render();
  });
}

loadLocal();
if (!sharedHash && !state.nodes.length) {
  // Seed a tiny demo so the first visit isn't a blank screen.
  state = {
    counter: 100,
    nodes: [
      { id: 'n1', type: 'internet', x: 336, y: 24, label: 'Internet', color: NETWORK_ICONS.internet.color },
      { id: 'n2', type: 'firewall', x: 336, y: 176, label: 'Edge Firewall', color: NETWORK_ICONS.firewall.color },
      { id: 'n3', type: 'router', x: 336, y: 328, label: 'Core Router', color: NETWORK_ICONS.router.color },
      { id: 'n4', type: 'switch', x: 152, y: 480, label: 'Switch A', color: NETWORK_ICONS.switch.color },
      { id: 'n5', type: 'switch', x: 520, y: 480, label: 'Switch B', color: NETWORK_ICONS.switch.color },
      { id: 'n6', type: 'server', x: 40, y: 624, label: 'Web Server', color: NETWORK_ICONS.server.color },
      { id: 'n7', type: 'database', x: 264, y: 624, label: 'DB Server', color: NETWORK_ICONS.database.color },
      { id: 'n8', type: 'workstation', x: 520, y: 624, label: 'Workstations', color: NETWORK_ICONS.workstation.color }
    ],
    edges: [
      { id: 'e1', from: 'n1', to: 'n2', label: 'WAN', style: 'solid', shape: 'straight' },
      { id: 'e2', from: 'n2', to: 'n3', label: '', style: 'solid', shape: 'straight' },
      { id: 'e3', from: 'n3', to: 'n4', label: '', style: 'solid', shape: 'elbow' },
      { id: 'e4', from: 'n3', to: 'n5', label: '', style: 'solid', shape: 'elbow' },
      { id: 'e5', from: 'n4', to: 'n6', label: '', style: 'solid', shape: 'elbow' },
      { id: 'e6', from: 'n4', to: 'n7', label: '', style: 'solid', shape: 'elbow' },
      { id: 'e7', from: 'n5', to: 'n8', label: '', style: 'solid', shape: 'elbow' }
    ]
  };
  normalizeState();
}
setMode('select');
