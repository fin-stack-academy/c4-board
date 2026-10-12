// Portado de C4DiagramSpec (senpai: workflows/shared/artifacts/c4_diagram.mh).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as C4 from '../src/c4/diagram.js';

const context = () => ({
  diagram_type: 'c4-context',
  escopo: { nome: 'Loja', descricao: 'Vende online' },
  elementos: [
    { id: 'cliente', nome: 'Cliente', tipo: 'pessoa', tecnologia: '', descricao: 'Compra' },
    { id: 'loja', nome: 'Loja', tipo: 'sistema', tecnologia: '', descricao: 'Vende "tudo"' },
    { id: 'pag', nome: 'Gateway <PSP>', tipo: 'sistema_externo', tecnologia: '', descricao: 'Processa pagamentos' },
  ],
  relacoes: [
    { de: 'cliente', para: 'loja', descricao: 'Faz pedidos', tecnologia: '' },
    { de: 'loja', para: 'pag', descricao: 'Cobra pagamentos via', tecnologia: '' },
  ],
});

const container = () => ({
  diagram_type: 'c4-container',
  escopo: { nome: 'Loja', descricao: '' },
  elementos: [
    { id: 'cliente', nome: 'Cliente', tipo: 'pessoa', tecnologia: '', descricao: '' },
    { id: 'api', nome: 'API', tipo: 'container', tecnologia: 'Java', descricao: '' },
    { id: 'db', nome: 'Banco', tipo: 'banco_dados', tecnologia: '', descricao: '' },
    { id: 'erp', nome: 'ERP', tipo: 'sistema_externo', tecnologia: '', descricao: '' },
  ],
  relacoes: [
    { de: 'cliente', para: 'api', descricao: 'Usa', tecnologia: 'HTTPS' },
    { de: 'api', para: 'db', descricao: 'Lê e grava', tecnologia: '' },
    { de: 'api', para: 'erp', descricao: 'Envia pedidos', tecnologia: 'REST' },
  ],
});

test('nivel e rotulos derivam do tipo', () => {
  assert.equal(C4.level('c4-context'), 'Strategic');
  assert.equal(C4.level('c4-component'), 'Product');
  assert.equal(C4.typeLabel('c4-container'), 'Contêiner (C4)');
});

test('mm escapa aspas, sinais e # para rotulos Mermaid', () => {
  assert.equal(C4.mm('C# "x" <y>'), 'C#35; #quot;x#quot; #lt;y#gt;');
});

test('contexto: um no por elemento com as classes C4', () => {
  const m = C4.mermaid(context());
  assert.ok(m.startsWith('%%{init: {"flowchart": {"wrappingWidth": 280}}}%%\nflowchart TB\n'));
  assert.ok(m.includes(`n0(["<span style='display:inline-block;min-width:170px;padding:12px 6px'><b style='font-size:18px'>Cliente</b><br/><span style='font-size:11px;font-weight:normal'>[Pessoa]</span><span style='display:block;margin-top:6px;font-size:13px;font-weight:normal'>Compra</span></span>"]):::pessoa`));
  assert.ok(m.includes(`n1["<span style='display:inline-block;min-width:170px;padding:12px 6px'><b style='font-size:18px'>Loja</b><br/><span style='font-size:11px;font-weight:normal'>[Sistema de software]</span><span style='display:block;margin-top:6px;font-size:13px;font-weight:normal'>Vende #quot;tudo#quot;</span></span>"]:::sistema`));
  assert.ok(m.includes(`<b style='font-size:18px'>Gateway #lt;PSP#gt;</b>`));
  assert.ok(m.includes(`n0 -->|"<span style='font-size:13px;font-weight:normal'>Faz pedidos</span>"| n1`));
  assert.ok(!m.includes('subgraph'));
});

test('conteiner: conteineres dentro da fronteira do sistema', () => {
  const m = C4.mermaid(container());
  assert.ok(m.includes(`subgraph b0["<b style='font-size:13px'>Loja</b><br/><span style='font-size:11px;font-weight:normal'>[Sistema de software]</span>"]`));
  assert.ok(m.includes(`n2[("<span style='display:inline-block;min-width:170px;padding:12px 6px'><b style='font-size:18px'>Banco</b><br/><span style='font-size:11px;font-weight:normal'>[Contêiner: banco de dados]</span></span>")]:::container`));
  assert.ok(m.includes(`n1["<span style='display:inline-block;min-width:170px;padding:12px 6px'><b style='font-size:18px'>API</b><br/><span style='font-size:11px;font-weight:normal'>[Contêiner: Java]</span></span>"]:::container`));
  assert.ok(m.includes(`n0 -->|"<span style='font-size:13px;font-weight:normal'>Usa</span><br/><span style='font-size:11px;font-weight:normal'>[HTTPS]</span>"| n1`));
});

test('clip corta em fronteira de palavra', () => {
  assert.equal(C4.clip('  curto  ', 10), 'curto');
  assert.equal(C4.clip('Lê e grava resultados de conciliação', 20), 'Lê e grava…');
  assert.equal(C4.clip('Supercalifragilístico', 5), 'Supercalifragilístico…');
});

test('rotulos sao cortados, tabelas mantem o texto inteiro', () => {
  const longa = 'Executa a conciliação cíclica da conta IVP e portabilidades em confirmação, alocação de recursos nos planos e confirmação TDP0005';
  const d = {
    diagram_type: 'c4-container',
    escopo: { nome: 'Loja' },
    elementos: [
      { id: 'w', nome: 'Worker', tipo: 'container', tecnologia: 'Java + Quarkus ou Radan — stack a confirmar pela avaliação', descricao: longa },
      { id: 'db', nome: 'Banco', tipo: 'banco_dados', tecnologia: 'PostgreSQL', descricao: '' },
    ],
    relacoes: [{ de: 'w', para: 'db', descricao: 'Lê e grava resultados de conciliação e alocações dos planos em', tecnologia: 'JDBC' }],
  };
  const m = C4.mermaid(d);
  assert.ok(!m.includes('TDP0005'));
  assert.ok(!m.includes('avaliação'));
  assert.ok(m.includes('…'));
  assert.ok(C4.elementsTable(d).includes('TDP0005'));
  assert.ok(C4.relationsTable(d).includes('alocações dos planos em'));
});

test('contexto limpo nao tem avisos', () => {
  assert.deepEqual(C4.check(context()), []);
});

test('notacao: elemento sem descricao e rotulo de uma palavra so', () => {
  const d = context();
  d.elementos[2].descricao = '  ';
  d.relacoes[0].descricao = ' Usa ';
  const avisos = C4.check(d);
  assert.ok(avisos.includes('Elemento sem descrição das responsabilidades: Gateway <PSP>.'));
  assert.ok(avisos.join(' ').includes('rótulo de uma palavra só (“Usa”): Cliente → Loja'));
  // No de implantacao e so recipiente: nao precisa de descricao.
  const dep = {
    diagram_type: 'c4-deployment',
    ambiente: 'Produção',
    elementos: [
      { id: 'aws', nome: 'AWS', tipo: 'no_implantacao', tecnologia: '', descricao: '', no_pai: '' },
      { id: 'api', nome: 'API', tipo: 'container', tecnologia: 'Java', descricao: 'Recebe pedidos', no_pai: 'aws' },
      { id: 'db', nome: 'Banco', tipo: 'banco_dados', tecnologia: 'PG', descricao: 'Guarda pedidos', no_pai: 'aws' },
    ],
    relacoes: [{ de: 'api', para: 'db', descricao: 'Grava pedidos em', tecnologia: 'JDBC' }],
  };
  assert.deepEqual(C4.check(dep), []);
});

test('legenda explica formas, bordas e o sentido das relacoes', () => {
  const legenda = C4.legend(container());
  assert.ok(legenda.includes('c4-swatch-person'));
  assert.ok(legenda.includes('Pessoa (caixa arredondada)'));
  assert.ok(legenda.includes('c4-swatch-db'));
  assert.ok(legenda.includes('Contêiner: banco de dados (cilindro)'));
  assert.ok(legenda.includes('Fronteira do sistema em escopo (borda tracejada)'));
  assert.ok(legenda.includes('Relação unidirecional (linha tracejada; a seta aponta o sentido)'));
  assert.ok(legenda.includes('[tipo: tecnologia]'));
});

test('contexto aponta tecnologia e detalhe de nivel de conteiner', () => {
  const avisos = C4.check({
    diagram_type: 'c4-context',
    escopo: { nome: 'Loja' },
    elementos: [
      { id: 'a', nome: 'Loja', tipo: 'sistema', tecnologia: 'Java' },
      { id: 'b', nome: 'API', tipo: 'container', tecnologia: '' },
      { id: 'c', nome: 'Solto', tipo: 'pessoa', tecnologia: '' },
    ],
    relacoes: [{ de: 'a', para: 'b', descricao: 'Usa', tecnologia: 'HTTP' }],
  }).join(' | ');
  assert.ok(avisos.includes('não deve mostrar contêineres'));
  assert.ok(avisos.includes('não deve mostrar tecnologias: Loja'));
  assert.ok(avisos.includes('protocolos/tecnologias nas relações'));
  assert.ok(avisos.includes('Elemento sem nenhuma relação no diagrama: Solto'));
});

test('conteiner aponta tecnologia ausente nos conteineres e na comunicacao', () => {
  const avisos = C4.check(container()).join(' | ');
  assert.ok(avisos.includes('Contêiner sem tecnologia definida: Banco'));
  assert.ok(avisos.includes('Comunicação entre contêineres sem tecnologia/protocolo: API → Banco'));
});

test('relacao para elemento inexistente e apontada e nao desenhada', () => {
  const d = {
    diagram_type: 'c4-context',
    escopo: { nome: 'Loja' },
    elementos: [{ id: 'a', nome: 'Loja', tipo: 'sistema', tecnologia: '' }],
    relacoes: [{ de: 'a', para: 'zzz', descricao: 'Usa', tecnologia: '' }],
  };
  assert.ok(C4.check(d).join(' ').includes('elemento inexistente: a → zzz'));
  assert.ok(!C4.mermaid(d).includes('-->'));
});

test('componente exige um conteiner em escopo', () => {
  const avisos = C4.check({
    diagram_type: 'c4-component',
    escopo: { nome: '' },
    elementos: [{ id: 'c', nome: 'Pedidos', tipo: 'componente', tecnologia: '' }],
    relacoes: [],
  }).join(' | ');
  assert.ok(avisos.includes('precisa de um único contêiner em escopo'));
  assert.ok(avisos.includes('Componente sem tecnologia/implementação: Pedidos'));
});

test('implantacao aninha conteineres nos nos', () => {
  const d = {
    diagram_type: 'c4-deployment',
    escopo: { nome: 'Loja' },
    ambiente: 'Produção',
    elementos: [
      { id: 'aws', nome: 'AWS', tipo: 'no_implantacao', tecnologia: 'sa-east-1', no_pai: '' },
      { id: 'eks', nome: 'Cluster', tipo: 'no_implantacao', tecnologia: 'EKS', no_pai: 'aws' },
      { id: 'api', nome: 'API', tipo: 'container', tecnologia: 'Java', no_pai: 'eks' },
      { id: 'solto', nome: 'Worker', tipo: 'container', tecnologia: 'Java', no_pai: '' },
    ],
    relacoes: [{ de: 'solto', para: 'api', descricao: 'Chama', tecnologia: 'gRPC' }],
  };
  const m = C4.mermaid(d);
  assert.ok(m.includes(`subgraph n0["<b style='font-size:18px'>AWS</b><br/><span style='font-size:11px;font-weight:normal'>[Nó de implantação: sa-east-1]</span>"]\n    subgraph n1[`));
  assert.ok(m.includes(`n2["<span style='display:inline-block;min-width:170px;padding:12px 6px'><b style='font-size:18px'>API</b><br/><span style='font-size:11px;font-weight:normal'>[Contêiner: Java]</span></span>"]:::container\n    end\n`));
  assert.ok(C4.check(d).join(' ').includes('Contêiner fora de um nó de implantação: Worker'));
});

test('lote aponta niveis ausentes so no primeiro diagrama', () => {
  const avisos = C4.batchWarnings([context(), { diagram_type: 'c4-component', elementos: [] }]);
  assert.ok(avisos[0].join(' ').includes('não tem diagrama de contêiner'));
  assert.equal(avisos[1].length, 0);
});

test('lote aponta nomes que nao batem entre os niveis', () => {
  const avisos = C4.batchWarnings([context(), container()]);
  assert.ok(avisos[1].join(' ').includes('“ERP” aparece aqui mas não no diagrama de contexto'));
  assert.ok(!avisos[1].join(' ').includes('Cliente'));
  const component = {
    diagram_type: 'c4-component',
    escopo: { nome: 'Worker' },
    elementos: [{ id: 'c', nome: 'Pedidos', tipo: 'componente', tecnologia: 'Spring' }],
    relacoes: [],
  };
  assert.ok(C4.batchWarnings([context(), container(), component])[2].join(' ').includes('não existe no diagrama de contêiner'));
});

test('warningsHtml escapa os nomes', () => {
  const d = { diagram_type: 'c4-context', escopo: { nome: '' }, elementos: [{ id: 'x', nome: '<Solto>', tipo: 'sistema', tecnologia: '' }], relacoes: [] };
  assert.ok(C4.warningsHtml(d).includes('&lt;Solto&gt;'));
});

test('conteiner com fronteiras explicitas desenha um subgraph por fronteira', () => {
  const d = {
    diagram_type: 'c4-container',
    escopo: { nome: 'Loja' },
    fronteiras: [{ id: 'loja', nome: 'Loja' }, { id: 'pag', nome: 'Pagamentos' }, { id: 'vazia', nome: 'Vazia' }],
    elementos: [
      { id: 'cliente', nome: 'Cliente', tipo: 'pessoa', tecnologia: '', fronteira: '' },
      { id: 'api', nome: 'API', tipo: 'container', tecnologia: 'Java', fronteira: 'loja' },
      { id: 'psp', nome: 'Gateway', tipo: 'container', tecnologia: 'Go', fronteira: 'pag' },
      { id: 'solto', nome: 'Solto', tipo: 'banco_dados', tecnologia: 'PG', fronteira: '' },
      { id: 'x', nome: 'Perdido', tipo: 'container', tecnologia: 'Go', fronteira: 'zzz' },
    ],
    relacoes: [
      { de: 'cliente', para: 'api', descricao: 'Usa', tecnologia: 'HTTPS' },
      { de: 'api', para: 'psp', descricao: 'Cobra via', tecnologia: 'gRPC' },
      { de: 'api', para: 'solto', descricao: 'Grava', tecnologia: 'JDBC' },
      { de: 'api', para: 'x', descricao: 'Chama', tecnologia: 'HTTP' },
    ],
  };
  const m = C4.mermaid(d);
  assert.ok(m.includes(`subgraph b0["<b style='font-size:13px'>Loja</b><br/><span style='font-size:11px;font-weight:normal'>[Sistema de software]</span>"]\n        n1[`));
  assert.ok(m.includes(`subgraph b1["<b style='font-size:13px'>Pagamentos</b><br/><span style='font-size:11px;font-weight:normal'>[Sistema de software]</span>"]\n        n2[`));
  assert.ok(m.includes(`subgraph b2["<b style='font-size:13px'>Vazia</b>`));
  const avisos = C4.check(d).join(' | ');
  assert.ok(avisos.includes('Fronteira sem nenhum elemento: Vazia'));
  assert.ok(avisos.includes('Elemento numa fronteira inexistente: Perdido'));
  assert.ok(avisos.includes('Contêiner fora de qualquer fronteira: Solto'));
  assert.ok(C4.elementsTable(d).includes('<td>Pagamentos</td>'));
  assert.ok(C4.legend(d).includes('Fronteira de um sistema de software'));
});
