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

### 3. Exports

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
