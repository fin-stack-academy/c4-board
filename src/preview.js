// Desenho dos diagramas com o Mermaid, no navegador. O resultado e SVG puro:
// a previa (iframe sem scripts) e o HTML exportado nao dependem do Mermaid.
import mermaid from 'mermaid';
import * as C4 from './c4/diagram.js';
import * as Model from './c4/model.js';
import { page, viewBody, modelBody, errorBox } from './c4/render.js';

// dropShadow 'none': o look padrao (neo) desenha sombra nos elementos.
// fontFamily: a sans do design system da fin-stack academy, sem baixar fonte
// (o HTML exportado funciona offline).
mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'strict',
  themeVariables: {
    dropShadow: 'none',
    nodeShadow: false,
    // Rotulos das relacoes sobre fundo branco, como nos exemplos do C4.
    edgeLabelBackground: '#ffffff',
    fontFamily: "Inter, 'Avenir Next', 'Segoe UI', Helvetica, Arial, sans-serif",
  },
});

let seq = 0;
// O Mermaid nao aceita dois render() ao mesmo tempo: uma fila serializa.
let queue = Promise.resolve();

export function svgOf(source) {
  const id = `c4-svg-${++seq}`;
  const run = queue.then(async () => {
    try {
      const { svg } = await mermaid.render(id, source);
      return svg;
    } catch (err) {
      // Um render que falha deixa o elemento temporario no documento.
      document.getElementById(`d${id}`)?.remove();
      document.getElementById(id)?.remove();
      return errorBox(String(err?.message ?? err));
    }
  });
  queue = run.catch(() => {});
  return run;
}

// A pagina de UMA visao do modelo (aba do editor), ja anotada.
export async function viewPage(data, key) {
  const v = Model.annotatedView(data, key);
  return page(v.titulo, viewBody(v, await svgOf(C4.mermaid(v))), 'Prévia');
}

// O documento do modelo inteiro (exportar HTML).
export async function modelPage(data) {
  const svgs = [];
  for (const v of Model.views(data)) svgs.push(await svgOf(C4.mermaid(v)));
  const nome = (data.sistema?.nome ?? '').trim();
  const stamp = new Date().toLocaleString('pt-BR');
  return page(nome ? `Modelo C4 — ${nome}` : 'Modelo C4', modelBody(data, svgs), `gerado em ${stamp} · C4 Board · fin-stack academy`, true);
}

// showInFrame: um iframe sem scripts para a pagina; preserva a rolagem entre
// atualizacoes (a previa e redesenhada a cada alteracao).
export function showInFrame(host, html) {
  const old = host.querySelector('iframe');
  let scroll = 0;
  try {
    scroll = old?.contentDocument?.scrollingElement?.scrollTop ?? 0;
  } catch {
    scroll = 0;
  }
  const iframe = document.createElement('iframe');
  iframe.className = 'doc-frame';
  iframe.title = 'Prévia do diagrama';
  // allow-same-origin so para ler/restaurar a rolagem; nenhum script roda.
  iframe.setAttribute('sandbox', 'allow-same-origin');
  iframe.addEventListener('load', () => {
    try {
      iframe.contentDocument.scrollingElement.scrollTop = scroll;
    } catch {
      // sem rolagem restaurada
    }
    old?.remove();
  });
  iframe.srcdoc = html;
  host.appendChild(iframe);
}
