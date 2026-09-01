/*
 * Export pipeline.
 *
 *  state ──► buildExportSvg() ── standalone SVG string (styles inlined)
 *                │
 *                ├─► .svg  download as-is
 *                ├─► .png  rasterized via <img> + <canvas> at 2x
 *                └─► .pdf  the PNG embedded in a jsPDF page
 *
 *  state ──► buildDrawioXml()  .drawio (opens in diagrams.net, which can
 *                              itself re-export to .vsdx with full fidelity)
 *  state ──► buildVsdx()       .vsdx  a minimal native Visio OPC package
 *                              built with JSZip (shapes + connectors + labels)
 */

'use strict';

const PX_PER_IN = 96; // CSS pixels per inch, used for Visio unit conversion

function xmlEscape(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;'
  }[c]));
}

function diagramBounds() {
  if (!state.nodes.length) return { x: 0, y: 0, w: 800, h: 600 };
  const xs = state.nodes.map(n => n.x), ys = state.nodes.map(n => n.y);
  const minX = Math.min(...xs) - 40, minY = Math.min(...ys) - 40;
  const maxX = Math.max(...xs) + NODE_W + 40, maxY = Math.max(...ys) + NODE_H + 40;
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

// ---------------------------------------------------------------------------
// Standalone SVG
// ---------------------------------------------------------------------------

function buildExportSvg() {
  const b = diagramBounds();
  let out = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${b.x} ${b.y} ${b.w} ${b.h}" ` +
    `width="${b.w}" height="${b.h}" font-family="Segoe UI, Helvetica, Arial, sans-serif">\n` +
    `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="#ffffff"/>\n`;

  for (const e of state.edges) {
    const p = edgePath(e);
    if (!p) continue;
    const dash = e.style === 'dashed' ? ' stroke-dasharray="7 5"' : '';
    out += `<path d="${p.d}" fill="none" stroke="#64748b" stroke-width="2"${dash}/>\n`;
    if (e.label) {
      const w = e.label.length * 6.6 + 10;
      out += `<rect x="${p.mid.x - w / 2}" y="${p.mid.y - 9}" width="${w}" height="18" rx="4" fill="#ffffff" stroke="#e2e8f0"/>\n` +
        `<text x="${p.mid.x}" y="${p.mid.y + 4}" text-anchor="middle" font-size="11" fill="#475569">${xmlEscape(e.label)}</text>\n`;
    }
  }

  for (const n of state.nodes) {
    const icon = NETWORK_ICONS[n.type];
    const pad = (NODE_W - ICON_SIZE) / 2;
    out += `<g transform="translate(${n.x},${n.y})">` +
      `<g transform="translate(${pad},10) scale(${ICON_SIZE / 64})" color="${n.color || icon.color}">${icon.svg}</g>` +
      `<text x="${NODE_W / 2}" y="${ICON_SIZE + 32}" text-anchor="middle" font-size="13" font-weight="600" fill="#1e293b">${xmlEscape(n.label)}</text>` +
      `</g>\n`;
  }
  return out + '</svg>';
}

function exportSvg() {
  downloadBlob(new Blob([buildExportSvg()], { type: 'image/svg+xml' }), 'network-diagram.svg');
}

// ---------------------------------------------------------------------------
// PNG (SVG → <img> → <canvas> → blob), at 2x for crispness
// ---------------------------------------------------------------------------

function renderPng(scale = 2) {
  return new Promise((resolve, reject) => {
    const b = diagramBounds();
    const svgStr = buildExportSvg();
    const url = URL.createObjectURL(new Blob([svgStr], { type: 'image/svg+xml' }));
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(b.w * scale);
      canvas.height = Math.round(b.h * scale);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve({ canvas, w: b.w, h: b.h });
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('SVG rasterization failed')); };
    img.src = url;
  });
}

function exportPng() {
  renderPng().then(({ canvas }) =>
    canvas.toBlob(blob => downloadBlob(blob, 'network-diagram.png'), 'image/png'));
}

// ---------------------------------------------------------------------------
// PDF via jsPDF (page sized to the diagram, so no awkward cropping)
// ---------------------------------------------------------------------------

function exportPdf() {
  renderPng().then(({ canvas, w, h }) => {
    const { jsPDF } = window.jspdf;
    const wIn = w / PX_PER_IN, hIn = h / PX_PER_IN;
    const pdf = new jsPDF({
      orientation: wIn >= hIn ? 'landscape' : 'portrait',
      unit: 'in',
      format: [Math.max(wIn, 3), Math.max(hIn, 3)]
    });
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, wIn, hIn);
    // Route through downloadBlob so all exports share one download path.
    downloadBlob(pdf.output('blob'), 'network-diagram.pdf');
  });
}

// ---------------------------------------------------------------------------
// draw.io / diagrams.net XML — the most portable editable format.
// diagrams.net opens it directly and can re-export to native .vsdx.
// ---------------------------------------------------------------------------

const DRAWIO_STYLES = {
  router: 'shape=mscae/Router', switch: 'shape=mscae/Load_Balancer_Generic',
  firewall: 'shape=mscae/Firewall', cloud: 'ellipse;shape=cloud',
  internet: 'ellipse;shape=cloud', database: 'shape=cylinder3;size=8',
  default: 'rounded=1;whiteSpace=wrap'
};

function buildDrawioXml() {
  let cells = '';
  for (const n of state.nodes) {
    const style = (DRAWIO_STYLES[n.type] || DRAWIO_STYLES.default) +
      `;fillColor=${n.color};strokeColor=#334155;fontColor=#1e293b;verticalLabelPosition=bottom;verticalAlign=top;html=1;`;
    cells += `<mxCell id="${n.id}" value="${xmlEscape(n.label)}" style="${xmlEscape(style)}" vertex="1" parent="1">` +
      `<mxGeometry x="${n.x}" y="${n.y}" width="${ICON_SIZE + 12}" height="${ICON_SIZE + 12}" as="geometry"/></mxCell>`;
  }
  for (const e of state.edges) {
    const style = 'edgeStyle=' + (e.shape === 'elbow' ? 'orthogonalEdgeStyle' : 'none') +
      ';rounded=1;html=1;strokeColor=#64748b;endArrow=none;' +
      (e.style === 'dashed' ? 'dashed=1;' : '');
    cells += `<mxCell id="${e.id}" value="${xmlEscape(e.label || '')}" style="${xmlEscape(style)}" edge="1" parent="1" ` +
      `source="${e.from}" target="${e.to}"><mxGeometry relative="1" as="geometry"/></mxCell>`;
  }
  return `<mxfile host="netdraw"><diagram name="Network">` +
    `<mxGraphModel dx="800" dy="600" grid="1" gridSize="8" page="1" pageWidth="1100" pageHeight="850">` +
    `<root><mxCell id="0"/><mxCell id="1" parent="0"/>${cells}</root>` +
    `</mxGraphModel></diagram></mxfile>`;
}

function exportDrawio() {
  downloadBlob(new Blob([buildDrawioXml()], { type: 'application/xml' }), 'network-diagram.drawio');
}

// ---------------------------------------------------------------------------
// Native Visio .vsdx
//
// A .vsdx file is just a ZIP ("OPC package") of XML parts, like .docx/.xlsx.
// We build the minimal valid part set with JSZip:
//
//   [Content_Types].xml            declares each part's content type
//   _rels/.rels                    points to visio/document.xml
//   visio/document.xml             document root
//   visio/_rels/document.xml.rels  points to pages/pages.xml
//   visio/pages/pages.xml          page index (size, name)
//   visio/pages/_rels/...          points to page1.xml
//   visio/pages/page1.xml          the actual shapes and connectors
//
// Visio's coordinate system is inches with the origin at the BOTTOM-left,
// so we convert px → inches and flip the Y axis. Nodes become rounded
// rectangles (Visio has no idea about our SVG icons) carrying the node's
// fill color and label; connections become line shapes with labels.
// ---------------------------------------------------------------------------

const VISIO_NS = 'http://schemas.microsoft.com/office/visio/2012/main';
const REL_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

function buildVsdx() {
  const b = diagramBounds();
  const pageW = Math.max(8.5, b.w / PX_PER_IN + 1);
  const pageH = Math.max(8.5, b.h / PX_PER_IN + 1);
  // px (top-left origin) → inches (bottom-left origin), with a margin
  const ix = px => (px - b.x) / PX_PER_IN + 0.5;
  const iy = px => pageH - ((px - b.y) / PX_PER_IN + 0.5);

  let shapes = '';
  let shapeId = 1;
  const nodeShapeIds = {};

  for (const n of state.nodes) {
    const id = shapeId++;
    nodeShapeIds[n.id] = id;
    const w = (ICON_SIZE + 12) / PX_PER_IN, h = (ICON_SIZE + 12) / PX_PER_IN;
    const cx = ix(n.x + NODE_W / 2), cy = iy(n.y + 10 + ICON_SIZE / 2);
    shapes += `
   <Shape ID="${id}" Type="Shape" LineStyle="0" FillStyle="0" TextStyle="0">
    <Cell N="PinX" V="${cx.toFixed(4)}"/><Cell N="PinY" V="${cy.toFixed(4)}"/>
    <Cell N="Width" V="${w.toFixed(4)}"/><Cell N="Height" V="${h.toFixed(4)}"/>
    <Cell N="LocPinX" V="${(w / 2).toFixed(4)}"/><Cell N="LocPinY" V="${(h / 2).toFixed(4)}"/>
    <Cell N="FillForegnd" V="${n.color}"/>
    <Cell N="LineColor" V="#334155"/>
    <Cell N="Rounding" V="0.0625"/>
    <Cell N="VerticalAlign" V="1"/>
    <Section N="Geometry" IX="0">
     <Cell N="NoFill" V="0"/><Cell N="NoLine" V="0"/>
     <Row T="RelMoveTo" IX="1"><Cell N="X" V="0"/><Cell N="Y" V="0"/></Row>
     <Row T="RelLineTo" IX="2"><Cell N="X" V="1"/><Cell N="Y" V="0"/></Row>
     <Row T="RelLineTo" IX="3"><Cell N="X" V="1"/><Cell N="Y" V="1"/></Row>
     <Row T="RelLineTo" IX="4"><Cell N="X" V="0"/><Cell N="Y" V="1"/></Row>
     <Row T="RelLineTo" IX="5"><Cell N="X" V="0"/><Cell N="Y" V="0"/></Row>
    </Section>
    <Text>${xmlEscape(n.label)}</Text>
   </Shape>`;
  }

  for (const e of state.edges) {
    const a = nodeById(e.from), bn = nodeById(e.to);
    if (!a || !bn) continue;
    const id = shapeId++;
    const ca = nodeCenter(a), cb = nodeCenter(bn);
    const x1 = ix(ca.x), y1 = iy(ca.y), x2 = ix(cb.x), y2 = iy(cb.y);
    const w = Math.max(Math.abs(x2 - x1), 0.001), h = Math.max(Math.abs(y2 - y1), 0.001);
    const minx = Math.min(x1, x2), miny = Math.min(y1, y2);
    // Local geometry runs corner-to-corner inside the bounding box.
    const gx1 = x1 - minx, gy1 = y1 - miny, gx2 = x2 - minx, gy2 = y2 - miny;
    const dash = e.style === 'dashed' ? '<Cell N="LinePattern" V="2"/>' : '';
    shapes += `
   <Shape ID="${id}" Type="Shape" LineStyle="0" FillStyle="0" TextStyle="0">
    <Cell N="PinX" V="${(minx + w / 2).toFixed(4)}"/><Cell N="PinY" V="${(miny + h / 2).toFixed(4)}"/>
    <Cell N="Width" V="${w.toFixed(4)}"/><Cell N="Height" V="${h.toFixed(4)}"/>
    <Cell N="LocPinX" V="${(w / 2).toFixed(4)}"/><Cell N="LocPinY" V="${(h / 2).toFixed(4)}"/>
    <Cell N="LineColor" V="#64748b"/>${dash}
    <Section N="Geometry" IX="0">
     <Cell N="NoFill" V="1"/><Cell N="NoLine" V="0"/>
     <Row T="MoveTo" IX="1"><Cell N="X" V="${gx1.toFixed(4)}"/><Cell N="Y" V="${gy1.toFixed(4)}"/></Row>
     <Row T="LineTo" IX="2"><Cell N="X" V="${gx2.toFixed(4)}"/><Cell N="Y" V="${gy2.toFixed(4)}"/></Row>
    </Section>
    ${e.label ? `<Text>${xmlEscape(e.label)}</Text>` : ''}
   </Shape>`;
  }

  const page1 = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<PageContents xmlns="${VISIO_NS}" xmlns:r="${REL_NS}" xml:space="preserve">
 <Shapes>${shapes}
 </Shapes>
</PageContents>`;

  const pages = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Pages xmlns="${VISIO_NS}" xmlns:r="${REL_NS}" xml:space="preserve">
 <Page ID="0" NameU="Page-1" Name="Page-1">
  <PageSheet LineStyle="0" FillStyle="0" TextStyle="0">
   <Cell N="PageWidth" V="${pageW.toFixed(4)}"/>
   <Cell N="PageHeight" V="${pageH.toFixed(4)}"/>
   <Cell N="PageScale" V="1" U="IN_F"/>
   <Cell N="DrawingScale" V="1" U="IN_F"/>
  </PageSheet>
  <Rel r:id="rId1"/>
 </Page>
</Pages>`;

  const document_ = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<VisioDocument xmlns="${VISIO_NS}" xmlns:r="${REL_NS}" xml:space="preserve">
 <DocumentSettings TopPage="0" DefaultTextStyle="0" DefaultLineStyle="0" DefaultFillStyle="0" DefaultGuideStyle="0"/>
</VisioDocument>`;

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
 <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
 <Default Extension="xml" ContentType="application/xml"/>
 <Override PartName="/visio/document.xml" ContentType="application/vnd.ms-visio.drawing.main+xml"/>
 <Override PartName="/visio/pages/pages.xml" ContentType="application/vnd.ms-visio.pages+xml"/>
 <Override PartName="/visio/pages/page1.xml" ContentType="application/vnd.ms-visio.page+xml"/>
</Types>`;

  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
 <Relationship Id="rId1" Type="http://schemas.microsoft.com/visio/2010/relationships/document" Target="visio/document.xml"/>
</Relationships>`;

  const docRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
 <Relationship Id="rId1" Type="http://schemas.microsoft.com/visio/2010/relationships/pages" Target="pages/pages.xml"/>
</Relationships>`;

  const pagesRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
 <Relationship Id="rId1" Type="http://schemas.microsoft.com/visio/2010/relationships/page" Target="page1.xml"/>
</Relationships>`;

  const zip = new JSZip();
  zip.file('[Content_Types].xml', contentTypes);
  zip.file('_rels/.rels', rootRels);
  zip.file('visio/document.xml', document_);
  zip.file('visio/_rels/document.xml.rels', docRels);
  zip.file('visio/pages/pages.xml', pages);
  zip.file('visio/pages/_rels/pages.xml.rels', pagesRels);
  zip.file('visio/pages/page1.xml', page1);
  return zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.ms-visio.drawing'
  });
}

function exportVsdx() {
  buildVsdx().then(blob => downloadBlob(blob, 'network-diagram.vsdx'));
}

// ---------------------------------------------------------------------------
// Toolbar wiring
// ---------------------------------------------------------------------------

document.getElementById('btn-export-png').addEventListener('click', exportPng);
document.getElementById('btn-export-svg').addEventListener('click', exportSvg);
document.getElementById('btn-export-pdf').addEventListener('click', exportPdf);
document.getElementById('btn-export-drawio').addEventListener('click', exportDrawio);
document.getElementById('btn-export-vsdx').addEventListener('click', exportVsdx);
