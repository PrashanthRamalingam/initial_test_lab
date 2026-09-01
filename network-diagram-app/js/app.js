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
  nodes: [],   // {id, type, x, y, label, color}
  edges: [],   // {id, from, to, label, style: 'solid'|'dashed', shape: 'straight'|'elbow'}
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
const edgeLayer = document.getElementById('edge-layer');
const nodeLayer = document.getElementById('node-layer');
const overlayLayer = document.getElementById('overlay-layer');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const $ = (sel) => document.querySelector(sel);
const uid = (p) => p + (state.counter++);
const snap = (v) => Math.round(v / GRID) * GRID;
const nodeById = (id) => state.nodes.find(n => n.id === id);

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
  scene.setAttribute('transform', `translate(${view.x},${view.y}) scale(${view.zoom})`);
  // On small screens the properties panel is a bottom sheet shown only
  // while something is selected (see the media query in styles.css).
  document.body.classList.toggle('has-selection', !!selection);
  renderEdges();
  renderNodes();
  renderProperties();
  saveLocal();
}

function nodeCenter(n) { return { x: n.x + NODE_W / 2, y: n.y + ICON_SIZE / 2 + 10 }; }

// Point where the edge meets the node's bounding box, so lines stop at the
// icon instead of running underneath it.
function clipToNode(n, towards) {
  const c = nodeCenter(n);
  const hw = ICON_SIZE / 2 + 8, hh = ICON_SIZE / 2 + 8;
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
    const midX = (ca.x + cb.x) / 2;
    const p1 = clipToNode(a, { x: midX, y: ca.y });
    const p2 = clipToNode(b, { x: midX, y: cb.y });
    return {
      d: `M ${p1.x} ${p1.y} L ${midX} ${p1.y} L ${midX} ${p2.y} L ${p2.x} ${p2.y}`,
      mid: { x: midX, y: (p1.y + p2.y) / 2 }
    };
  }
  const p1 = clipToNode(a, cb), p2 = clipToNode(b, ca);
  return { d: `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`, mid: { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 } };
}

function renderEdges() {
  edgeLayer.innerHTML = '';
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

    if (e.label) {
      const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      txt.setAttribute('x', path.mid.x);
      txt.setAttribute('y', path.mid.y);
      txt.setAttribute('class', 'edge-label');
      txt.textContent = e.label;
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
    }
    edgeLayer.appendChild(g);
  }
}

function renderNodes() {
  nodeLayer.innerHTML = '';
  for (const n of state.nodes) {
    const icon = NETWORK_ICONS[n.type];
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
      <text class="node-label" x="${NODE_W / 2}" y="${ICON_SIZE + 32}">${escapeHtml(n.label)}</text>`;
    nodeLayer.appendChild(g);
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
  const pal = $('#palette');
  for (const cat of ICON_CATEGORIES) {
    const title = document.createElement('h3');
    title.className = 'palette-cat';
    title.textContent = cat.name;
    pal.appendChild(title);
    const grid = document.createElement('div');
    grid.className = 'palette-grid';
    for (const key of cat.types) {
      const icon = NETWORK_ICONS[key];
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

  // Live search: hide non-matching items and any category left empty.
  $('#palette-search').addEventListener('input', ev => {
    const q = ev.target.value.trim().toLowerCase();
    for (const grid of pal.querySelectorAll('.palette-grid')) {
      let visible = 0;
      for (const item of grid.children) {
        const show = !q || item.dataset.search.includes(q);
        item.hidden = !show;
        if (show) visible++;
      }
      grid.hidden = visible === 0;
      grid.previousElementSibling.hidden = visible === 0;
    }
  });
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
  const icon = NETWORK_ICONS[type];
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

  if (nodeEl) {
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
  if (nodeEl) {
    const n = nodeById(nodeEl.dataset.id);
    const label = prompt('Node label:', n.label);
    if (label !== null) { pushUndo(); n.label = label.trim() || n.label; render(); }
  } else if (edgeEl) {
    const e = state.edges.find(x => x.id === edgeEl.dataset.id);
    const label = prompt('Connection label (e.g. "GigE 1/0/1", "VPN"):', e.label || '');
    if (label !== null) { pushUndo(); e.label = label.trim(); render(); }
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
  if (selection.kind === 'node') {
    const n = nodeById(selection.id);
    if (!n) { panel.innerHTML = ''; return; }
    panel.innerHTML = `
      <h3>${NETWORK_ICONS[n.type].label}</h3>
      <label>Label <input id="p-label" type="text" value="${escapeHtml(n.label)}"></label>
      <label>Color <input id="p-color" type="color" value="${n.color}"></label>
      <button id="p-delete" class="danger">Delete node</button>`;
    $('#p-label').addEventListener('change', ev => { pushUndo(); n.label = ev.target.value; render(); });
    $('#p-color').addEventListener('input', ev => { n.color = ev.target.value; renderNodes(); saveLocal(); });
    $('#p-delete').addEventListener('click', deleteSelection);
  } else {
    const e = state.edges.find(x => x.id === selection.id);
    if (!e) { panel.innerHTML = ''; return; }
    panel.innerHTML = `
      <h3>Connection</h3>
      <label>Label <input id="p-elabel" type="text" value="${escapeHtml(e.label || '')}"></label>
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
    state = { nodes: [], edges: [], counter: state.counter };
    selection = null;
    render();
  }
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
loadLocal();
if (!state.nodes.length) {
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
}
setMode('select');
