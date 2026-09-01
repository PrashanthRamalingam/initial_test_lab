# NetDraw — Visio-style Network Diagram Editor

A browser-based network diagram editor in the spirit of eraser.io / Visio:
drag professional network icons onto a canvas, wire them together, and export
to **PNG, SVG, PDF, native Visio (.vsdx), and draw.io** formats.

No build step, no backend, no framework — open `index.html` in a browser
(or host the folder on GitHub Pages / any static host) and it works.

```
network-diagram-app/
├── index.html      app shell: toolbar, palette, SVG canvas, properties panel
├── styles.css      layout and theming
└── js/
    ├── icons.js    the network icon library (inline SVG, 64x64 viewBox each)
    ├── app.js      editor: state, drag/drop, connect, undo, zoom/pan, autosave
    └── export.js   PNG / SVG / PDF / .vsdx / .drawio generation
```

## How the pieces work

### 1. Icons — the eraser.io question

Sites like eraser.io don't ship icon *files* at runtime; their icons are
**inline SVG vector definitions**. That's what `js/icons.js` does: each
device (router, switch, firewall, server, …) is a snippet of SVG markup in a
shared 64×64 viewBox. Benefits:

- **Scale-free** — crisp at any zoom level, unlike PNG icons.
- **Recolorable** — icons use `currentColor`, so changing a node's color in
  the properties panel re-tints the icon instantly.
- **Export-ready** — the same markup serializes directly into the SVG/PNG/PDF
  exports; there are no external assets to bundle or license.

To add a device type, add one entry to `NETWORK_ICONS` (and `ICON_ORDER`);
the palette, editor, and exporters pick it up automatically. If you want
vendor-accurate stencils later, sources with permissive licensing include
Cisco's official icon library (free to use in diagrams), AWS/Azure
architecture icon sets, and open sets like Tabler or Lucide — paste their
SVG path data into `icons.js` in the same format.

### 2. The editor

The canvas is one big `<svg>` element. A single `state` object
(`{nodes, edges}`) is the source of truth; every interaction mutates state
and re-renders the scene from it (a tiny version of the pattern React uses).
That makes undo/redo trivial (snapshot the JSON), autosave trivial
(`localStorage`), and file save/open trivial (download/upload the JSON).

Interactions implemented: drag-from-palette (HTML5 drag & drop),
click-to-add, move with grid snapping, a connect mode with live preview
line, straight and right-angle (elbow) edge routing, solid/dashed lines,
edge labels, double-click rename, per-node colors, wheel zoom around the
cursor, canvas panning, fit-to-view, and keyboard shortcuts.

### 3. Text-to-diagram (the message box)

Type a description into the message box at the bottom of the canvas —

> connect two routers to data center plus two firewall

— and `js/generate.js` builds the diagram (replacing the current one;
undo restores it). It is a deterministic parser, so it works offline with
no API key:

1. The sentence is split into device **groups** at connector words
   (`to`, `plus`, `and`, `then`, `with`, `,`, `->`).
2. Each group is scanned against a synonym vocabulary (`router`, `fw`,
   `data center`, `access point`, `pc`, …) with optional counts
   ("two routers", "3 switches", "a firewall").
3. Consecutive groups get connected — pairwise when the counts match,
   otherwise everything-to-everything — and laid out as centered rows,
   top to bottom.

The example above yields: Router 1 & 2 → Data Center → Firewall 1 & 2.

The grammar also understands real network language:

- **Hostnames** — `bprt-01-rt01 router connects via fiber to 24 port
  switch swg-01` labels the nodes `bprt-01-rt01` and `swg-01`. A bare
  hostname works too: the device type is inferred from the name
  (`rt`/`rw` → router, `sw`/`sc` → switch, `fw` → firewall, …), and "24
  port" is understood as a description, not a quantity.
- **Link labels** — connection words become edge labels: `via fiber`,
  `trunk`, `intra link`, port-channels (`Po5.501`), interfaces
  (`Eth8/4`, `Te0/1/4`), speeds (`10g`), protocols (`bgp`, `mpls`).
- **De-duplication** — the same hostname is always one node, and repeated
  unnamed mentions of singleton infrastructure (Azure/cloud, internet,
  data center, DNS, CDN) collapse into one node, so a paragraph that says
  "Azure" eleven times draws one cloud.

Long multi-line configs (IP addresses, VLAN tables) exceed what a regex
grammar can do, so `handleGenerate()` routes those to `window.aiGenerate`
when it is defined — the hosted live-preview artifact plugs Claude in
there (hostnames verbatim as node labels, interfaces/port-channels as
edge labels); a self-hosted deployment could call the Claude API
server-side through the same hook.

### 4. Exports

All exports derive from the same state, so they match the canvas exactly:

| Format | How |
|---|---|
| **SVG** | `buildExportSvg()` re-generates a standalone SVG string from state with all styles inlined (no CSS classes), so it renders anywhere. |
| **PNG** | The SVG string is loaded into an `<img>`, drawn onto a `<canvas>` at 2× resolution, and saved with `canvas.toBlob()`. Pure browser APIs. |
| **PDF** | The PNG is embedded into a [jsPDF](https://github.com/parallax/jsPDF) page sized exactly to the diagram. |
| **Visio (.vsdx)** | A `.vsdx` is just a ZIP of XML parts (an OPC package, like `.docx`). `buildVsdx()` assembles the minimal part set — `[Content_Types].xml`, relationship files, `pages.xml`, `page1.xml` — with [JSZip](https://stuk.github.io/jszip/). Nodes become colored rounded rectangles with labels, edges become line shapes (Visio measures in inches from the bottom-left, so coordinates are converted and Y-flipped). Visio can't render our SVG icons natively, so this export favors editability over looks. |
| **draw.io** | `buildDrawioXml()` emits diagrams.net's `mxGraphModel` XML. This is the best *editable* interchange format: [diagrams.net](https://app.diagrams.net) opens it directly and can itself re-export to `.vsdx` with higher fidelity than our minimal writer. |

## Running it

```bash
cd network-diagram-app
python3 -m http.server 8080   # or just double-click index.html
# open http://localhost:8080
```

The only network dependencies are two pinned CDN scripts (JSZip, jsPDF); the
editor itself works offline once loaded.

## Ideas for the next iteration

- Connection anchor points (N/S/E/W ports) instead of center-to-center.
- Multi-select + marquee selection, copy/paste, alignment guides.
- Grouping/containers (VLAN zones, subnets as labeled boxes).
- Arrowheads and per-edge colors.
- Server-side rendering of true Visio stencils via `python-vsdx` or Aspose if
  pixel-perfect `.vsdx` output becomes a hard requirement.
- Collaboration (share state over WebSocket — the state JSON is small).
