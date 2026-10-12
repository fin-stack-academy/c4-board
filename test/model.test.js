// Portado de ArchModelSpec e ArchModelDetailSpec (senpai:
// workflows/shared/artifacts/arch_model.mh).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as C4 from '../src/c4/diagram.js';
import * as Model from '../src/c4/model.js';
import { modelBody, viewBody, page } from '../src/c4/render.js';
import { exampleModel } from '../src/c4/example.js';

const loja = () => {
  const m = exampleModel();
  m.detalhes = [];
  return m;
};

test('modelo limpo nao tem avisos', () => {
  assert.deepEqual(Model.check(loja()), []);
  assert.deepEqual(Model.check(exampleModel()), []);
});

test('contexto poe o sistema depois das pessoas e mantem as proprias relacoes', () => {
  const ctx = Model.context(loja());
  assert.equal(ctx.diagram_type, 'c4-context');
  assert.equal(ctx.titulo, 'Contexto de sistema — Loja');
  assert.deepEqual(ctx.elementos.map((el) => el.id), ['cliente', 'sistema', 'erp']);
  assert.equal(ctx.elementos[1].descricao, 'Vende online');
  assert.ok(C4.mermaid(ctx).includes(`n0 -->|"<span style='font-size:13px;font-weight:normal'>Compra produtos em</span>"| n1`));
});

test('modelo sem fronteiras ganha a fronteira unica do escopo', () => {
  const m = loja();
  delete m.conteineres.fronteiras;
  Model.normalizeModel(m);
  assert.deepEqual(m.conteineres.fronteiras.map((f) => f.id), ['sistema']);
  assert.ok(C4.mermaid(Model.container(m)).includes(`subgraph b0["<b style='font-size:13px'>Loja</b><br/><span style='font-size:11px;font-weight:normal'>[Sistema de software]</span>"]`));
  assert.deepEqual(Model.check(m), []);
});

test('cada visao e verificada contra as regras C4', () => {
  const m = loja();
  m.contexto = {
    elementos: [
      { id: 'sistema', nome: 'Reservado', tipo: 'pessoa', tecnologia: '', descricao: '' },
      { id: 'erp', nome: 'ERP', tipo: 'sistema_externo', tecnologia: 'SAP', descricao: '' },
    ],
    relacoes: [{ de: 'sistema', para: 'zzz', descricao: 'Usa', tecnologia: '' }],
  };
  m.conteineres = {
    fronteiras: [{ id: 'loja', nome: 'Loja' }],
    elementos: [
      { id: 'api', nome: 'API', tipo: 'container', tecnologia: '', descricao: '', fronteira: 'loja' },
      { id: 'db', nome: 'Banco', tipo: 'banco_dados', tecnologia: 'PG', descricao: '', fronteira: 'loja' },
    ],
    relacoes: [{ de: 'api', para: 'db', descricao: 'Grava em', tecnologia: '' }],
  };
  const avisos = Model.check(m).join(' | ');
  assert.ok(avisos.includes('Contexto: o id “sistema” é reservado'));
  assert.ok(avisos.includes('Contexto: Contexto não deve mostrar tecnologias: ERP'));
  assert.ok(avisos.includes('Contexto: Relação aponta para um elemento inexistente: sistema → zzz'));
  assert.ok(avisos.includes('Contêineres: Contêiner sem tecnologia definida: API'));
  assert.ok(avisos.includes('Contêineres: Comunicação entre contêineres sem tecnologia/protocolo: API → Banco'));
});

test('niveis que discordam so geram aviso', () => {
  const m = loja();
  m.conteineres.elementos.push({ id: 'bc', nome: 'Banco Central', tipo: 'sistema_externo', tecnologia: '', descricao: 'Regula o sistema financeiro', fronteira: '' });
  m.conteineres.relacoes.push({ de: 'api', para: 'bc', descricao: 'Reporta a', tecnologia: 'REST' });
  assert.deepEqual(Model.check(m), ['“Banco Central” aparece aqui mas não no diagrama de contexto.']);
});

test('o nome do sistema e obrigatorio', () => {
  const m = loja();
  m.sistema = { nome: '', descricao: '' };
  assert.ok(Model.check(m).join(' ').includes('Informe o nome do sistema'));
});

test('visoes detalhadas vem depois de contexto e conteiner', () => {
  const v = Model.views(exampleModel());
  assert.deepEqual(v.map((x) => x.titulo), ['Contexto de sistema — Loja', 'Contêineres — Loja', 'Componentes — API de Pedidos', 'Contêineres — ERP por dentro']);
  assert.equal(v[2].escopo.nome, 'API de Pedidos');
  assert.equal(v[2].escopo.descricao, 'Recebe pedidos');
  assert.equal(v[3].fronteiras.length, 1);
});

test('renomear a origem renomeia o escopo', () => {
  const m = exampleModel();
  m.conteineres.elementos.find((el) => el.id === 'api').nome = 'API de Vendas';
  const v = Model.views(m)[2];
  assert.equal(v.titulo, 'Componentes — API de Vendas');
  assert.equal(v.escopo.nome, 'API de Vendas');
});

test('visao cuja origem sumiu fica orfa mas continua desenhada', () => {
  const m = exampleModel();
  m.conteineres.elementos = m.conteineres.elementos.filter((el) => el.id !== 'api');
  m.conteineres.relacoes = m.conteineres.relacoes.filter((r) => r.de !== 'api' && r.para !== 'api');
  assert.ok(Model.check(m).join(' | ').includes('“Componentes — API de Pedidos”: o elemento de origem (API de Pedidos, em Contêineres) não existe mais — a visão ficou órfã.'));
  assert.equal(Model.views(m)[2].escopo.nome, 'API de Pedidos');
  assert.ok(Model.originHtml(m, m.detalhes[0]).includes('API de Pedidos (inexistente)'));
});

test('componentes nascem de um conteiner de aplicacao', () => {
  const m = exampleModel();
  m.detalhes[0].origem = { visao: 'conteineres', elemento: 'db', nome: 'Banco de Pedidos' };
  m.detalhes = [m.detalhes[0]];
  assert.ok(Model.check(m).join(' | ').includes('nasce de um contêiner de aplicação, mas a origem (Banco de Pedidos) agora é do tipo banco_dados'));
});

test('componentes podem nascer de outra visao detalhada', () => {
  const m = exampleModel();
  const d = {
    id: 'DET-003', tipo: 'c4-component', titulo: '', descricao: '',
    origem: { visao: 'DET-002', elemento: 'fat', nome: 'Faturador' },
    elementos: [{ id: 'nf', nome: 'Emissor de NF', tipo: 'componente', tecnologia: 'ABAP', descricao: 'Gera a nota', fronteira: '' }],
    relacoes: [],
  };
  m.detalhes.push(d);
  assert.equal(Model.views(m)[4].titulo, 'Componentes — Faturador');
  assert.ok(Model.originHtml(m, d).includes('(Contêineres — ERP por dentro)'));
  assert.deepEqual(Model.originWarnings(m, d), []);
});

test('annotatedView acha a visao pela chave', () => {
  assert.equal(Model.annotatedView(exampleModel(), 'DET-002').titulo, 'Contêineres — ERP por dentro');
  assert.equal(Model.annotatedView(exampleModel(), 'contexto').diagram_type, 'c4-context');
  assert.throws(() => Model.annotatedView(exampleModel(), 'DET-999'), /visão inexistente/);
});

test('a legenda cobre todas as visoes', () => {
  const legenda = Model.legend(exampleModel());
  assert.ok(legenda.includes('Sistema de software'));
  assert.ok(legenda.includes('Contêiner: banco de dados'));
  assert.ok(legenda.includes('Componente'));
});

test('paginas escapam nomes e trazem desenho, legenda e tabelas', () => {
  const m = loja();
  m.sistema.nome = '<x>';
  const body = modelBody(m, ['<svg id="a"></svg>', '<svg id="b"></svg>']);
  assert.ok(body.includes('&lt;x&gt;'));
  assert.ok(body.includes('<svg id="b"></svg>'));
  const v = viewBody(Model.annotatedView(loja(), 'conteineres'), '<svg></svg>');
  assert.ok(v.includes('<strong>Tipo:</strong> Contêiner (C4) · <strong>Nível:</strong> Strategic'));
  assert.ok(v.includes('<h2>Legenda</h2>'));
  assert.ok(v.includes('<h2>Elementos</h2>'));
  assert.ok(v.includes('<h2>Relações</h2>'));
});

test('so o documento exportado leva a assinatura da fin-stack academy', () => {
  assert.ok(page('Modelo C4', '', '', true).includes('<b>C4 Board</b> / fin-stack academy'));
  assert.ok(!page('Prévia', '', 'Prévia').includes('class="brand"'));
});
