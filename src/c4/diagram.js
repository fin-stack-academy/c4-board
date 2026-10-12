// Renderizacao e conformidade dos diagramas C4 (contexto, conteiner,
// componente, implantacao). Um diagrama e um MODELO (escopo, elementos,
// relacoes); o Mermaid, a legenda, as tabelas e a verificacao das regras do
// C4 sao sempre codigo — nunca texto livre.
//
// Regras extraidas de https://c4model.com/diagrams/system-context,
// /container e /component:
//   - contexto: UM sistema de software em escopo, cercado das pessoas e
//     sistemas externos ligados diretamente a ele; sem tecnologia/protocolo;
//     publico: todos, inclusive nao tecnicos.
//   - conteiner: aplicacoes e bancos de dados dentro da fronteira do sistema,
//     com as principais escolhas de tecnologia e como se comunicam; nada de
//     implantacao (cluster, balanceador, replicacao, failover) — isso vai
//     num diagrama de implantacao, um por ambiente.
//   - componente: escopo e UM conteiner; componentes com responsabilidade e
//     tecnologia/implementacao; opcional ("so se agregar valor").
//   - todo diagrama tem legenda (diagram key); elementos de apoio sao os
//     "diretamente conectados" ao escopo — um elemento sem relacao nao
//     deveria estar no diagrama.
import { escapeHtml as esc } from './html.js';

export const isC4 = (diagramType) => (diagramType ?? '').startsWith('c4-');

// Estruturado = tipo C4 com o modelo de elementos preenchido.
export const isStructured = (data) => isC4(data.diagram_type) && (data.elementos ?? []).length > 0;

// Nivel hierarquico: deterministico a partir do tipo.
export function level(diagramType) {
  return { 'c4-context': 'Strategic', 'c4-container': 'Strategic', 'c4-deployment': 'Strategic', 'c4-component': 'Product' }[diagramType] ?? 'Tactical';
}

export function typeLabel(diagramType) {
  return {
    'c4-context': 'Contexto de sistema (C4)',
    'c4-container': 'Contêiner (C4)',
    'c4-component': 'Componente (C4)',
    'c4-deployment': 'Implantação (C4)',
  }[diagramType] ?? esc(diagramType);
}

function audience(diagramType) {
  return {
    'c4-context': 'Todos — pessoas técnicas e não técnicas, dentro e fora do time de desenvolvimento.',
    'c4-container': 'Pessoas técnicas dentro e fora do time — arquitetos, desenvolvedores e operação/suporte.',
    'c4-component': 'Arquitetos e desenvolvedores.',
    'c4-deployment': 'Pessoas técnicas dentro e fora do time — arquitetos, desenvolvedores, infraestrutura e operação/suporte.',
  }[diagramType] ?? '';
}

export function elementTypeLabel(tipo) {
  return {
    pessoa: 'Pessoa',
    sistema: 'Sistema de software',
    sistema_externo: 'Sistema externo',
    container: 'Contêiner',
    banco_dados: 'Contêiner: banco de dados',
    componente: 'Componente',
    no_implantacao: 'Nó de implantação',
  }[tipo] ?? tipo;
}

// Paleta dos elementos — design system da fin-stack academy. Como no C4
// original (tons de uma mesma cor para sistema > conteiner > componente e
// cinza para o externo), a cor comum e o verde-sinal: escuro no sistema em
// escopo, sinal no conteiner, claro no componente. Pessoa em preto mineral;
// externo em cinza neutro, sem verde, para nao se confundir com o escopo.
// Os tons tambem se distinguem em escala de cinza, e o [tipo] escrito na
// caixa nunca deixa a cor sozinha.
// No de implantacao nao e uma classe: vira subgraph e recebe `style` proprio.
const PALETTE = {
  pessoa: { fill: '#0A0D0C', stroke: '#0A0D0C', color: '#FFFFFF' },
  sistema: { fill: '#4A7A12', stroke: '#3A610D', color: '#FFFFFF' },
  externo: { fill: '#AEB9B3', stroke: '#8A958F', color: '#0A0D0C' },
  container: { fill: '#B7F34A', stroke: '#8CC22A', color: '#0A0D0C' },
  componente: { fill: '#DDF8A9', stroke: '#9CDD2E', color: '#0A0D0C' },
};
// Linhas e fronteiras: o texto suave do design system.
const LINE = '#5D6762';

function elementClass(tipo) {
  return { pessoa: 'pessoa', sistema: 'sistema', sistema_externo: 'externo', container: 'container', banco_dados: 'container', componente: 'componente' }[tipo] ?? 'externo';
}

function classColor(cssClass) {
  return (PALETTE[cssClass] ?? PALETTE.externo).fill;
}

const classDefs = () =>
  Object.entries(PALETTE)
    .map(([name, c]) => `    classDef ${name} fill:${c.fill},stroke:${c.stroke},color:${c.color}\n`)
    .join('');

// mm escapa texto do usuario para dentro de um rotulo Mermaid entre aspas.
// Entidades Mermaid (#quot; #lt; ...), nao HTML. "#" primeiro, senao as
// entidades introduzidas abaixo seriam re-escapadas.
export function mm(text) {
  return String(text ?? '')
    .replaceAll('#', '#35;')
    .replaceAll('"', '#quot;')
    .replaceAll('<', '#lt;')
    .replaceAll('>', '#gt;')
    .replaceAll('\r', ' ')
    .replaceAll('\n', ' ');
}

// clip corta o texto para caber numa caixa do desenho, como nos exemplos do
// c4model.com (nome, [tipo: tecnologia] e uma frase curta). Corta em
// fronteira de palavra e marca o corte com "…"; o texto inteiro continua nas
// tabelas de elementos e relacoes, abaixo do diagrama.
export function clip(text, max) {
  const t = String(text ?? '').trim();
  if (t.length <= max) return t;
  let out = '';
  let full = false;
  for (const w of t.split(' ')) {
    const next = out === '' ? w : `${out} ${w}`;
    if (!full && next.length <= max) out = next;
    else full = true;
  }
  if (out === '') return `${t.split(' ')[0]}…`;
  return `${out}…`;
}

const indexOfId = (elementos, id) => elementos.findIndex((el) => el.id === id);

function nameOf(elementos, id) {
  const i = indexOfId(elementos, id);
  return i < 0 ? id : elementos[i].nome;
}

// Um no_pai so vale se apontar para um no de implantacao existente (e nao
// para o proprio elemento); qualquer outra coisa trata o elemento como raiz
// — ele ainda aparece no desenho, e check() aponta o problema.
function effectiveParent(elementos, el) {
  const pai = el.no_pai ?? '';
  if (pai === '' || pai === el.id) return '';
  const i = indexOfId(elementos, pai);
  if (i < 0 || elementos[i].tipo !== 'no_implantacao') return '';
  return pai;
}

// Limites do texto dentro do desenho (caracteres). O no de implantacao e um
// subgraph: a descricao dele so vai para a tabela.
const MAX_TECNOLOGIA = 32;
const MAX_DESCRICAO = 80;
const MAX_RELACAO = 48;

// Tipografia dos exemplos do c4model.com (Structurizr): nome grande em
// negrito, [tipo] bem menor e a descricao num tamanho intermediario. Os
// tamanhos vao inline no rotulo para que o Mermaid ja meca a caixa com eles.
const FONT = { nome: 18, tipo: 11, descricao: 13, relacao: 13, tecnologia: 11 };
const BOX = { minWidth: 170, padX: 6, padY: 12 };

const nameSpan = (text, size = FONT.nome) => `<b style='font-size:${size}px'>${text}</b>`;
const kindSpan = (text) => `<span style='font-size:${FONT.tipo}px;font-weight:normal'>[${text}]</span>`;

function nodeLabel(el) {
  const tecnologia = clip(el.tecnologia ?? '', MAX_TECNOLOGIA);
  let kind = elementTypeLabel(el.tipo);
  if (tecnologia !== '') kind = `${kind}: ${mm(tecnologia)}`;
  let label = `${nameSpan(mm(el.nome))}<br/>${kindSpan(kind)}`;
  const descricao = clip(el.descricao ?? '', MAX_DESCRICAO);
  if (descricao !== '' && el.tipo !== 'no_implantacao') {
    label = `${label}<span style='display:block;margin-top:6px;font-size:${FONT.descricao}px;font-weight:normal'>${mm(descricao)}</span>`;
  }
  // O look neo do Mermaid fixa o padding das caixas; o respiro e a largura
  // minima dos exemplos do C4 vao no proprio rotulo (o no de implantacao e
  // um subgraph: o titulo dele nao precisa disso).
  if (el.tipo === 'no_implantacao') return label;
  return `<span style='display:inline-block;min-width:${BOX.minWidth}px;padding:${BOX.padY}px ${BOX.padX}px'>${label}</span>`;
}

function nodeLine(el, i) {
  const label = nodeLabel(el);
  const shape = el.tipo === 'pessoa' ? `(["${label}"])` : el.tipo === 'banco_dados' ? `[("${label}")]` : `["${label}"]`;
  return `    n${i}${shape}:::${elementClass(el.tipo)}`;
}

// deploymentNodes desenha a arvore de nos de implantacao como subgraphs
// aninhados (no_pai), com os conteineres dentro do no onde rodam. Um ciclo
// entre nos nunca e alcancado a partir da raiz, entao a recursao termina —
// o ciclo so some do desenho e check() o denuncia.
function deploymentNodes(elementos, parent) {
  let out = '';
  elementos.forEach((el, i) => {
    if (effectiveParent(elementos, el) !== parent) return;
    if (el.tipo === 'no_implantacao') {
      out += `    subgraph n${i}["${nodeLabel(el)}"]\n${deploymentNodes(elementos, el.id)}    end\n    style n${i} fill:#FFFFFF,stroke:#AEB9B3,color:#0A0D0C\n`;
    } else {
      out += `${nodeLine(el, i)}\n`;
    }
  });
  return out;
}

// insideBoundary: quais elementos ficam dentro da fronteira do escopo —
// conteineres na fronteira do sistema (diagrama de conteiner), componentes
// na fronteira do conteiner (diagrama de componente).
function insideBoundary(diagramType, tipo) {
  if (diagramType === 'c4-container') return tipo === 'container' || tipo === 'banco_dados';
  if (diagramType === 'c4-component') return tipo === 'componente';
  return false;
}

// Fronteiras explicitas (`fronteiras` + `fronteira` em cada elemento): um
// diagrama de conteiner pode mostrar mais de um sistema de software. Sem
// elas, vale a fronteira unica do escopo, decidida pelo tipo.
const fronteirasOf = (data) => (data.diagram_type === 'c4-container' ? data.fronteiras ?? [] : []);

function boundaryLine(b, nome, kind, inside) {
  return `    subgraph b${b}["${nameSpan(mm(nome), FONT.descricao)}<br/>${kindSpan(kind)}"]\n${inside}    end\n    style b${b} fill:none,stroke:${LINE},stroke-dasharray:6 4,color:${LINE}\n`;
}

function explicitBoundaries(data) {
  const elementos = data.elementos;
  const fronteiras = fronteirasOf(data);
  const ids = fronteiras.map((f) => f.id);
  let out = '';
  elementos.forEach((el, i) => {
    if (!ids.includes(el.fronteira ?? '')) out += `${nodeLine(el, i)}\n`;
  });
  fronteiras.forEach((f, b) => {
    let inside = '';
    elementos.forEach((el, j) => {
      if ((el.fronteira ?? '') === f.id) inside += `    ${nodeLine(el, j)}\n`;
    });
    out += boundaryLine(b, f.nome ?? '', 'Sistema de software', inside);
  });
  return out;
}

function relationLine(elementos, rel) {
  const de = indexOfId(elementos, rel.de);
  const para = indexOfId(elementos, rel.para);
  if (de < 0 || para < 0) return '';
  let label = `<span style='font-size:${FONT.relacao}px;font-weight:normal'>${mm(clip(rel.descricao ?? '', MAX_RELACAO))}</span>`;
  const tecnologia = clip(rel.tecnologia ?? '', MAX_TECNOLOGIA);
  if (tecnologia !== '') label = `${label}<br/>${kindSpan(mm(tecnologia))}`;
  return `    n${de} -->|"${label}"| n${para}\n`;
}

// mermaid: o codigo Mermaid de um diagrama C4 estruturado.
export function mermaid(data) {
  const t = data.diagram_type;
  const elementos = data.elementos ?? [];
  const relacoes = data.relacoes ?? [];
  // wrappingWidth: o padrao do Mermaid (200px) quebra cada caixa numa coluna
  // estreita e alta; 280px aproxima as proporcoes dos exemplos do c4model.com.
  let out =
    '%%{init: {"flowchart": {"wrappingWidth": 280}}}%%\n' +
    'flowchart TB\n' +
    classDefs();

  if (t === 'c4-deployment') {
    out += deploymentNodes(elementos, '');
  } else if (fronteirasOf(data).length) {
    out += explicitBoundaries(data);
  } else {
    let outside = '';
    let inside = '';
    elementos.forEach((el, i) => {
      if (insideBoundary(t, el.tipo)) inside += `    ${nodeLine(el, i)}\n`;
      else outside += `${nodeLine(el, i)}\n`;
    });
    out += outside;
    if (inside !== '') out += boundaryLine(0, data.escopo?.nome ?? '', t === 'c4-container' ? 'Sistema de software' : 'Contêiner', inside);
  }

  for (const rel of relacoes) out += relationLine(elementos, rel);
  // Relacoes tracejadas, como na notacao de referencia do C4.
  if (relacoes.length) out += `    linkStyle default stroke:${LINE},stroke-dasharray:5 5\n`;
  return out;
}

// legend: a "diagram key" que toda pagina do c4model.com traz — so os tipos
// de fato presentes neste diagrama, mais fronteira e relacao. A notacao pede
// que a legenda explique formas, cores, bordas, linhas e setas: cada amostra
// tem a forma e a cor do desenho, e o texto diz o que a borda/linha significa.
function swatch(tipo) {
  if (tipo === 'no_implantacao') return '<span class="c4-swatch c4-swatch-node"></span>';
  const shape = tipo === 'pessoa' ? ' c4-swatch-person' : tipo === 'banco_dados' ? ' c4-swatch-db' : '';
  return `<span class="c4-swatch${shape}" style="background:${classColor(elementClass(tipo))}"></span>`;
}

function legendLabel(tipo) {
  const label = elementTypeLabel(tipo);
  if (tipo === 'pessoa') return `${label} (caixa arredondada)`;
  if (tipo === 'banco_dados') return `${label} (cilindro)`;
  if (tipo === 'no_implantacao') return `${label} (caixa branca que contém o que roda nela)`;
  return label;
}

export function legend(data) {
  if (!isStructured(data)) return '';
  let items = '';
  const seen = new Set();
  for (const el of data.elementos) {
    const label = elementTypeLabel(el.tipo);
    if (seen.has(label)) continue;
    seen.add(label);
    items += `<li>${swatch(el.tipo)}${esc(legendLabel(el.tipo))}</li>`;
  }
  const t = data.diagram_type;
  if (t === 'c4-container' || t === 'c4-component') {
    const boundary =
      t === 'c4-component' ? 'Fronteira do contêiner em escopo' : fronteirasOf(data).length > 1 ? 'Fronteira de um sistema de software' : 'Fronteira do sistema em escopo';
    items += `<li><span class="c4-swatch c4-swatch-boundary"></span>${boundary} (borda tracejada)</li>`;
  }
  if ((data.relacoes ?? []).length) items += '<li><span class="c4-swatch c4-swatch-relation"></span>Relação unidirecional (linha tracejada; a seta aponta o sentido)</li>';
  const note =
    '<p class="c4-legend-note">Em cada caixa: o nome em negrito, [tipo: tecnologia] e as responsabilidades. ' +
    'Em cada relação: o que ela faz, no sentido da seta, e [tecnologia/protocolo], quando houver.</p>';
  return `<h2>Legenda</h2><ul class="c4-legend">${items}</ul>${note}`;
}

export function scope(data) {
  const t = data.diagram_type;
  if (!isC4(t)) return '';
  let out = '';
  const nome = data.escopo?.nome ?? '';
  if (nome !== '') {
    const descricao = data.escopo?.descricao ?? '';
    out += `<p><strong>Escopo:</strong> ${esc(nome)}${descricao === '' ? '' : ` — ${esc(descricao)}`}</p>`;
  }
  const ambiente = data.ambiente ?? '';
  if (t === 'c4-deployment' && ambiente !== '') out += `<p><strong>Ambiente:</strong> ${esc(ambiente)}</p>`;
  out += `<p><strong>Público:</strong> ${audience(t)}</p>`;
  return out;
}

function boundaryName(fronteiras, id) {
  return fronteiras.find((f) => f.id === id)?.nome ?? '';
}

export function elementsTable(data) {
  if (!isStructured(data)) return '';
  const deployment = data.diagram_type === 'c4-deployment';
  const fronteiras = fronteirasOf(data);
  const dentro = deployment || fronteiras.length > 0;
  const elementos = data.elementos;
  const head = `<tr><th>Elemento</th><th>Tipo</th><th>Tecnologia</th>${dentro ? '<th>Dentro de</th>' : ''}<th>Descrição</th></tr>`;
  const rows = elementos
    .map((el) => {
      const tecnologia = el.tecnologia ?? '';
      let paiNome = '';
      if (deployment) {
        const parent = effectiveParent(elementos, el);
        paiNome = parent === '' ? '' : nameOf(elementos, parent);
      } else {
        paiNome = boundaryName(fronteiras, el.fronteira ?? '');
      }
      return (
        `<tr><td>${esc(el.nome)}</td><td>${esc(elementTypeLabel(el.tipo))}</td><td>${tecnologia === '' ? '—' : esc(tecnologia)}</td>` +
        (dentro ? `<td>${paiNome === '' ? '—' : esc(paiNome)}</td>` : '') +
        `<td>${esc(el.descricao ?? '')}</td></tr>`
      );
    })
    .join('');
  return `<h2>Elementos</h2><table><thead>${head}</thead><tbody>${rows}</tbody></table>`;
}

export function relationsTable(data) {
  if (!isStructured(data)) return '';
  const relacoes = data.relacoes ?? [];
  if (!relacoes.length) return '';
  const elementos = data.elementos;
  const rows = relacoes
    .map((rel) => {
      const tecnologia = rel.tecnologia ?? '';
      return `<tr><td>${esc(nameOf(elementos, rel.de))}</td><td>${esc(nameOf(elementos, rel.para))}</td><td>${esc(rel.descricao ?? '')}</td><td>${tecnologia === '' ? '—' : esc(tecnologia)}</td></tr>`;
    })
    .join('');
  return `<h2>Relações</h2><table><thead><tr><th>De</th><th>Para</th><th>Descrição</th><th>Tecnologia</th></tr></thead><tbody>${rows}</tbody></table>`;
}

// --- Conformidade -----------------------------------------------------

const countType = (elementos, tipo) => elementos.filter((el) => el.tipo === tipo).length;
const namesOfTypes = (elementos, tipos) => elementos.filter((el) => tipos.includes(el.tipo)).map((el) => el.nome).join(', ');
const blank = (text) => (text ?? '').trim() === '';

// check: violacoes das regras C4 dentro de UM diagrama. Texto cru (nomes sem
// escape) — warningsHtml escapa na renderizacao.
export function check(data) {
  const t = data.diagram_type;
  if (!isC4(t)) return [];
  const elementos = data.elementos ?? [];
  const relacoes = data.relacoes ?? [];
  const out = [];
  const escopoNome = data.escopo?.nome ?? '';

  if (t === 'c4-context') {
    const sistemas = countType(elementos, 'sistema');
    if (sistemas !== 1) out.push(`O diagrama de contexto deve ter exatamente um sistema de software em escopo (encontrados: ${sistemas}).`);
    const detalhados = namesOfTypes(elementos, ['container', 'banco_dados', 'componente', 'no_implantacao']);
    if (detalhados) out.push(`Contexto não deve mostrar contêineres, componentes nem nós de implantação — isso pertence aos níveis seguintes: ${detalhados}.`);
    const comTecnologia = elementos.filter((el) => !blank(el.tecnologia)).map((el) => el.nome).join(', ');
    if (comTecnologia) out.push(`Contexto não deve mostrar tecnologias: ${comTecnologia}.`);
    const relComTecnologia = relacoes.filter((r) => !blank(r.tecnologia)).length;
    if (relComTecnologia > 0) out.push(`Contexto não deve mostrar protocolos/tecnologias nas relações (${relComTecnologia} relação(ões) com tecnologia).`);
  }

  if (t === 'c4-container') {
    if (escopoNome === '') out.push('Informe o sistema de software em escopo (a fronteira do diagrama de contêiner).');
    if (countType(elementos, 'container') + countType(elementos, 'banco_dados') === 0) out.push('Diagrama de contêiner sem nenhum contêiner (aplicação ou banco de dados).');
    const fora = namesOfTypes(elementos, ['sistema', 'componente', 'no_implantacao']);
    if (fora) out.push(`Diagrama de contêiner não deve incluir o próprio sistema como elemento (ele é a fronteira), componentes nem nós de implantação: ${fora}.`);
    const semTecnologia = elementos.filter((el) => (el.tipo === 'container' || el.tipo === 'banco_dados') && blank(el.tecnologia)).map((el) => el.nome).join(', ');
    if (semTecnologia) out.push(`Contêiner sem tecnologia definida: ${semTecnologia}.`);
    out.push(...boundaryWarnings(data));
    for (const rel of relacoes) {
      const de = indexOfId(elementos, rel.de);
      const para = indexOfId(elementos, rel.para);
      if (de >= 0 && para >= 0 && insideBoundary(t, elementos[de].tipo) && insideBoundary(t, elementos[para].tipo) && blank(rel.tecnologia)) {
        out.push(`Comunicação entre contêineres sem tecnologia/protocolo: ${elementos[de].nome} → ${elementos[para].nome}.`);
      }
    }
  }

  if (t === 'c4-component') {
    if (escopoNome === '') out.push('O diagrama de componente precisa de um único contêiner em escopo.');
    if (countType(elementos, 'componente') === 0) out.push('Diagrama de componente sem nenhum componente.');
    const fora = namesOfTypes(elementos, ['sistema', 'no_implantacao']);
    if (fora) out.push(`Diagrama de componente não deve incluir o sistema em escopo nem nós de implantação: ${fora}.`);
    const semTecnologia = elementos.filter((el) => el.tipo === 'componente' && blank(el.tecnologia)).map((el) => el.nome).join(', ');
    if (semTecnologia) out.push(`Componente sem tecnologia/implementação: ${semTecnologia}.`);
  }

  if (t === 'c4-deployment') {
    if (blank(data.ambiente)) out.push('O diagrama de implantação precisa de um ambiente (ex.: produção, homologação) — um diagrama por ambiente.');
    if (countType(elementos, 'no_implantacao') === 0) out.push('Diagrama de implantação sem nenhum nó de implantação.');
    const soltos = elementos.filter((el) => (el.tipo === 'container' || el.tipo === 'banco_dados') && effectiveParent(elementos, el) === '').map((el) => el.nome).join(', ');
    if (soltos) out.push(`Contêiner fora de um nó de implantação: ${soltos}.`);
    const componentes = namesOfTypes(elementos, ['componente']);
    if (componentes) out.push(`Diagrama de implantação não deve mostrar componentes: ${componentes}.`);
  }

  // Regras comuns a todo diagrama C4.
  const ids = new Set();
  for (const el of elementos) {
    if (ids.has(el.id)) out.push(`Id de elemento repetido: ${el.id}.`);
    else ids.add(el.id);
  }
  // Notacao C4: todo elemento tem uma descricao curta das responsabilidades
  // (o no de implantacao e so recipiente — a descricao dele nem e desenhada).
  const semDescricao = elementos.filter((el) => el.tipo !== 'no_implantacao' && blank(el.descricao)).map((el) => el.nome).join(', ');
  if (semDescricao) out.push(`Elemento sem descrição das responsabilidades: ${semDescricao}.`);
  for (const rel of relacoes) {
    if (indexOfId(elementos, rel.de) < 0 || indexOfId(elementos, rel.para) < 0) {
      out.push(`Relação aponta para um elemento inexistente: ${rel.de} → ${rel.para}.`);
    } else if (blank(rel.descricao)) {
      out.push(`Relação sem descrição: ${nameOf(elementos, rel.de)} → ${nameOf(elementos, rel.para)}.`);
    } else if (!/\s/.test(rel.descricao.trim())) {
      // Notacao C4: rotulos especificos, nada de uma palavra so ("Usa").
      out.push(
        `Relação com rótulo de uma palavra só (“${rel.descricao.trim()}”): ${nameOf(elementos, rel.de)} → ${nameOf(elementos, rel.para)} — diga o que ela faz, ex.: “Envia pedidos para”.`,
      );
    }
  }
  // Elementos de apoio sao, por definicao, os diretamente conectados ao
  // escopo; um no de implantacao e so um recipiente, nao precisa de relacao.
  const conectados = new Set(relacoes.flatMap((r) => [r.de, r.para]));
  const isolados = elementos.filter((el) => el.tipo !== 'no_implantacao' && !conectados.has(el.id)).map((el) => el.nome).join(', ');
  if (isolados) out.push(`Elemento sem nenhuma relação no diagrama: ${isolados}.`);
  return out;
}

// Fronteiras explicitas de um diagrama de conteiner (nada sem elas).
function boundaryWarnings(data) {
  const fronteiras = fronteirasOf(data);
  if (!fronteiras.length) return [];
  const elementos = data.elementos ?? [];
  const out = [];
  const ids = [];
  for (const f of fronteiras) {
    if (ids.includes(f.id)) out.push(`Id de fronteira repetido: ${f.id}.`);
    else ids.push(f.id);
    if (blank(f.nome)) out.push(`Fronteira sem nome: ${f.id}.`);
    if (!elementos.some((el) => (el.fronteira ?? '') === f.id)) out.push(`Fronteira sem nenhum elemento: ${f.nome || f.id}.`);
  }
  const inexistente = elementos.filter((el) => (el.fronteira ?? '') !== '' && !ids.includes(el.fronteira)).map((el) => el.nome).join(', ');
  if (inexistente) out.push(`Elemento numa fronteira inexistente: ${inexistente}.`);
  const fora = elementos.filter((el) => (el.tipo === 'container' || el.tipo === 'banco_dados') && (el.fronteira ?? '') === '').map((el) => el.nome).join(', ');
  if (fora) out.push(`Contêiner fora de qualquer fronteira: ${fora}.`);
  return out;
}

// --- Consistencia entre os diagramas do mesmo lote ---------------------

const normalized = (text) => (text ?? '').toLowerCase().trim();

function namesByTypes(diagramas, diagramType, tipos) {
  return diagramas
    .filter((d) => d.diagram_type === diagramType && isStructured(d))
    .flatMap((d) => d.elementos.filter((el) => tipos.includes(el.tipo)).map((el) => normalized(el.nome)));
}

// batchWarnings: um array de avisos por diagrama (mesma ordem de
// `diagramas`) para o que so da para ver olhando o lote inteiro —
// contexto/conteiner ausentes e nomes que nao batem entre os niveis (o zoom
// de um nivel para o seguinte precisa manter as mesmas pessoas, sistemas
// externos e conteineres).
export function batchWarnings(diagramas) {
  const hasContext = diagramas.some((d) => d.diagram_type === 'c4-context');
  const hasContainer = diagramas.some((d) => d.diagram_type === 'c4-container');
  const contextPeople = namesByTypes(diagramas, 'c4-context', ['pessoa', 'sistema_externo']);
  // Um diagrama de conteiner pode detalhar qualquer sistema de software do
  // contexto: o sistema em escopo ou um sistema externo — e, do ponto de
  // vista deste, o sistema em escopo aparece como sistema externo.
  const contextSystems = namesByTypes(diagramas, 'c4-context', ['sistema', 'sistema_externo']);
  const containers = namesByTypes(diagramas, 'c4-container', ['container', 'banco_dados']);
  const hasStructuredContext = diagramas.some((d) => d.diagram_type === 'c4-context' && isStructured(d));
  const hasStructuredContainer = diagramas.some((d) => d.diagram_type === 'c4-container' && isStructured(d));

  return diagramas.map((d, i) => {
    const avisos = [];
    if (i === 0) {
      if (!hasContext) avisos.push('O lote não tem diagrama de contexto de sistema (C4) — recomendado para todo sistema.');
      if (!hasContainer) avisos.push('O lote não tem diagrama de contêiner (C4) — recomendado para todo sistema.');
    }
    const t = d.diagram_type;
    if (!isStructured(d)) return avisos;
    const escopoNome = normalized(d.escopo?.nome);
    if ((t === 'c4-container' || t === 'c4-deployment') && hasStructuredContext) {
      if (t === 'c4-container' && escopoNome !== '' && !contextSystems.includes(escopoNome)) {
        avisos.push(`O sistema em escopo (${d.escopo.nome}) não corresponde ao sistema do diagrama de contexto.`);
      }
      for (const el of d.elementos) {
        const n = normalized(el.nome);
        if ((el.tipo === 'pessoa' || el.tipo === 'sistema_externo') && !contextPeople.includes(n) && !contextSystems.includes(n)) {
          avisos.push(`“${el.nome}” aparece aqui mas não no diagrama de contexto.`);
        }
      }
    }
    if (t === 'c4-component' && hasStructuredContainer && escopoNome !== '' && !containers.includes(escopoNome)) {
      avisos.push(`O contêiner em escopo (${d.escopo.nome}) não existe no diagrama de contêiner.`);
    }
    if (t === 'c4-deployment' && hasStructuredContainer) {
      for (const el of d.elementos) {
        if ((el.tipo === 'container' || el.tipo === 'banco_dados') && !containers.includes(normalized(el.nome))) {
          avisos.push(`O contêiner “${el.nome}” está implantado aqui mas não existe no diagrama de contêiner.`);
        }
      }
    }
    return avisos;
  });
}

// annotate: o lote com os avisos de lote anexados a cada item (avisos_lote),
// para que a previa de UM item mostre a mesma coisa que o lote inteiro.
export function annotate(diagramas) {
  const avisos = batchWarnings(diagramas);
  return diagramas.map((d, i) => ({ ...d, avisos_lote: avisos[i] }));
}

export function warningsHtml(data) {
  const avisos = [...check(data), ...(data.avisos_lote ?? [])];
  if (!avisos.length) return '';
  return `<h2>Conformidade C4</h2><ul class="c4-warnings">${avisos.map((a) => `<li>${esc(a)}</li>`).join('')}</ul>`;
}
