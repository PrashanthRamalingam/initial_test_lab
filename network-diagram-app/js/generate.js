/*
 * Text-to-diagram: type a sentence in the message box, get a diagram.
 *
 *   "connect two routers to data center plus two firewall"
 *   "bprt-01-rt01 router connects via fiber to 24 port switch swg-01"
 *
 * The pipeline:
 *   1. The sentence splits into device GROUPS at connector words
 *      ("to", "plus", "and", "then", "with", "->").
 *   2. Each group is scanned for:
 *        - device mentions from a synonym vocabulary, with counts
 *          ("two routers", "3 switches") — numbers that are really port
 *          counts or speeds ("24 port", "10g") are ignored;
 *        - HOSTNAMES (bprt-01-rt01, NGA-SC01-LGA, swg-01): tokens with
 *          digits and -/. separators. A hostname names the nearest device
 *          mention, or stands alone with its type inferred from the name
 *          (rt/rw → router, sw/sc → switch, fw → firewall, …);
 *        - LINK terms (fiber, trunk, intra link, Po5.501, Eth8/4, 10g …)
 *          which become the label of the connection leaving that group.
 *   3. Consecutive groups get connected (pairwise when counts match, else
 *      all-to-all) and laid out as centered rows, top to bottom.
 *
 * De-duplication: the same hostname always maps to the same node, and
 * repeated unnamed mentions of singleton infrastructure (cloud, internet,
 * data center, DNS, CDN) collapse to one node — so a paragraph that says
 * "Azure" eleven times yields one cloud, not eleven.
 *
 * Long multi-line configs (IP addresses, VLANs) overwhelm any regex
 * grammar, so handleGenerate() routes those to window.aiGenerate (Claude,
 * in the hosted preview) when available. Generation replaces the current
 * diagram; undo restores it.
 */

'use strict';

// --- Vocabulary: synonyms → icon type. Longer, more specific phrases are
// listed before their generic parts ("web server" before "server");
// overlap resolution in parseSegment() keeps the longest match.
const DEVICE_VOCAB = [
  { type: 'datacenter',   re: /\bdata\s*-?\s*cent(?:er|re)s?\b|\bdatacenters?\b/gi },
  { type: 'loadbalancer', re: /\bload\s*-?\s*balancers?\b|\blbs?\b/gi },
  { type: 'l3switch',     re: /\blayer\s*-?\s*3\s*switch(?:es)?\b|\bl3\s*switch(?:es)?\b/gi },
  { type: 'webserver',    re: /\bweb\s*-?\s*servers?\b/gi },
  { type: 'mailserver',   re: /\b(?:e-?)?mail\s*-?\s*servers?\b|\bexchange\s*servers?\b|\bsmtp\b/gi },
  { type: 'privatecloud', re: /\bprivate\s*clouds?\b/gi },
  { type: 'wlc',          re: /\bwireless\s*(?:lan\s*)?controllers?\b|\bwlcs?\b/gi },
  { type: 'wifi',         re: /\baccess\s*points?\b|\bwi-?fi\b|\bwireless\b|\baps?\b/gi },
  { type: 'celltower',    re: /\bcell\s*towers?\b|\bantennas?\b|\b[45]g\b|\blte\b/gi },
  { type: 'satellite',    re: /\bsatellites?\b|\bvsat\b|\bdish(?:es)?\b/gi },
  { type: 'usergroup',    re: /\buser\s*groups?\b|\bgroups?\b|\bteams?\b|\bdepartments?\b/gi },
  { type: 'admin',        re: /\badmin(?:istrator)?s?\b/gi },
  { type: 'camera',       re: /\b(?:ip\s*|security\s*|cctv\s*)?cameras?\b|\bcctv\b/gi },
  { type: 'ids',          re: /\bids\b|\bips\b|\bintrusion\b/gi },
  { type: 'internet',     re: /\binternet\b|\bwan\b/gi },
  { type: 'cdn',          re: /\bcdns?\b|\bcontent\s*delivery\b/gi },
  { type: 'dns',          re: /\bdns\b|\bname\s*servers?\b/gi },
  { type: 'cloud',        re: /\bclouds?\b|\baws\b|\bazure\b|\bgcp\b/gi },
  { type: 'router',       re: /\brouters?\b/gi },
  { type: 'switch',       re: /\bswitch(?:es)?\b/gi },
  { type: 'hub',          re: /\bhubs?\b/gi },
  { type: 'firewall',     re: /\bfire\s*-?\s*walls?\b/gi },
  { type: 'proxy',        re: /\bprox(?:y|ies)\b/gi },
  { type: 'vpn',          re: /\bvpns?(?:\s*gateways?)?\b/gi },
  { type: 'gateway',      re: /\bgateways?\b/gi },
  { type: 'modem',        re: /\bmodems?\b/gi },
  { type: 'database',     re: /\bdatabases?\b|\bdbs?\b/gi },
  { type: 'san',          re: /\bsan\s*fabrics?\b|\bsan\b/gi },
  { type: 'storage',      re: /\bstorage\b|\bnas\b/gi },
  { type: 'backup',       re: /\bbackups?\b|\btapes?\b/gi },
  { type: 'mainframe',    re: /\bmainframes?\b/gi },
  { type: 'vm',           re: /\bvirtual\s*machines?\b|\bvms?\b/gi },
  { type: 'container',    re: /\bcontainers?\b|\bdocker\b|\bpods?\b/gi },
  { type: 'cluster',      re: /\bclusters?\b|\bkubernetes\b|\bk8s\b/gi },
  { type: 'server',       re: /\bservers?\b|\bhosts?\b/gi },
  { type: 'workstation',  re: /\bworkstations?\b|\bdesktops?\b|\bpcs?\b|\bcomputers?\b/gi },
  { type: 'laptop',       re: /\blaptops?\b|\bnotebooks?\b/gi },
  { type: 'tablet',       re: /\btablets?\b|\bipads?\b/gi },
  { type: 'mobile',       re: /\b(?:mobile|cell|smart)\s*-?\s*phones?\b|\bmobiles?\b|\biphones?\b|\bandroid\b/gi },
  { type: 'phone',        re: /\bphones?\b|\bvoip\b/gi },
  { type: 'printer',      re: /\bprinters?\b/gi },
  { type: 'scanner',      re: /\bscanners?\b/gi },
  { type: 'tv',           re: /\btvs?\b|\bdisplays?\b|\bscreens?\b|\bmonitors?\b/gi },
  { type: 'pos',          re: /\bpos\b|\bpoint\s*of\s*sale\b|\bterminals?\b/gi },
  { type: 'iot',          re: /\biot\b|\bsensors?\b|\bthermostats?\b/gi },
  { type: 'shield',       re: /\bshields?\b/gi },
  { type: 'user',         re: /\busers?\b|\bclients?\b|\bpeople\b|\bemployees?\b/gi }
];

// Link/connection vocabulary: matches become the connection's label.
const LINK_VOCAB = [
  /\bintra[-\s]?links?\b/gi,
  /\binter[-\s]?links?\b/gi,
  /\bfib(?:er|re)\b/gi,
  /\bcopper\b/gi,
  /\bcat\s?[56]e?\b/gi,
  /\bethernet\b/gi,
  /\btrunk\b/gi,
  /\buplink\b/gi,
  /\bdownlink\b/gi,
  /\blacp\b/gi,
  /\bport[-\s]?channel\s*\d*(?:\.\d+)?\b/gi,
  /\bpo\d+(?:\.\d+)?\b/gi,
  /\bpc-\d+(?:\.\d+)?\b/gi,
  /\b(?:eth|te|gi|fa|hu|xe)\d+(?:[\/.]\d+)*\b/gi,
  /\b\d{1,3}\s?(?:gbps|mbps|gb|g)\b/gi,
  /\bmpls\b/gi,
  /\bbgp\b/gi,
  /\bospf\b/gi,
  /\bserial\b/gi
];

// Hostname-shaped tokens: letters+digits with -/. separators and at least
// one digit (bprt-01-rt01, NGA-SC01-LGA, swg-01).
const HOSTNAME_RE = /\b(?=[A-Za-z0-9.\-]*\d)[A-Za-z][A-Za-z0-9]*(?:[-.][A-Za-z0-9]+)+\b/g;

// Substring → type hints for hostnames with no device word nearby.
const HOSTNAME_TYPE_HINTS = [
  ['fw', 'firewall'], ['lb', 'loadbalancer'], ['db', 'database'],
  ['sql', 'database'], ['esx', 'vm'], ['k8s', 'cluster'], ['srv', 'server'],
  ['swg', 'switch'], ['sw', 'switch'], ['sc', 'switch'],
  ['rtr', 'router'], ['rt', 'router'], ['rw', 'router'], ['gw', 'gateway'],
  ['ap', 'wifi'], ['dns', 'dns'], ['nas', 'storage']
];

// Unnamed mentions of these types always refer to the same one thing:
// eleven mentions of "Azure" are one cloud, not eleven.
const SINGLETON_TYPES = new Set(['internet', 'cloud', 'privatecloud', 'datacenter', 'dns', 'cdn']);

const BRAND_LABELS = { azure: 'Azure', aws: 'AWS', gcp: 'GCP', wan: 'WAN' };

const NUMBER_WORDS = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10, couple: 2, pair: 2
};
const MAX_COUNT = 12;
const MAX_NODES = 60;
const MAX_EDGES = 80;

function inferTypeFromHostname(name) {
  const n = name.toLowerCase();
  for (const [hint, type] of HOSTNAME_TYPE_HINTS) {
    if (n.includes(hint)) return type;
  }
  return 'server';
}

// Split the sentence into group segments at connector words (original
// casing is kept so hostnames stay as typed).
function splitGroups(text) {
  return text
    .split(/\bto\b|\bplus\b|\band\s+then\b|\bthen\b|\bwith\b|\binto\b|->|→|,|\n/i)
    .map(s => s.trim())
    .filter(Boolean);
}

// Parse one segment: device mentions (with counts and hostnames),
// standalone hostnames, and link terms.
function parseSegment(seg) {
  // Link terms first — a token like Po5.501 is a link, not a hostname.
  const linkSpans = [];
  for (const re of LINK_VOCAB) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(seg)) !== null) {
      linkSpans.push({ text: m[0], index: m.index, len: m[0].length });
    }
  }

  // Device mentions, longest match wins at any position. A mention inside
  // a link term is not a device: "PC-501" is a port channel, not a PC.
  let found = [];
  for (const { type, re } of DEVICE_VOCAB) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(seg)) !== null) {
      found.push({ type, index: m.index, len: m[0].length });
    }
  }
  found = found.filter(f =>
    !linkSpans.some(l => f.index < l.index + l.len && l.index < f.index + f.len));
  found.sort((a, b) => a.index - b.index || b.len - a.len);
  const mentions = [];
  let coveredTo = -1;
  for (const f of found) {
    if (f.index < coveredTo) continue;
    const prev = mentions[mentions.length - 1];
    if (prev && prev.type === f.type && f.index - (prev.index + prev.len) < 4) {
      coveredTo = f.index + f.len;
      prev.len = coveredTo - prev.index;
      continue;
    }
    f.count = 1;
    f.names = [];
    f.word = seg.substr(f.index, f.len);
    mentions.push(f);
    coveredTo = f.index + f.len;
  }

  // Numbers that mean quantity. Skip numbers glued to identifiers
  // (swg-01, 10.96.98.42) via the lookbehind, and numbers that describe
  // the device rather than count it ("24 port", "10 g").
  const numbers = [];
  const numRe = /(?<![\w\/.\-])(\d+|an?|one|two|three|four|five|six|seven|eight|nine|ten|couple|pair)\b/gi;
  let nm;
  while ((nm = numRe.exec(seg)) !== null) {
    const word = nm[1].toLowerCase();
    const after = seg.slice(nm.index + nm[1].length);
    if (/^\s*-?\s*(?:ports?|gbps?|gig|mbps|g|u|ru)\b/i.test(after)) continue;
    const v = NUMBER_WORDS[word] || parseInt(word, 10);
    if (v) numbers.push({ index: nm.index, len: nm[1].length, v });
  }
  for (const mention of mentions) {
    for (const n of numbers) {
      if (n.index < mention.index && mention.index - (n.index + n.len) <= 20) {
        mention.count = Math.max(1, Math.min(MAX_COUNT, n.v));
      }
    }
  }

  // Hostnames: name the nearest device mention, or stand alone with an
  // inferred type. Tokens already claimed as link terms are excluded.
  const standalone = [];
  HOSTNAME_RE.lastIndex = 0;
  let hm;
  while ((hm = HOSTNAME_RE.exec(seg)) !== null) {
    const tok = hm[0];
    if (linkSpans.some(l => hm.index >= l.index && hm.index < l.index + l.len)) continue;
    if (LINK_VOCAB.some(re => new RegExp('^(?:' + re.source + ')$', 'i').test(tok))) continue;
    // Attach the hostname only to an IMMEDIATELY adjacent device word
    // ("router bprt-01-rt01", "swg-01 switch"). A hostname merely near
    // some other device word keeps its own inferred type — in "Peer
    // between NGA-RW01 and Azure", NGA-RW01 is a router, not a cloud.
    let best = null, bestD = Infinity;
    for (const mention of mentions) {
      const gap = mention.index >= hm.index
        ? mention.index - (hm.index + tok.length)
        : hm.index - (mention.index + mention.len);
      if (gap < bestD) { bestD = gap; best = mention; }
    }
    if (best && bestD <= 12) best.names.push(tok);
    else standalone.push({ type: inferTypeFromHostname(tok), index: hm.index, count: 1, names: [tok] });
  }

  // "two switches: NGA-SC01-LGA ... and NGA-SC02-LGA": the far hostname
  // became a standalone entry, but it is one of the two — count it against
  // the mention so no extra unnamed switch appears.
  for (const s of standalone) {
    const m = mentions.find(x => x.type === s.type && x.count > x.names.length);
    if (m) m.count--;
  }

  const entries = mentions.concat(standalone).sort((a, b) => a.index - b.index);
  const linkTerms = [...new Set(linkSpans.map(l => l.text.trim()))];
  return { entries, linkTerms };
}

// Zone (container) grammar, detected per sentence:
//   "within dc DC-EAST …" / "in the NYC1 data center …" → named zone
//   "… between two dcs"                                  → DC 1 / DC 2
function detectZone(sentence) {
  if (/\bbetween\s+(?:two|2)\s+(?:dcs?|data\s*cent(?:er|re)s?|sites?)\b/i.test(sentence)) {
    return { pair: true };
  }
  let m = /\b(?:in|within|inside|at)\s+(?:the\s+)?(?:dc|data\s*cent(?:er|re)|datacenter|site|zone)\s+([A-Za-z][\w-]*)/i.exec(sentence);
  if (m) return { label: m[1] };
  m = /\b(?:in|within|inside|at)\s+(?:the\s+)?([A-Za-z][\w-]*)\s+(?:dc|data\s*cent(?:er|re)|datacenter|site|zone)\b/i.exec(sentence);
  if (m) return { label: m[1] };
  if (/\b(?:in|within|inside)\s+(?:a\s+|the\s+)?(?:dc|data\s*cent(?:er|re)|datacenter)\b/i.test(sentence)) {
    return { label: 'DC' };
  }
  return null;
}

// Full parse: text → {groups} where each group has entries + linkTerms and
// optionally a zoneLabel; null when nothing was recognized. Sentences are
// split on ". " / ";" / newlines (a period between digits, as in an IP or
// Po5.501, does not end a sentence).
function parseInstruction(text) {
  const sentences = text.split(/[;\n]+|\.\s+|\.$/).map(s => s.trim()).filter(Boolean);
  const groups = [];
  for (const sentence of sentences) {
    const zone = detectZone(sentence);
    const segs = splitGroups(sentence).map(parseSegment).filter(g => g.entries.length > 0);
    if (zone && zone.pair && segs.length >= 2) {
      segs[0].zoneLabel = 'DC 1';
      segs[segs.length - 1].zoneLabel = 'DC 2';
    } else if (zone && zone.label) {
      for (const g of segs) g.zoneLabel = zone.label;
    }
    // Groups chain into connections only WITHIN a sentence — a new
    // sentence starts a new chain (use hostnames to connect across
    // sentences: "core-sw-01 to web-srv-01").
    if (segs.length) segs[0].chainStart = true;
    groups.push(...segs);
  }
  return groups.length ? { groups } : null;
}

// Build nodes + edges from parsed groups, de-duplicating hostnames and
// singleton infrastructure across the whole text.
function buildFromGroups(groups) {
  const nodes = [];
  const edges = [];
  const layers = [];
  const registry = new Map();   // hostname / singleton-type → node
  const typeCounts = {};
  const edgeKeys = new Set();
  const zoneOf = new Map();     // node id → zone label (first zone wins)
  const placedGlobal = new Set(); // nodes already given a layout slot

  function makeNode(type, label) {
    const icon = NETWORK_ICONS[type];
    const node = { id: uid('n'), type, x: 0, y: 0, label, color: icon.color };
    nodes.push(node);
    return node;
  }

  for (const group of groups) {
    // conn: every node this group references (for connections, repeats
    // included); fresh: nodes appearing for the FIRST time anywhere — only
    // those get a layout slot here, so a later sentence that mentions an
    // existing device again doesn't yank it out of position.
    const layer = { conn: [], fresh: [] };
    const inLayer = new Set();
    const place = (node) => {
      if (!inLayer.has(node.id)) {
        layer.conn.push(node);
        inLayer.add(node.id);
        if (!placedGlobal.has(node.id)) {
          layer.fresh.push(node);
          placedGlobal.add(node.id);
        }
      }
      if (group.zoneLabel && !zoneOf.has(node.id)) zoneOf.set(node.id, group.zoneLabel);
    };

    for (const entry of group.entries) {
      if (nodes.length >= MAX_NODES) break;
      const icon = NETWORK_ICONS[entry.type];
      // "Azure" / "AWS" / "WAN" beat the generic icon label as the name.
      const brand = BRAND_LABELS[(entry.word || '').trim().toLowerCase()];
      const baseLabel = brand || icon.label;

      for (const name of entry.names) {
        const key = name.toLowerCase();
        if (!registry.has(key)) registry.set(key, makeNode(entry.type, name));
        place(registry.get(key));
      }

      const unnamed = Math.max(0, entry.count - entry.names.length);
      for (let i = 0; i < unnamed && nodes.length < MAX_NODES; i++) {
        if (unnamed === 1 && SINGLETON_TYPES.has(entry.type)) {
          // Generic and branded mentions of the same singleton merge:
          // "cloud" and "Azure" in one text are the same node (upgraded to
          // the brand name). Two DIFFERENT brands (AWS vs Azure) stay
          // separate nodes.
          let key = 'type:' + entry.type;
          const existing = registry.get(key);
          if (existing) {
            const brandValues = Object.values(BRAND_LABELS);
            const existingBrand = brandValues.includes(existing.label) ? existing.label : null;
            if (brand && existingBrand && existingBrand !== brand) {
              key = 'type:' + entry.type + ':' + brand;
            } else if (brand && !existingBrand) {
              existing.label = brand;
            }
          }
          if (!registry.has(key)) registry.set(key, makeNode(entry.type, baseLabel));
          place(registry.get(key));
        } else {
          typeCounts[entry.type] = (typeCounts[entry.type] || 0) + 1;
          const label = unnamed > 1 || typeCounts[entry.type] > 1
            ? `${baseLabel} ${typeCounts[entry.type]}` : baseLabel;
          place(makeNode(entry.type, label));
        }
      }
    }
    if (layer.conn.length) {
      layers.push({ layer, linkTerms: group.linkTerms, chainStart: group.chainStart });
    }
  }

  // Connect consecutive layers. The label comes from the source group's
  // link terms ("via fiber to …"); trailing terms on the final group label
  // the connection into it ("… to swg-01 intra link").
  // Groups chain within a sentence. If that yields no connections at all
  // (narrative text where sentences refer back to each other — "These
  // connect to…"), fall back to chaining all groups sequentially: a
  // connected best-guess beats a disconnected scatter.
  let respectChainStart = true;
  let usedFallbackChain = false;
  connectLayers();
  if (!edges.length && layers.length > 1) {
    respectChainStart = false;
    usedFallbackChain = true;
    connectLayers();
  }

  function connectLayers() {
  for (let i = 0; i + 1 < layers.length; i++) {
    if (respectChainStart && layers[i + 1].chainStart) continue;
    const a = layers[i].layer.conn, b = layers[i + 1].layer.conn;
    let terms = layers[i].linkTerms;
    if (i + 2 === layers.length && layers[i + 1].linkTerms.length) {
      terms = [...new Set(terms.concat(layers[i + 1].linkTerms))];
    }
    // At most two terms on a label — more turns into unreadable glue.
    const label = terms.slice(0, 2).join(', ').slice(0, 40);
    const connect = (na, nb, shape) => {
      if (na.id === nb.id || edges.length >= MAX_EDGES) return;
      // Undirected dedupe: links carry no arrowheads, so A→B and B→A are
      // the same line. When the duplicate carries a label, keep it.
      const key = [na.id, nb.id].sort().join('>');
      if (edgeKeys.has(key)) {
        if (label) {
          const existing = edges.find(e =>
            (e.from === na.id && e.to === nb.id) || (e.from === nb.id && e.to === na.id));
          if (existing && !existing.label) existing.label = label;
        }
        return;
      }
      edgeKeys.add(key);
      edges.push({ id: uid('e'), from: na.id, to: nb.id, label, style: 'solid', shape });
    };
    if (a.length === b.length && a.length > 1) {
      for (let j = 0; j < a.length; j++) connect(a[j], b[j], 'straight');
    } else {
      const shape = (a.length > 1 || b.length > 1) ? 'elbow' : 'straight';
      for (const na of a) for (const nb of b) connect(na, nb, shape);
    }
  }
  }

  // Zone membership as [{label, nodes}] in first-seen order.
  const zoneGroups = [];
  for (const [nodeId, label] of zoneOf) {
    let zg = zoneGroups.find(z => z.label === label);
    if (!zg) { zg = { label, nodes: [] }; zoneGroups.push(zg); }
    const node = nodes.find(n => n.id === nodeId);
    if (node) zg.nodes.push(node);
  }
  return {
    nodes, edges, zoneGroups, usedFallbackChain,
    layers: layers.map(l => l.layer.fresh).filter(f => f.length)
  };
}

// Turn zone membership into container rectangles around the laid-out
// member nodes. Call AFTER layout, since it reads node positions.
const ZONE_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#14b8a6'];
function makeZones(zoneGroups) {
  const zones = [];
  (zoneGroups || []).forEach((zg, i) => {
    if (!zg.nodes.length) return;
    const xs = zg.nodes.map(n => n.x), ys = zg.nodes.map(n => n.y);
    const pad = 28, titleH = 30;
    const x = Math.min(...xs) - pad;
    const y = Math.min(...ys) - pad - titleH;
    zones.push({
      id: uid('z'), x: snap(x), y: snap(y),
      w: snap(Math.max(...xs) + NODE_W + pad - x),
      h: snap(Math.max(...ys) + NODE_H + pad - y),
      label: zg.label, color: ZONE_COLORS[i % ZONE_COLORS.length]
    });
  });
  return zones;
}

// --- Layout direction: top-down (vertical) or left-right (horizontal).
let layoutDir = 'vertical';
try { layoutDir = localStorage.getItem('netdraw-layout-dir') || 'vertical'; } catch (_) {}

function setLayoutDir(dir) {
  layoutDir = dir === 'horizontal' ? 'horizontal' : 'vertical';
  try { localStorage.setItem('netdraw-layout-dir', layoutDir); } catch (_) {}
}

// Place layers as centered rows (vertical) or columns (horizontal). Wide
// layers wrap into sub-rows of six so huge fan-outs stay on screen.
function layoutLayers(layers) {
  const CROSS_GAP = 170, ROW_GAP = 150, PER_ROW = 6, CENTER = 420;
  const MAIN_GAP = layoutDir === 'horizontal' ? 250 : 190;
  let main = 40;
  for (const layer of layers) {
    const rows = Math.ceil(layer.length / PER_ROW);
    for (let r = 0; r < rows; r++) {
      const rowNodes = layer.slice(r * PER_ROW, (r + 1) * PER_ROW);
      const crossWidth = (rowNodes.length - 1) * CROSS_GAP;
      rowNodes.forEach((node, i) => {
        const cross = CENTER - crossWidth / 2 + i * CROSS_GAP;
        if (layoutDir === 'horizontal') {
          node.x = snap(main + r * ROW_GAP);
          node.y = snap(cross - NODE_H / 2);
        } else {
          node.x = snap(cross - NODE_W / 2);
          node.y = snap(main + r * ROW_GAP);
        }
      });
    }
    main += (rows - 1) * ROW_GAP + MAIN_GAP;
  }
}

// Layout for an arbitrary graph (used by the AI path and Rearrange):
// longest-path layering, but PEER edges are excluded from depth. A peer
// edge joins two nodes that share a common parent (an HA switch pair with
// a link between them) or that point at each other — counting those for
// depth collapses a diamond topology into a single overlapping chain.
function layoutGraph(nodes, edges) {
  const preds = {};
  const byId = {};
  for (const n of nodes) { preds[n.id] = new Set(); byId[n.id] = n; }
  for (const e of edges) if (preds[e.to]) preds[e.to].add(e.from);

  const isPeer = (e) => {
    if (edges.some(o => o.from === e.to && o.to === e.from)) return true;
    // Same device type + a shared parent = an HA pair (switch↔switch under
    // one cloud), not a hierarchy step. Different types (switch→router)
    // are hierarchy even when they share a parent.
    if (!byId[e.from] || !byId[e.to] || byId[e.from].type !== byId[e.to].type) return false;
    for (const p of preds[e.from] || []) {
      if (p !== e.from && p !== e.to && preds[e.to] && preds[e.to].has(p)) return true;
    }
    return false;
  };
  const layerEdges = edges.filter(e => !isPeer(e));

  const layerOf = {};
  const incoming = {};
  for (const n of nodes) incoming[n.id] = 0;
  for (const e of layerEdges) if (e.to in incoming) incoming[e.to]++;
  let sources = nodes.filter(n => incoming[n.id] === 0);
  if (!sources.length && nodes.length) sources = [nodes[0]];
  sources.forEach(n => { layerOf[n.id] = 0; });

  let changed = true, guard = 0;
  while (changed && guard++ < nodes.length + 2) {
    changed = false;
    for (const e of layerEdges) {
      if (layerOf[e.from] !== undefined) {
        const want = layerOf[e.from] + 1;
        if (layerOf[e.to] === undefined || layerOf[e.to] < want) {
          layerOf[e.to] = Math.min(want, nodes.length);
          changed = true;
        }
      }
    }
    // A node only reachable through a peer edge still needs a home: put it
    // beside its peer.
    for (const e of edges) {
      if (layerOf[e.from] !== undefined && layerOf[e.to] === undefined) {
        layerOf[e.to] = isPeer(e) ? layerOf[e.from] : layerOf[e.from] + 1;
        changed = true;
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

// Re-run auto-layout on whatever is on the canvas (after manual edits, or
// to flip between vertical and horizontal). Zones follow their member
// nodes: membership is captured before the layout moves everything, and
// each zone box is re-fitted around its members afterwards.
function rearrange() {
  if (!state.nodes.length) return;
  pushUndo();
  const memberships = (state.zones || []).map(z => ({ z, members: zoneMembers(z) }));
  layoutGraph(state.nodes, state.edges);
  for (const { z, members } of memberships) {
    if (!members.length) continue;
    const xs = members.map(n => n.x), ys = members.map(n => n.y);
    const pad = 28, titleH = 30;
    z.x = snap(Math.min(...xs) - pad);
    z.y = snap(Math.min(...ys) - pad - titleH);
    z.w = snap(Math.max(...xs) + NODE_W + pad - z.x);
    z.h = snap(Math.max(...ys) + NODE_H + pad - z.y);
  }
  render();
  document.getElementById('btn-zoom-fit').click();
  setStatus(`Rearranged ${layoutDir === 'horizontal' ? 'left-to-right' : 'top-down'}.`);
}

// Apply a generated diagram: replace current content (undo restores it).
function applyGenerated(nodes, edges, sourceText, note, zones) {
  pushUndo();
  state.nodes = nodes;
  state.edges = edges;
  state.zones = zones || [];
  selection = null;
  render();
  document.getElementById('btn-zoom-fit').click();
  const src = sourceText.length > 60 ? sourceText.slice(0, 57) + '…' : sourceText;
  setStatus(`Generated ${nodes.length} devices, ${edges.length} connections from: “${src}”` + (note ? ' — ' + note : ''));
}

// The built-in parser path. Returns true if it produced a diagram.
function generateFromText(text, note) {
  const parsed = parseInstruction(text);
  if (!parsed) return false;
  const { nodes, edges, layers, zoneGroups, usedFallbackChain } = buildFromGroups(parsed.groups);
  if (!nodes.length) return false;
  // Narrative text (fallback-chained) has unreliable group order — lay it
  // out by graph connectivity instead of by order of mention.
  if (usedFallbackChain) layoutGraph(nodes, edges);
  else layoutLayers(layers);
  applyGenerated(nodes, edges, text, note, makeZones(zoneGroups));
  return true;
}

// Multi-line configs with IPs/VLANs are beyond a regex grammar — those
// should go to an AI backend when one is available.
function looksComplex(text) {
  return text.length > 180 ||
    /\n/.test(text) ||
    /\b\d{1,3}(?:\.\d{1,3}){3}\b/.test(text) ||
    (/\bvlan\b/i.test(text) && text.length > 100);
}

// --- Message box wiring -----------------------------------------------------

function handleGenerate() {
  const input = document.getElementById('gen-input');
  const text = input.value.trim();
  if (!text) return;
  const hasAI = typeof window.aiGenerate === 'function';

  if (looksComplex(text) && hasAI) {
    window.aiGenerate(text);
    return;
  }
  const note = looksComplex(text)
    ? 'complex description; the AI generator (live preview) handles these best' : '';
  if (generateFromText(text, note)) return;
  if (hasAI) {
    window.aiGenerate(text);
    return;
  }
  setStatus('No devices recognized — try naming them, e.g. “connect two routers to data center plus two firewalls”.');
}

document.getElementById('btn-generate').addEventListener('click', handleGenerate);
const genInput = document.getElementById('gen-input');
genInput.addEventListener('keydown', ev => {
  // Enter generates; Shift+Enter inserts a newline (multiline configs).
  if (ev.key === 'Enter' && !ev.shiftKey) {
    ev.preventDefault();
    handleGenerate();
  }
});
// Grow the box with its content, up to the CSS max-height.
genInput.addEventListener('input', () => {
  genInput.style.height = 'auto';
  genInput.style.height = Math.min(genInput.scrollHeight, 120) + 'px';
});

const dirSelect = document.getElementById('gen-dir');
dirSelect.value = layoutDir;
dirSelect.addEventListener('change', () => {
  setLayoutDir(dirSelect.value);
  rearrange(); // flip the current diagram immediately; undo restores it
});
document.getElementById('btn-arrange').addEventListener('click', rearrange);
