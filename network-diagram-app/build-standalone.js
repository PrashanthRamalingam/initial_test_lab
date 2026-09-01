#!/usr/bin/env node
/*
 * Builds netdraw-standalone.html — the whole app in ONE file with zero
 * external references (vendored JSZip/jsPDF inlined, CSS inlined, no
 * service worker, no manifest). Open it by double-clicking; works from
 * file://, a network share, or an email attachment. For locked-down
 * machines where hosted sites are blocked.
 *
 *   node build-standalone.js        (writes ../netdraw-standalone.html)
 */

const fs = require('fs');
const path = require('path');
const APP = __dirname;
const read = f => fs.readFileSync(path.join(APP, f), 'utf8');

// "</script" inside inlined JS would terminate the script tag early.
// \/ === / in JS strings and regexes, so this escape never changes behavior.
const js = f => read(f).replace(/<\/script/gi, '<\\/script');

let body = read('index.html').match(/<body>([\s\S]*)<\/body>/)[1];
// Strip the external script tags and the service-worker registration —
// everything is inlined below, and SW doesn't apply to file://.
body = body.replace(/<script[\s\S]*?<\/script>\s*/g, '');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>NetDraw — Network Diagram Editor (standalone)</title>
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><circle cx='32' cy='32' r='26' fill='%232563eb'/><g stroke='white' stroke-width='4' stroke-linecap='round' fill='none'><path d='M20 26 h16'/><path d='M31 20 l7 6 -7 6'/><path d='M44 38 h-16'/><path d='M33 32 l-7 6 7 6'/></g></svg>">
<style>
${read('styles.css')}
</style>
</head>
<body>
${body}
<script>
${js('js/vendor/jszip.min.js')}
</script>
<script>
${js('js/vendor/jspdf.umd.min.js')}
</script>
<script>
${js('js/icons.js')}
${js('js/app.js')}
${js('js/export.js')}
${js('js/generate.js')}
</script>
</body>
</html>
`;

const out = path.join(APP, '..', 'netdraw-standalone.html');
fs.writeFileSync(out, html);
console.log('wrote', out, Math.round(html.length / 1024) + 'KB');
