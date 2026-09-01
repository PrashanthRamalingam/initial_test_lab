/*
 * Text-to-diagram: type a sentence in the message box, get a diagram.
 *
 *   "connect two routers to data center plus two firewall"
 *
 * How it works, in three steps:
 *   1. parseInstruction() splits the sentence into device GROUPS at the
 *      connector words ("to", "plus", "and", "then", "with", "->"), and
 *      inside each group finds device mentions (via a synonym vocabulary)
 *      with an optional count ("two routers", "3 switches", "a firewall").
 *   2. Consecutive groups get connected: pairwise when both sides have the
 *      same count (router 1 → firewall 1, router 2 → firewall 2),
 *      otherwise everything-to-everything (both routers → the data center).
 *   3. layoutLayers() places each group as a horizontal row, rows stacked
 *      top-to-bottom, centered — then the view zooms to fit.
 *
 * Generation replaces the current diagram (undo brings it back).
 */

'use strict';

// --- Vocabulary: synonyms → icon type. Order matters: multi-word phrases
// (data center, load balancer, access point) must match before their parts.
const DEVICE_VOCAB = [
  { type: 'datacenter',   re: /\bdata\s*-?\s*cent(?:er|re)s?\b|\bdatacenters?\b/g },
  { type: 'loadbalancer', re: /\bload\s*-?\s*balancers?\b|\blbs?\b/g },
  { type: 'wifi',         re: /\baccess\s*points?\b|\bwi-?fi\b|\bwireless\b|\baps?\b/g },
  { type: 'internet',     re: /\binternet\b|\bwan\b/g },
  { type: 'cloud',        re: /\bclouds?\b|\baws\b|\bazure\b|\bgcp\b/g },
  { type: 'router',       re: /\brouters?\b/g },
  { type: 'switch',       re: /\bswitch(?:es)?\b/g },
  { type: 'firewall',     re: /\bfire\s*-?\s*walls?\b/g },
  { type: 'vpn',          re: /\bvpns?\b/g },
  { type: 'database',     re: /\bdatabases?\b|\bdbs?\b/g },
  { type: 'storage',      re: /\bstorage\b|\bnas\b|\bsan\b/g },
  { type: 'server',       re: /\bservers?\b|\bhosts?\b|\bvms?\b/g },
  { type: 'workstation',  re: /\bworkstations?\b|\bdesktops?\b|\bpcs?\b|\bcomputers?\b/g },
  { type: 'laptop',       re: /\blaptops?\b|\bnotebooks?\b/g },
  { type: 'phone',        re: /\bphones?\b|\bvoip\b/g },
  { type: 'printer',      re: /\bprinters?\b/g },
  { type: 'user',         re: /\busers?\b|\bclients?\b|\bpeople\b|\bemployees?\b/g }
];

const NUMBER_WORDS = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10, couple: 2, pair: 2
};
const MAX_COUNT = 12;

// Split the sentence into group segments at connector words.
function splitGroups(text) {
  return text
    .split(/\bto\b|\bplus\b|\band\s+then\b|\bthen\b|\bwith\b|\binto\b|->|→|,/)
    .map(s => s.trim())
    .filter(Boolean);
}

// Find device mentions (with counts) inside one segment, in text order.
function parseSegment(seg) {
  const found = [];
  for (const { type, re } of DEVICE_VOCAB) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(seg)) !== null) {
      found.push({ type, index: m.index });
    }
  }
  found.sort((a, b) => a.index - b.index);

  // Merge overlapping/adjacent hits of the same type: "wireless access
  // point" matches the wifi vocabulary twice but is one device mention.
  const mentions = [];
  for (const f of found) {
    const prev = mentions[mentions.length - 1];
    if (prev && prev.type === f.type && f.index - prev.index < 16) continue;
    mentions.push(f);
  }

  // Attach a count: the last number (digit or word) in the 20 chars before
  // the mention. "two routers" → 2, "3 switches" → 3, else 1.
  for (const mention of mentions) {
    const before = seg.slice(Math.max(0, mention.index - 20), mention.index);
    const nums = [...before.matchAll(/\b(\d+|an?|one|two|three|four|five|six|seven|eight|nine|ten|couple|pair)\b/gi)];
    let count = 1;
    if (nums.length) {
      const word = nums[nums.length - 1][1].toLowerCase();
      count = NUMBER_WORDS[word] || parseInt(word, 10) || 1;
    }
    mention.count = Math.max(1, Math.min(MAX_COUNT, count));
  }
  return mentions;
}

// Full parse: text → {groups: [[{type,count},…],…]} or null if no devices.
function parseInstruction(text) {
  const groups = splitGroups(text.toLowerCase())
    .map(parseSegment)
    .filter(g => g.length > 0);
  return groups.length ? { groups } : null;
}

// Build nodes + edges from parsed groups.
function buildFromGroups(groups) {
  const nodes = [];
  const edges = [];
  const typeCounts = {};
  const layers = [];

  for (const group of groups) {
    const layer = [];
    for (const mention of group) {
      for (let i = 0; i < mention.count; i++) {
        typeCounts[mention.type] = (typeCounts[mention.type] || 0) + 1;
        const icon = NETWORK_ICONS[mention.type];
        const node = {
          id: uid('n'), type: mention.type, x: 0, y: 0,
          label: mention.count > 1 || typeCounts[mention.type] > 1
            ? `${icon.label} ${typeCounts[mention.type]}` : icon.label,
          color: icon.color
        };
        nodes.push(node);
        layer.push(node);
      }
    }
    layers.push(layer);
  }

  // Connect consecutive layers: pairwise when counts match (and > 1),
  // otherwise all-to-all.
  for (let i = 0; i + 1 < layers.length; i++) {
    const a = layers[i], b = layers[i + 1];
    if (a.length === b.length && a.length > 1) {
      for (let j = 0; j < a.length; j++) {
        edges.push({ id: uid('e'), from: a[j].id, to: b[j].id, label: '', style: 'solid', shape: 'straight' });
      }
    } else {
      for (const na of a) for (const nb of b) {
        edges.push({
          id: uid('e'), from: na.id, to: nb.id, label: '', style: 'solid',
          shape: (a.length > 1 || b.length > 1) ? 'elbow' : 'straight'
        });
      }
    }
  }
  return { nodes, edges, layers };
}

// Place layers as centered horizontal rows, top to bottom.
function layoutLayers(layers) {
  const X_GAP = 170, Y_GAP = 180, CENTER_X = 420;
  layers.forEach((layer, li) => {
    const rowWidth = (layer.length - 1) * X_GAP;
    layer.forEach((node, ni) => {
      node.x = snap(CENTER_X - rowWidth / 2 + ni * X_GAP - NODE_W / 2);
      node.y = snap(40 + li * Y_GAP);
    });
  });
}

// Layout for an arbitrary graph (used by the AI path, where edges don't
// follow the group structure): BFS layering from the sources.
function layoutGraph(nodes, edges) {
  const layerOf = {};
  const incoming = {};
  for (const n of nodes) incoming[n.id] = 0;
  for (const e of edges) if (e.to in incoming) incoming[e.to]++;
  let frontier = nodes.filter(n => incoming[n.id] === 0);
  if (!frontier.length && nodes.length) frontier = [nodes[0]];
  frontier.forEach(n => { layerOf[n.id] = 0; });
  let changed = true, guard = 0;
  while (changed && guard++ < nodes.length + 2) {
    changed = false;
    for (const e of edges) {
      if (layerOf[e.from] !== undefined) {
        const want = layerOf[e.from] + 1;
        if (layerOf[e.to] === undefined || layerOf[e.to] < want) {
          layerOf[e.to] = Math.min(want, nodes.length);
          changed = true;
        }
      }
    }
  }
  const layers = [];
  for (const n of nodes) {
    const li = layerOf[n.id] || 0;
    (layers[li] = layers[li] || []).push(n);
  }
  layoutLayers(layers.filter(Boolean));
}

// Apply a generated diagram: replace current content (undo restores it).
function applyGenerated(nodes, edges, sourceText) {
  pushUndo();
  state.nodes = nodes;
  state.edges = edges;
  selection = null;
  render();
  document.getElementById('btn-zoom-fit').click();
  setStatus(`Generated ${nodes.length} devices, ${edges.length} connections from: “${sourceText}”`);
}

// The built-in parser path. Returns true if it produced a diagram.
function generateFromText(text) {
  const parsed = parseInstruction(text);
  if (!parsed) return false;
  const { nodes, edges, layers } = buildFromGroups(parsed.groups);
  layoutLayers(layers);
  applyGenerated(nodes, edges, text);
  return true;
}

// --- Message box wiring -----------------------------------------------------

function handleGenerate() {
  const input = document.getElementById('gen-input');
  const text = input.value.trim();
  if (!text) return;
  if (generateFromText(text)) return;
  // Hook for smarter backends (the artifact preview plugs Claude in here).
  if (typeof window.aiGenerate === 'function') {
    window.aiGenerate(text);
    return;
  }
  setStatus('No devices recognized — try naming them, e.g. “connect two routers to data center plus two firewalls”.');
}

document.getElementById('btn-generate').addEventListener('click', handleGenerate);
document.getElementById('gen-input').addEventListener('keydown', ev => {
  if (ev.key === 'Enter') handleGenerate();
});
