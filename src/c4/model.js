// O modelo arquitetural: os diagramas C4 de contexto e de conteiner do
// sistema em escopo, mais as visoes detalhadas, descritos como dados
// (elementos e relacoes). O desenho, a legenda e as tabelas sao codigo
// (diagram.js).
//
// Cada diagrama e independente: tem os proprios elementos e relacoes, com
// ids proprios — uma pessoa que aparece nos dois e simplesmente repetida, e
// as relacoes de cada nivel sao escritas para aquele nivel. A coerencia entre
// os niveis (mesmas pessoas e sistemas externos, mesmo sistema em escopo)
// vira aviso, nao regra: diagram.annotate compara os nomes.
//
// No contexto, o sistema em escopo nao e um elemento: e `sistema` (nome e
// descricao) e as relacoes o citam pelo id reservado "sistema".
//
// No conteiner, `fronteiras` lista as fronteiras de sistema de software (uma
// ou mais) e cada elemento diz em qual esta (`fronteira`, vazio = fora de
// todas). Um modelo sem fronteiras usa a fronteira unica do escopo.
//
// Visoes detalhadas (`detalhes`): diagramas criados no editor a partir de um
// elemento da visao de nivel acima — N diagramas de conteiner de um sistema
// do contexto (o sistema em escopo, para recortar uma jornada, ou um sistema
// externo) e diagramas de componente de um conteiner de aplicacao. Cada uma:
//   {id, tipo: "c4-container" | "c4-component", titulo, descricao,
//    origem: {visao: "contexto" | "conteineres" | <id de outro detalhe>,
//             elemento: <id do elemento>, nome: <nome quando nasceu>},
//    fronteiras (so conteiner), elementos, relacoes}
// O escopo da visao e o elemento de origem, lido na hora: renomear o
// conteiner renomeia a fronteira do diagrama de componente. Um elemento de
// origem que sumiu deixa a visao orfa — aviso, nunca apagada.
import * as C4 from './diagram.js';
import { escapeHtml as esc } from './html.js';

// Id do sistema em escopo nas relacoes do contexto. Reservado: nenhum
// elemento pode usa-lo (check).
export const SISTEMA_ID = 'sistema';

export function emptyModel() {
  return {
    sistema: { nome: '', descricao: '' },
    contexto: { elementos: [], relacoes: [] },
    conteineres: { fronteiras: [], elementos: [], relacoes: [] },
    detalhes: [],
  };
}

// normalizeModel completa um modelo importado (ou gravado por uma versao
// anterior) com as chaves que faltam. Um modelo sem fronteiras ganha uma so,
// a do sistema em escopo, com os conteineres dentro — o mesmo desenho que
// ele ja tinha. Campos desconhecidos (ex.: `fontes`) ficam onde estao.
export function normalizeModel(data) {
  const m = data && typeof data === 'object' ? data : {};
  m.sistema ??= { nome: '', descricao: '' };
  m.contexto ??= { elementos: [], relacoes: [] };
  m.contexto.elementos ??= [];
  m.contexto.relacoes ??= [];
  m.conteineres ??= { elementos: [], relacoes: [] };
  m.conteineres.elementos ??= [];
  m.conteineres.relacoes ??= [];
  if (!Array.isArray(m.detalhes)) m.detalhes = [];
  const view = m.conteineres;
  if (!Array.isArray(view.fronteiras)) {
    view.fronteiras = [{ id: SISTEMA_ID, nome: m.sistema.nome ?? '', descricao: '' }];
    for (const el of view.elementos) el.fronteira = el.tipo === 'container' || el.tipo === 'banco_dados' ? SISTEMA_ID : '';
  }
  for (const d of m.detalhes) {
    d.elementos ??= [];
    d.relacoes ??= [];
    d.fronteiras ??= [];
  }
  return m;
}

const sistemaOf = (data) => data.sistema ?? { nome: '', descricao: '' };

// --- Visoes -----------------------------------------------------------

// Elemento no formato de um diagrama (diagram.js).
const element = (el) => ({
  id: el.id ?? '',
  nome: el.nome ?? '',
  tipo: el.tipo ?? '',
  tecnologia: el.tecnologia ?? '',
  descricao: el.descricao ?? '',
  no_pai: '',
  fronteira: el.fronteira ?? '',
});

const relation = (r) => ({ de: r.de ?? '', para: r.para ?? '', descricao: r.descricao ?? '', tecnologia: r.tecnologia ?? '' });
const boundary = (f) => ({ id: f.id ?? '', nome: f.nome ?? '', descricao: f.descricao ?? '' });

function view(data, diagramType, titulo, descricao, elementos, relacoes) {
  const s = sistemaOf(data);
  const nome = (s.nome ?? '').trim();
  return {
    key: diagramType === 'c4-context' ? 'contexto' : 'conteineres',
    titulo: nome === '' ? titulo : `${titulo} — ${nome}`,
    diagram_type: diagramType,
    descricao,
    escopo: { nome: s.nome ?? '', descricao: s.descricao ?? '' },
    elementos,
    relacoes,
  };
}

// context: os elementos do contexto com o sistema em escopo como caixa
// central, logo depois das pessoas (a ordem guia o layout do Mermaid).
export function context(data) {
  const contexto = data.contexto ?? { elementos: [], relacoes: [] };
  const s = sistemaOf(data);
  const sistemaEl = { id: SISTEMA_ID, nome: s.nome ?? '', tipo: 'sistema', tecnologia: '', descricao: s.descricao ?? '', no_pai: '', fronteira: '' };
  const elementos = contexto.elementos ?? [];
  const pessoas = elementos.filter((el) => el.tipo === 'pessoa').map(element);
  const demais = elementos.filter((el) => el.tipo !== 'pessoa').map(element);
  return view(data, 'c4-context', 'Contexto de sistema', 'Pessoas e sistemas externos que interagem com o sistema.', [...pessoas, sistemaEl, ...demais], (contexto.relacoes ?? []).map(relation));
}

export function container(data) {
  const conteineres = data.conteineres ?? { elementos: [], relacoes: [] };
  const v = view(
    data,
    'c4-container',
    'Contêineres',
    'Aplicações e armazenamentos de dados do sistema e como se comunicam.',
    (conteineres.elementos ?? []).map(element),
    (conteineres.relacoes ?? []).map(relation),
  );
  v.fronteiras = (conteineres.fronteiras ?? []).map(boundary);
  return v;
}

export const detalhes = (data) => data.detalhes ?? [];

// origin: o elemento de onde a visao nasceu, como esta hoje no modelo, ou
// null se ele (ou a visao que o continha) nao existe mais. No contexto, o
// sistema em escopo responde pelo id reservado.
export function origin(data, d) {
  const { visao, elemento } = d.origem ?? {};
  let elementos;
  if (visao === 'contexto') {
    if (elemento === SISTEMA_ID) {
      const s = sistemaOf(data);
      return { id: SISTEMA_ID, nome: s.nome ?? '', tipo: 'sistema', tecnologia: '', descricao: s.descricao ?? '' };
    }
    elementos = data.contexto?.elementos ?? [];
  } else if (visao === 'conteineres') {
    elementos = data.conteineres?.elementos ?? [];
  } else {
    const pai = detalhes(data).find((p) => p.id === visao);
    if (!pai) return null;
    elementos = pai.elementos ?? [];
  }
  return elementos.find((el) => el.id === elemento) ?? null;
}

// detailView: a visao no formato de um diagrama. Titulo: "Contêineres —
// <titulo>" ou "Componentes — <titulo>"; sem titulo, o nome da origem.
export function detailView(data, d) {
  const o = origin(data, d);
  const nome = o === null ? d.origem?.nome ?? '' : o.nome ?? '';
  const componente = d.tipo === 'c4-component';
  const rotulo = (d.titulo ?? '').trim() || nome;
  const v = {
    key: d.id,
    titulo: `${componente ? 'Componentes' : 'Contêineres'} — ${rotulo}`,
    diagram_type: componente ? 'c4-component' : 'c4-container',
    descricao: d.descricao ?? '',
    escopo: { nome, descricao: o === null ? '' : o.descricao ?? '' },
    elementos: (d.elementos ?? []).map(element),
    relacoes: (d.relacoes ?? []).map(relation),
  };
  if (!componente) v.fronteiras = (d.fronteiras ?? []).map(boundary);
  return v;
}

export const detailViews = (data) => detalhes(data).map((d) => detailView(data, d));

export const views = (data) => [context(data), container(data), ...detailViews(data)];

export function visaoLabel(data, visao) {
  if (visao === 'contexto') return 'Contexto';
  if (visao === 'conteineres') return 'Contêineres';
  const pai = detalhes(data).find((p) => p.id === visao);
  return pai ? detailView(data, pai).titulo : 'visão removida';
}

// Avisos que so a visao detalhada tem: origem que sumiu (orfa) ou que mudou
// de tipo e nao comporta mais o nivel.
export function originWarnings(data, d) {
  const titulo = detailView(data, d).titulo;
  const o = origin(data, d);
  if (o === null) {
    const nome = d.origem?.nome || d.origem?.elemento || '';
    return [`“${titulo}”: o elemento de origem (${nome}, em ${visaoLabel(data, d.origem?.visao ?? '')}) não existe mais — a visão ficou órfã.`];
  }
  const tipo = o.tipo ?? '';
  if (d.tipo === 'c4-component' && tipo !== 'container') {
    return [`“${titulo}”: um diagrama de componentes nasce de um contêiner de aplicação, mas a origem (${o.nome ?? ''}) agora é do tipo ${tipo}.`];
  }
  if (d.tipo === 'c4-container' && tipo !== 'sistema' && tipo !== 'sistema_externo') {
    return [`“${titulo}”: um diagrama de contêineres nasce de um sistema de software, mas a origem (${o.nome ?? ''}) é do tipo ${tipo}.`];
  }
  return [];
}

// annotated: as visoes do modelo anotadas como um lote — a coerencia entre
// os niveis — com os avisos de origem pendurados em cada visao detalhada.
export function annotated(data) {
  const ds = detalhes(data);
  return C4.annotate(views(data)).map((v, i) => (i >= 2 ? { ...v, avisos_lote: [...v.avisos_lote, ...originWarnings(data, ds[i - 2])] } : v));
}

// A visao `key` ("contexto", "conteineres" ou o id de um detalhe), anotada.
export function annotatedView(data, key) {
  const v = annotated(data).find((x) => x.key === key);
  if (!v) throw new Error(`visão inexistente: '${key}'`);
  return v;
}

// --- Conformidade -----------------------------------------------------

// check: as regras C4 de cada visao, a coerencia entre elas e o que so o
// modelo tem — o id reservado. Texto cru; warningsHtml escapa.
export function check(data) {
  const out = [];
  if ((sistemaOf(data).nome ?? '').trim() === '') out.push('Informe o nome do sistema de software em escopo.');
  const reservado = (data.contexto?.elementos ?? []).filter((el) => el.id === SISTEMA_ID).map((el) => el.nome).join(', ');
  if (reservado) out.push(`Contexto: o id “sistema” é reservado para o sistema em escopo — use outro id em ${reservado}.`);
  annotated(data).forEach((v, i) => {
    const prefix = i === 0 ? 'Contexto' : i === 1 ? 'Contêineres' : v.titulo;
    out.push(...C4.check(v).map((a) => `${prefix}: ${a}`), ...v.avisos_lote);
  });
  return out;
}

export function warningsHtml(data) {
  const avisos = check(data);
  if (!avisos.length) return '';
  return `<h2>Conformidade do modelo</h2><ul class="c4-warnings">${avisos.map((a) => `<li>${esc(a)}</li>`).join('')}</ul>`;
}

// Legenda unica das visoes: os tipos presentes em qualquer uma.
export function legend(data) {
  const all = views(data);
  return C4.legend({ diagram_type: 'c4-container', elementos: all.flatMap((v) => v.elementos), relacoes: all.flatMap((v) => v.relacoes) });
}

// "Detalha “API de Pedidos” (Contêineres)" — a linha de origem de uma visao
// detalhada no documento do modelo.
export function originHtml(data, d) {
  const o = origin(data, d);
  const nome = o === null ? `${d.origem?.nome ?? ''} (inexistente)` : o.nome ?? '';
  return `<p class="origem">Detalha “${esc(nome)}” (${esc(visaoLabel(data, d.origem?.visao ?? ''))})</p>`;
}
