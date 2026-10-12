// Editor guiado do modelo C4. O usuario nunca ve JSON nem Mermaid: o
// formulario e montado a partir do modelo (c4/model.js) e a previa e o
// desenho desse mesmo modelo (preview.js). Cada alteracao vai para onChange.
import { icon } from './icons.js';
import * as Model from './c4/model.js';
import { viewPage, showInFrame } from './preview.js';

// f(key, label, opts): campo de texto (long => coluna larga) ou select.
const f = (key, label, opts = {}) => ({ key, label, ...opts });
const id = () => f('id', 'ID', { type: 'id' });

const TIPOS_ELEMENTO = [
  ['pessoa', 'Pessoa'],
  ['sistema_externo', 'Sistema externo'],
  ['container', 'Contêiner: aplicação'],
  ['banco_dados', 'Contêiner: banco de dados'],
];
const TIPOS_CONTEXTO = TIPOS_ELEMENTO.slice(0, 2);
const TIPOS_COMPONENTE = [['componente', 'Componente'], ...TIPOS_ELEMENTO];

// Valor de uma chave com ponto ("contexto.elementos").
const getIn = (source, key) => key.split('.').reduce((o, k) => o?.[k], source);
// Ids de DOM e de evento: a chave sem pontos.
const sidOf = (section) => section.key.replaceAll('.', '-');

// Cada visao mora numa chave do modelo: "contexto", "conteineres" ou
// "detalhes.<i>" (visao detalhada). As pontas de uma relacao sao os
// elementos da mesma visao, mostrados pelo nome; o id fica por baixo. No
// contexto, o sistema em escopo e uma ponta tambem, pelo id reservado.
const elementOptions = (viewKey) => (data) => [
  ...(viewKey === 'contexto' ? [[Model.SISTEMA_ID, `${data.sistema?.nome || 'Sistema em escopo'} (sistema em escopo)`]] : []),
  ...getIn(data, viewKey).elementos.map((el) => [el.id, el.nome || el.id]),
];
// Uma relacao sem uma das pontas nao tem como ser desenhada.
const removeRelationsOf = (viewKey) => (data, removed) => {
  const view = getIn(data, viewKey);
  view.relacoes = view.relacoes.filter((r) => r.de !== removed.id && r.para !== removed.id);
};
// Fronteiras de um diagrama de conteiner: cada uma vira uma tabela de
// elementos (groupBy) e uma opcao da coluna "Fronteira", que move o elemento.
const FORA = 'Fora das fronteiras';
const boundaryOptions = (viewKey) => (data) => [...getIn(data, viewKey).fronteiras.map((b) => [b.id, b.nome || b.id]), ['', FORA]];
// Apagar uma fronteira nao apaga os elementos: eles vao para "fora" (com o
// aviso de conteiner fora de fronteira) e podem ser movidos depois.
const releaseElementsOf = (viewKey) => (data, removed) => {
  for (const el of getIn(data, viewKey).elementos) if (el.fronteira === removed.id) el.fronteira = '';
};

const relationFields = (viewKey, withTecnologia) => [
  f('de', 'De', { type: 'select', options: elementOptions(viewKey), initialIndex: 0 }),
  f('para', 'Para', { type: 'select', options: elementOptions(viewKey), initialIndex: 1 }),
  f('descricao', 'Descrição', { long: true }),
  ...(withTecnologia ? [f('tecnologia', 'Tecnologia / protocolo')] : []),
];

// ---- Visoes detalhadas ----
// Um diagrama de conteineres nasce de um sistema do contexto (o sistema em
// escopo — N recortes, um por jornada — ou um sistema externo); um diagrama
// de componentes nasce de um conteiner de aplicacao (do principal ou de
// outra visao detalhada). `detail` numa secao de elementos diz que linhas
// ganham o botao "Detalhar" e que tipo de visao ele cria.
const DETAIL_COMPONENT = { tipo: 'c4-component', when: (item) => item.tipo === 'container', title: (item) => `Novo diagrama de componentes de ${item.nome || item.id}` };
const DETAIL_CONTAINER = { tipo: 'c4-container', when: (item) => item.tipo === 'sistema_externo', title: (item) => `Novo diagrama de contêineres de ${item.nome || item.id}` };

const detailKind = (d) => (d.tipo === 'c4-component' ? 'Componentes' : 'Contêineres');
const detailLabel = (data, d) => `${detailKind(d)} · ${d.titulo?.trim() || Model.origin(data, d)?.nome || d.origem?.nome || d.id}`;
// Chave da visao -> o `origem.visao` de quem nasce dela.
const visaoOf = (data, viewKey) => (viewKey.startsWith('detalhes.') ? getIn(data, viewKey).id : viewKey);
const visaoLabel = (data, visao) => {
  if (visao === 'contexto') return 'Contexto';
  if (visao === 'conteineres') return 'Contêineres';
  const pai = data.detalhes.find((x) => x.id === visao);
  return pai ? detailLabel(data, pai) : 'visão removida';
};
const clone = (value) => JSON.parse(JSON.stringify(value));
const copyElement = (el, fronteira = '') => ({ id: el.id, nome: el.nome ?? '', tipo: el.tipo, tecnologia: el.tecnologia ?? '', descricao: el.descricao ?? '', fronteira });

function nextId(list, prefix) {
  let max = 0;
  for (const item of list) {
    const m = /^[A-Z]+-(\d+)$/.exec(item.id ?? '');
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `${prefix}-${String(max + 1).padStart(3, '0')}`;
}

// Os vizinhos de `item` na visao (as outras pontas das relacoes dele) e as
// relacoes religadas a `novoId` — o ponto de partida da visao filha.
function rewire(view, item, novoId, mapNeighbor) {
  const vizinhos = [];
  const relacoes = [];
  for (const r of view.relacoes) {
    if (r.de !== item.id && r.para !== item.id) continue;
    const outro = r.de === item.id ? r.para : r.de;
    if (outro === item.id) continue;
    if (!vizinhos.some((v) => v.id === outro)) {
      const viz = mapNeighbor(view.elementos.find((e) => e.id === outro) ?? null, outro);
      if (viz) vizinhos.push(viz);
    }
    // Ponta que nao existe na visao (relacao quebrada): nao vem junto.
    if (!vizinhos.some((v) => v.id === outro)) continue;
    relacoes.push({ de: r.de === item.id ? novoId : r.de, para: r.para === item.id ? novoId : r.para, descricao: r.descricao ?? '', tecnologia: r.tecnologia ?? '' });
  }
  return { vizinhos, relacoes };
}

// newDetail: a visao filha pre-preenchida a partir da visao de origem.
function newDetail(data, tipo, viewKey, item) {
  const base = {
    id: nextId(data.detalhes, 'DET'), tipo, titulo: '', descricao: '',
    origem: { visao: visaoOf(data, viewKey), elemento: item.id, nome: item.nome ?? '' },
    fronteiras: [], elementos: [], relacoes: [],
  };
  if (tipo === 'c4-component') {
    const view = getIn(data, viewKey);
    const novoId = nextId(view.elementos, 'EL');
    const { vizinhos, relacoes } = rewire(view, item, novoId, (el) => (el ? copyElement(el) : null));
    base.elementos = [...vizinhos, { id: novoId, nome: 'Novo componente', tipo: 'componente', tecnologia: item.tecnologia ?? '', descricao: '', fronteira: '' }];
    base.relacoes = relacoes;
    return base;
  }
  // Recorte do sistema em escopo: parte do diagrama de conteineres inteiro —
  // a jornada e o que sobra depois de tirar o que nao participa dela.
  if (item.id === Model.SISTEMA_ID) {
    const recortes = data.detalhes.filter((d) => d.origem?.visao === 'contexto' && d.origem?.elemento === Model.SISTEMA_ID).length;
    return Object.assign(base, { titulo: `Recorte ${recortes + 1}`, fronteiras: clone(data.conteineres.fronteiras), elementos: clone(data.conteineres.elementos), relacoes: clone(data.conteineres.relacoes) });
  }
  // Sistema externo: a fronteira dele, um conteiner provisorio e os vizinhos
  // do contexto (o sistema em escopo, visto de la, e um sistema externo).
  const novoId = nextId(data.contexto.elementos, 'EL');
  const { vizinhos, relacoes } = rewire(data.contexto, item, novoId, (el, outroId) =>
    el ? copyElement(el) : outroId !== Model.SISTEMA_ID ? null : { id: outroId, nome: data.sistema?.nome ?? '', tipo: 'sistema_externo', tecnologia: '', descricao: data.sistema?.descricao ?? '', fronteira: '' },
  );
  base.fronteiras = [{ id: item.id, nome: item.nome ?? '', descricao: item.descricao ?? '' }];
  base.elementos = [...vizinhos, { id: novoId, nome: 'Novo contêiner', tipo: 'container', tecnologia: '', descricao: '', fronteira: item.id }];
  base.relacoes = relacoes;
  return base;
}

// Secoes de um diagrama de conteiner (o principal e as visoes detalhadas).
function containerSections(viewKey, tab) {
  return [
    {
      key: `${viewKey}.fronteiras`, tab, label: 'Fronteiras', noun: 'fronteira', idPrefix: 'SIS',
      fields: [id(), f('nome', 'Sistema de software'), f('descricao', 'Descrição', { long: true })],
      onRemove: releaseElementsOf(viewKey),
    },
    {
      key: `${viewKey}.elementos`, tab, label: 'Elementos', noun: 'elemento', idPrefix: 'EL',
      fields: [id(), f('nome', 'Nome'), f('tipo', 'Tipo', { type: 'select', options: TIPOS_ELEMENTO, initial: 'container' }), f('tecnologia', 'Tecnologia'), f('descricao', 'Descrição', { long: true }), f('fronteira', 'Fronteira', { type: 'select', options: boundaryOptions(viewKey), regroup: true })],
      groupBy: {
        field: 'fronteira',
        groups: (data) => boundaryOptions(viewKey)(data).map(([gid, nome]) => [gid, gid ? `Fronteira: ${nome}` : FORA]),
        // Dentro de uma fronteira entra um conteiner; fora, uma pessoa.
        defaults: (gid) => ({ tipo: gid ? 'container' : 'pessoa' }),
      },
      onRemove: removeRelationsOf(viewKey), detail: DETAIL_COMPONENT,
    },
    { key: `${viewKey}.relacoes`, tab, label: 'Relações', noun: 'relação', fields: relationFields(viewKey, true) },
  ];
}

// Secoes de uma aba de visao detalhada.
function detailSections(data) {
  return data.detalhes.flatMap((d, i) => {
    const viewKey = `detalhes.${i}`;
    const tab = `det-${d.id}`;
    const header = { key: viewKey, tab, label: 'Visão', object: true, colsClass: 'ae-cols-scope', detailHeader: d.id, fields: [f('titulo', 'Título'), f('descricao', 'Descrição')] };
    if (d.tipo !== 'c4-component') return [header, ...containerSections(viewKey, tab)];
    return [
      header,
      {
        key: `${viewKey}.elementos`, tab, label: 'Elementos', noun: 'elemento', idPrefix: 'EL',
        fields: [id(), f('nome', 'Nome'), f('tipo', 'Tipo', { type: 'select', options: TIPOS_COMPONENTE, initial: 'componente' }), f('tecnologia', 'Tecnologia'), f('descricao', 'Descrição', { long: true })],
        defaults: { fronteira: '' }, onRemove: removeRelationsOf(viewKey),
      },
      { key: `${viewKey}.relacoes`, tab, label: 'Relações', noun: 'relação', fields: relationFields(viewKey, true) },
    ];
  });
}

// Secoes fixas: uma aba por diagrama, cada uma com os proprios elementos e
// relacoes (ids de cada diagrama; repetir uma pessoa nos dois e normal).
const SPEC = [
  // O botao do cartao cria um recorte do diagrama de conteineres (newDetail).
  { key: 'sistema', tab: 'contexto', label: 'Sistema em escopo', object: true, colsClass: 'ae-cols-scope', detailScope: true, fields: [f('nome', 'Nome'), f('descricao', 'Descrição')] },
  {
    key: 'contexto.elementos', tab: 'contexto', label: 'Pessoas e sistemas externos', noun: 'elemento', idPrefix: 'EL',
    fields: [id(), f('nome', 'Nome'), f('tipo', 'Tipo', { type: 'select', options: TIPOS_CONTEXTO, initial: 'pessoa' }), f('descricao', 'Descrição', { long: true })],
    defaults: { tecnologia: '' }, onRemove: removeRelationsOf('contexto'), detail: DETAIL_CONTAINER,
  },
  { key: 'contexto.relacoes', tab: 'contexto', label: 'Relações', noun: 'relação', fields: relationFields('contexto', false), defaults: { tecnologia: '' } },
  ...containerSections('conteineres', 'conteineres'),
];

const esc = (text) => {
  const div = document.createElement('div');
  div.textContent = text ?? '';
  return div.innerHTML;
};

// `options` de um select: lista fixa ou funcao dos dados atuais (as pontas
// de uma relacao sao os elementos que existem agora).
const optionsOf = (field, source) => (typeof field.options === 'function' ? field.options(source) : field.options);

function blankItem(section, list, source) {
  const item = {};
  for (const field of section.fields) {
    if (field.type !== 'select') item[field.key] = '';
    else if (typeof field.options === 'function') {
      const options = optionsOf(field, source);
      item[field.key] = (options[field.initialIndex ?? 0] ?? options[0])?.[0] ?? '';
    } else item[field.key] = field.initial;
  }
  if (section.idPrefix) item.id = nextId(list, section.idPrefix);
  Object.assign(item, section.defaults);
  return item;
}

// mountEditor monta o editor em `host` sobre `data` (alterado no lugar).
// onChange(data) a cada alteracao; onTab(id) a cada troca de aba.
export function mountEditor(host, { data, onChange, onTab, initialTab }) {
  let previewTimer = null;
  let previewSeq = 0;
  let removingDetail = null;
  const specAll = () => [...SPEC, ...detailSections(data)];
  const tabsNow = () => [
    { id: 'contexto', label: 'Contexto', view: 'contexto' },
    { id: 'conteineres', label: 'Contêineres', view: 'conteineres' },
    ...data.detalhes.map((d) => ({ id: `det-${d.id}`, label: detailLabel(data, d), view: d.id })),
  ];
  let activeTab = tabsNow().some((t) => t.id === initialTab) ? initialTab : 'contexto';
  const visible = () => specAll().filter((s) => s.tab === activeTab);

  host.innerHTML = `
    <div class="ae">
      <div class="ae-top">
        <nav class="ae-nav ae-tabs" aria-label="Diagramas" role="tablist"></nav>
        <div class="ae-view" role="group" aria-label="Modo"><button type="button" data-view="form" aria-pressed="true">Editar</button><button type="button" data-view="preview" aria-pressed="false">Prévia</button></div>
      </div>
      <div class="ae-main">
        <div class="ae-form"></div>
        <div class="ae-preview"><div class="ae-preview-tag">Prévia</div><div class="ae-preview-frame"></div></div>
      </div>
    </div>`;
  const $ = (sel) => host.querySelector(sel);
  const formEl = $('.ae-form');
  const ae = $('.ae');

  // ---- formulario ----
  function control(path, field, value) {
    const base = `data-path="${path}" id="ae-${path.replaceAll('.', '-')}" aria-label="${esc(field.label)}"`;
    if (field.type === 'select') {
      const dynamic = typeof field.options === 'function' ? ' data-dynamic' : '';
      return `<select class="ae-field" ${base}${dynamic}>${optionsHTML(field, value)}</select>`;
    }
    return `<input class="ae-field" ${base} value="${esc(value)}" spellcheck="false">`;
  }
  // Um valor que nao esta mais entre as opcoes (ponta de relacao apagada)
  // continua visivel, marcado, em vez de sumir.
  function optionsHTML(field, value) {
    const options = optionsOf(field, data);
    const known = options.some(([v]) => v === value);
    const missing = known || !value ? '' : `<option value="${esc(value)}" selected>${esc(value)} (inexistente)</option>`;
    return missing + options.map(([v, l]) => `<option value="${esc(v)}"${v === value ? ' selected' : ''}>${esc(l)}</option>`).join('');
  }
  // "<lista>.<indice>.<campo>" -> o campo da propria secao (as relacoes do
  // contexto e as de conteineres tem opcoes diferentes).
  function fieldAt(pathStr) {
    const parts = pathStr.split('.');
    const key = parts.pop();
    parts.pop();
    return specAll().find((s) => s.key === parts.join('.'))?.fields?.find((fl) => fl.key === key);
  }
  // Renomear um elemento muda o rotulo dele nos selects das relacoes. Sem
  // redesenhar o formulario (perderia o foco de quem esta digitando).
  function refreshDynamicSelects() {
    formEl.querySelectorAll('select[data-dynamic]').forEach((el) => {
      if (el === document.activeElement) return;
      const [obj, key] = path(el.dataset.path);
      const field = fieldAt(el.dataset.path);
      if (field) el.innerHTML = optionsHTML(field, obj[key]);
    });
  }
  function fieldsHTML(p, fields, source) {
    return fields.map((fl) => `<div class="ae-col${fl.long ? ' wide' : ''}"><label class="ae-lbl" for="ae-${p.replaceAll('.', '-')}-${fl.key}">${fl.label}</label>${control(`${p}.${fl.key}`, fl, source[fl.key])}</div>`).join('');
  }
  // Uma linha por item; o id fica no title da linha.
  function tableHTML(section) {
    const cols = section.fields.filter((fl) => fl.type !== 'id');
    const head = cols.map((fl) => `<th${fl.long ? ' class="wide"' : ''}>${fl.label}</th>`).join('') + `<th class="ae-t-act${section.detail ? ' has-detail' : ''}"></th>`;
    const rowHTML = (item, i) => {
      const p = `${section.key}.${i}`;
      const cells = cols.map((fl) => `<td>${control(`${p}.${fl.key}`, fl, item[fl.key])}</td>`).join('');
      const remove = `<button type="button" class="ae-rm-row" data-rmrow="${p}" title="Remover ${section.noun}" aria-label="Remover ${section.noun}">${icon('trash', 14)}</button>`;
      return `<tr${item.id ? ` title="id: ${esc(item.id)}"` : ''}>${cells}<td class="ae-t-act">${detailButton(section, item, p)}${remove}</td></tr>`;
    };
    // `pairs`: [item, indice na lista inteira] — o caminho de cada campo usa
    // o indice real, mesmo numa tabela que mostra so parte da lista.
    const table = (pairs) =>
      pairs.length
        ? `<div class="ae-table-wrap"><table class="ae-table"><thead><tr>${head}</tr></thead><tbody>${pairs.map(([item, i]) => rowHTML(item, i)).join('')}</tbody></table></div>`
        : '<p class="ae-empty">Nenhum item ainda.</p>';
    const addButton = (group) =>
      `<button type="button" class="ae-add" data-add="${sidOf(section)}"${group === undefined ? '' : ` data-group="${esc(group)}"`}>${icon('plus', 13)} Adicionar ${section.noun}</button>`;
    const list = getIn(data, section.key);
    const pairs = list.map((item, i) => [item, i]);
    let body;
    if (section.groupBy) {
      // Uma tabela por grupo (cada fronteira, e por ultimo "fora"); um valor
      // que nao bate com nenhum grupo cai em "fora", como no desenho.
      const groups = section.groupBy.groups(data);
      const known = new Set(groups.map(([gid]) => gid));
      const groupOf = (item) => (known.has(item[section.groupBy.field] ?? '') ? item[section.groupBy.field] ?? '' : '');
      body = groups.map(([gid, label]) => `<div class="ae-group"><h4>${esc(label)}</h4>${table(pairs.filter(([item]) => groupOf(item) === gid))}${addButton(gid)}</div>`).join('');
    } else {
      body = table(pairs) + addButton();
    }
    return `<section class="ae-sec" id="ae-s-${sidOf(section)}"><h3>${section.label}<span class="ae-count">${list.length}</span></h3>${body}</section>`;
  }
  // "Detalhar": cria a visao de nivel abaixo a partir da linha.
  function detailButton(section, item, p) {
    if (!section.detail?.when(item)) return '';
    const title = section.detail.title(item);
    return `<button type="button" class="ae-detail" data-detail="${p}" title="${esc(title)}" aria-label="${esc(title)}">${icon('layers', 14)}</button>`;
  }
  // Cabecalho da aba de uma visao detalhada: de onde ela nasceu e o remover
  // (em dois passos — a visao some com tudo o que foi desenhado nela).
  function detailHeaderHTML(detailId) {
    const d = data.detalhes.find((x) => x.id === detailId);
    const origem = Model.origin(data, d);
    const nome = origem ? origem.nome || origem.id : `${d.origem?.nome || d.origem?.elemento} (inexistente)`;
    const remove =
      removingDetail === detailId
        ? `<span class="ae-detail-confirm">Remover esta visão? <button type="button" class="button secondary small" data-rmdetail-cancel>Manter</button><button type="button" class="button danger small" data-rmdetail-confirm="${esc(detailId)}">Remover</button></span>`
        : `<button type="button" class="button tertiary small" data-rmdetail="${esc(detailId)}">${icon('trash', 13)} Remover visão</button>`;
    return `<div class="ae-detail-head"><span class="ae-origin${origem ? '' : ' orphan'}">Detalha “${esc(nome)}” · ${esc(visaoLabel(data, d.origem?.visao))}</span>${remove}</div>`;
  }
  function sectionHTML(section) {
    if (!section.object) return tableHTML(section);
    const source = getIn(data, section.key);
    const head = section.detailHeader ? detailHeaderHTML(section.detailHeader) : '';
    const scope = section.detailScope
      ? `<button type="button" class="ae-add" data-detail="sistema" title="Um recorte do diagrama de contêineres — por exemplo, os contêineres de uma jornada">${icon('layers', 13)} Novo diagrama de contêineres</button>`
      : '';
    return `<section class="ae-sec" id="ae-s-${sidOf(section)}"><h3>${section.label}</h3>${head}
      <div class="ae-card"><div class="ae-cols${section.colsClass ? ` ${section.colsClass}` : ''}">${fieldsHTML(section.key, section.fields, source)}</div></div>${scope}</section>`;
  }
  function buildForm() {
    const scroll = formEl.scrollTop;
    formEl.innerHTML = visible().map(sectionHTML).join('');
    formEl.scrollTop = scroll;
  }
  function buildTabs() {
    onTab?.(activeTab);
    $('.ae-nav').innerHTML = tabsNow()
      .map((t) => `<button type="button" role="tab" data-tab="${esc(t.id)}" aria-selected="${t.id === activeTab}">${esc(t.label)}</button>`)
      .join('');
  }

  function path(pathStr) {
    const parts = pathStr.split('.');
    const last = parts.pop();
    return [parts.reduce((o, k) => o[k], data), last];
  }

  function changed() {
    onChange(data);
    schedulePreview();
  }

  // ---- previa ----
  function schedulePreview() {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(renderPreview, 350);
  }
  async function renderPreview() {
    const frame = $('.ae-preview-frame');
    if (!frame || !ae.isConnected) return;
    const seq = ++previewSeq;
    try {
      const tab = tabsNow().find((t) => t.id === activeTab);
      const html = await viewPage(data, tab.view);
      if (seq !== previewSeq || !ae.isConnected) return;
      showInFrame(frame, html);
    } catch (err) {
      if (seq === previewSeq) frame.innerHTML = `<p class="ae-empty">Não foi possível montar a prévia: ${esc(String(err.message ?? err))}</p>`;
    }
  }

  // ---- eventos ----
  formEl.addEventListener('input', (e) => {
    if (!e.target.matches('input, select')) return;
    const [obj, key] = path(e.target.dataset.path);
    obj[key] = e.target.value;
    // Trocar a fronteira muda a tabela onde a linha mora.
    if (e.target.matches('select') && fieldAt(e.target.dataset.path)?.regroup) return rebuild();
    refreshDynamicSelects();
    // Titulos das abas de visoes detalhadas seguem os nomes.
    buildTabs();
    changed();
  });
  function rebuild(focusSel) {
    buildTabs();
    buildForm();
    changed();
    if (focusSel) formEl.querySelector(focusSel)?.focus();
  }
  formEl.addEventListener('click', (e) => {
    const rmRow = e.target.closest('[data-rmrow]');
    if (rmRow) {
      const [list, index] = path(rmRow.dataset.rmrow);
      const [removed] = list.splice(Number(index), 1);
      const listKey = rmRow.dataset.rmrow.split('.').slice(0, -1).join('.');
      specAll().find((s) => s.key === listKey)?.onRemove?.(data, removed);
      return rebuild();
    }
    const detail = e.target.closest('[data-detail]');
    if (detail) return createDetail(detail.dataset.detail);
    const rmDetail = e.target.closest('[data-rmdetail]');
    if (rmDetail) {
      removingDetail = rmDetail.dataset.rmdetail;
      return buildForm();
    }
    if (e.target.closest('[data-rmdetail-cancel]')) {
      removingDetail = null;
      return buildForm();
    }
    const rmConfirm = e.target.closest('[data-rmdetail-confirm]');
    if (rmConfirm) return removeDetail(rmConfirm.dataset.rmdetailConfirm);
    const add = e.target.closest('[data-add]');
    if (add) {
      const section = specAll().find((s) => sidOf(s) === add.dataset.add);
      const list = getIn(data, section.key);
      const item = blankItem(section, list, data);
      if (add.dataset.group !== undefined) Object.assign(item, section.groupBy.defaults(add.dataset.group), { [section.groupBy.field]: add.dataset.group });
      list.push(item);
      const p = `${section.key}.${list.length - 1}.`;
      rebuild(`input[data-path^="${p}"], select[data-path^="${p}"]`);
    }
  });
  // `where`: "sistema" (cartao do sistema em escopo) ou "<lista>.<indice>"
  // (linha de uma tabela de elementos com `detail`).
  function createDetail(where) {
    let item;
    let viewKey;
    let tipo;
    if (where === Model.SISTEMA_ID) {
      item = { id: Model.SISTEMA_ID, nome: data.sistema?.nome ?? '', tipo: 'sistema' };
      viewKey = 'contexto';
      tipo = 'c4-container';
    } else {
      const listKey = where.split('.').slice(0, -1).join('.');
      const section = specAll().find((s) => s.key === listKey);
      item = getIn(data, where);
      viewKey = listKey.split('.').slice(0, -1).join('.');
      tipo = section.detail.tipo;
    }
    const detail = newDetail(data, tipo, viewKey, item);
    data.detalhes.push(detail);
    activeTab = `det-${detail.id}`;
    formEl.scrollTop = 0;
    rebuild(`input[data-path="detalhes.${data.detalhes.length - 1}.titulo"]`);
    renderPreview();
  }
  // Remover uma visao nao apaga as que nasceram dela: elas ficam orfas (com
  // aviso), como quando o elemento de origem some.
  function removeDetail(detailId) {
    const i = data.detalhes.findIndex((d) => d.id === detailId);
    const origem = data.detalhes[i]?.origem?.visao;
    if (i >= 0) data.detalhes.splice(i, 1);
    removingDetail = null;
    // Volta para a aba de onde a visao nasceu, se ela ainda existir.
    const back = origem === 'contexto' || origem === 'conteineres' ? origem : `det-${origem}`;
    activeTab = tabsNow().some((t) => t.id === back) ? back : 'conteineres';
    rebuild();
    renderPreview();
  }
  $('.ae-nav').addEventListener('click', (e) => {
    const tab = e.target.closest('[data-tab]');
    if (!tab || tab.dataset.tab === activeTab) return;
    activeTab = tab.dataset.tab;
    removingDetail = null;
    formEl.scrollTop = 0;
    buildTabs();
    buildForm();
    // A rolagem da previa e de outra visao: comeca do topo.
    $('.ae-preview-frame').innerHTML = '';
    renderPreview();
  });
  host.querySelectorAll('[data-view]').forEach((btn) =>
    btn.addEventListener('click', () => {
      ae.dataset.view = btn.dataset.view;
      host.querySelectorAll('[data-view]').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      if (btn.dataset.view === 'preview') renderPreview();
    }),
  );

  buildTabs();
  buildForm();
  renderPreview();
}
