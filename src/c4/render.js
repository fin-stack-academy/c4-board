// Paginas HTML de um diagrama e do modelo inteiro. Puro: recebe o desenho ja
// pronto (o SVG que o Mermaid gerou, ou qualquer HTML no lugar dele), entao a
// mesma pagina serve a previa do editor (iframe) e o arquivo exportado.
import * as C4 from './diagram.js';
import * as Model from './model.js';
import { escapeHtml as esc } from './html.js';

// Tokens do design system da fin-stack academy (assets/design-system),
// copiados para ca: o HTML exportado abre offline, sem folha externa.
const PAGE_CSS = `
:root{--bg:#f8faf8;--surface:#fff;--soft:#eef1ef;--ink:#0a0d0c;--muted:#5d6762;--line:#dfe5e1;--line-soft:#eef1ef;--accent:#b7f34a;--warn:#bf7900;--warn-bg:#fff6e0;--danger:#e3493f;--sans:Inter,'Avenir Next','Segoe UI',Helvetica,Arial,sans-serif;--mono:SFMono-Regular,Consolas,'Liberation Mono',monospace;color-scheme:light}
*{box-sizing:border-box}
body{margin:0 auto;padding:40px 44px 56px;max-width:1480px;background:var(--bg);color:var(--ink);font:15px/1.6 var(--sans);-webkit-font-smoothing:antialiased}
::selection{background:var(--accent);color:var(--ink)}
.brand{display:flex;align-items:center;gap:10px;margin:0 0 20px;font:700 11px/1 var(--mono);letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
.brand svg{width:22px;height:22px;flex:none}
.brand b{color:var(--ink)}
h1{margin:0 0 28px;padding-bottom:20px;border-bottom:1px solid var(--line);font-size:34px;font-weight:760;line-height:1.05;letter-spacing:-.045em}
h2{display:flex;align-items:center;gap:10px;margin:40px 0 14px;padding-bottom:8px;border-bottom:1px solid var(--line);font-size:19px;font-weight:720;line-height:1.2;letter-spacing:-.025em}
h2::before{content:'';flex:none;width:10px;height:10px;border-radius:50%;background:var(--accent);box-shadow:0 0 0 3px rgba(183,243,74,.25)}
h3{margin:20px 0 8px;font:700 11px/1.2 var(--mono);letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
p{margin:0 0 12px}
ul{margin:0 0 14px;padding-left:22px}
li{margin-bottom:6px}
table{width:100%;border-collapse:separate;border-spacing:0;margin:4px 0 18px;font-size:14px;background:var(--surface);border:1px solid var(--line);border-radius:12px;overflow:hidden}
th{text-align:left;font:700 10.5px/1.2 var(--mono);letter-spacing:.07em;text-transform:uppercase;color:var(--muted);background:var(--soft);padding:11px 14px;border-bottom:1px solid var(--line)}
td{padding:10px 14px;border-top:1px solid var(--line-soft);vertical-align:top}
tbody tr:first-child td{border-top:none}
.c4-diagram{margin:0 0 16px;padding:24px;background:var(--surface);border:1px solid var(--line);border-radius:12px;text-align:center;overflow:auto}
.c4-diagram svg{max-width:100%;height:auto}
.c4-error{color:var(--danger);font:12px/1.5 var(--mono);text-align:left;white-space:pre-wrap}
.c4-legend{list-style:none;padding:0;display:flex;flex-wrap:wrap;gap:8px 20px;font-size:13px}
.c4-legend li{display:flex;align-items:center;gap:8px;margin:0}
.c4-swatch{display:inline-block;width:14px;height:14px;border-radius:3px}
.c4-swatch-node{border:1px solid #aeb9b3;background:#fff}
.c4-swatch-boundary{border:1px dashed #5d6762}
.c4-swatch-person{width:22px;border-radius:7px}
.c4-swatch-db{border-radius:50%/28%}
.c4-swatch-relation{position:relative;height:0;width:22px;border-top:2px dashed #5d6762;border-radius:0}
.c4-swatch-relation::after{content:'';position:absolute;right:-6px;top:-6px;border:5px solid transparent;border-left:7px solid #5d6762}
.c4-legend-note{margin:-4px 0 14px;font-size:13px;color:var(--muted)}
.c4-warnings{margin:0 0 16px;padding:12px 16px 12px 34px;background:var(--warn-bg);border:1px solid #f0d49a;border-left:4px solid var(--warn);border-radius:12px;font-size:14px}
.origem{color:var(--muted);font:600 12px/1.4 var(--mono)}
.meta{margin-top:44px;padding-top:14px;border-top:1px solid var(--line);font:600 11px/1.4 var(--mono);letter-spacing:.02em;color:var(--muted)}
`;

// O simbolo da fin-stack academy (assets/img/fin-stack-symbol-light.svg),
// para fundo claro, sem alterar geometria nem cores.
const SYMBOL =
  '<svg viewBox="0 0 96 96" aria-hidden="true"><g shape-rendering="crispEdges"><path d="M12 18H84V36H36V78H12V18Z" fill="#0A0D0C"/><path d="M36 42H84V60H36V42Z" fill="#B7F34A"/></g></svg>';

// brand: a assinatura "C4 Board / fin-stack academy" acima do titulo — no
// documento exportado; a previa do editor ja esta dentro do app.
export function page(title, body, meta = '', brand = false) {
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>${PAGE_CSS}</style>
</head>
<body>
${brand ? `<p class="brand">${SYMBOL}<span><b>C4 Board</b> / fin-stack academy</span></p>` : ''}
<h1>${esc(title)}</h1>
${body}
${meta ? `<div class="meta">${esc(meta)}</div>` : ''}
</body>
</html>`;
}

const diagramBox = (svg) => `<div class="c4-diagram">${svg}</div>`;

// viewBody: uma visao (diagram.js) com tipo, escopo, avisos, desenho,
// legenda e tabelas.
export function viewBody(v, svg) {
  const descricao = (v.descricao ?? '').trim();
  return (
    `<p><strong>Tipo:</strong> ${C4.typeLabel(v.diagram_type)} · <strong>Nível:</strong> ${C4.level(v.diagram_type)}</p>` +
    C4.scope(v) +
    (descricao ? `<p>${esc(descricao)}</p>` : '') +
    C4.warningsHtml(v) +
    `<h2>Diagrama</h2>${diagramBox(svg)}` +
    C4.legend(v) +
    C4.elementsTable(v) +
    C4.relationsTable(v)
  );
}

// Tabelas de uma visao um nivel abaixo do titulo dela.
const viewTables = (v) => (C4.elementsTable(v) + C4.relationsTable(v)).replaceAll('<h2>', '<h3>').replaceAll('</h2>', '</h3>');

// modelBody: o documento do modelo inteiro. `svgs` na ordem de
// Model.views(data): contexto, conteineres, detalhes.
export function modelBody(data, svgs) {
  const s = data.sistema ?? {};
  const all = Model.views(data);
  const ds = Model.detalhes(data);
  let out = `<p><strong>Sistema em escopo:</strong> ${esc(s.nome ?? '')}${s.descricao ? ` — ${esc(s.descricao)}` : ''}</p>`;
  out += Model.warningsHtml(data);
  all.forEach((v, i) => {
    const descricao = (v.descricao ?? '').trim();
    out += `<h2>${esc(v.titulo)}</h2>`;
    if (i >= 2) out += Model.originHtml(data, ds[i - 2]);
    if (descricao) out += `<p>${esc(descricao)}</p>`;
    out += diagramBox(svgs[i] ?? '') + viewTables(v);
  });
  return out + Model.legend(data);
}

// Caixa de erro no lugar do desenho (Mermaid nao conseguiu renderizar).
export const errorBox = (message) => `<p class="c4-error">Não foi possível desenhar o diagrama: ${esc(message)}</p>`;
