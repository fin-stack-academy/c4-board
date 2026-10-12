# C4 Board

Produto da **fin-stack academy**. Editor de diagramas C4 (contexto, contêineres e componentes) a partir de
tabelas de elementos e relações. O Mermaid, a legenda, as tabelas e a
verificação das regras do [C4 model](https://c4model.com) são gerados por
código a partir do modelo — nunca escritos à mão.

Extraído do editor de modelo arquitetural do Senpai.

## Uso

```sh
npm install
npm run dev     # http://localhost:5173
npm test        # testes da geração (node --test, sem dependências)
npm run build   # site estático em dist/
```

- **Contexto**: o sistema em escopo, as pessoas e sistemas externos e suas relações.
- **Contêineres**: fronteiras de sistema, contêineres (aplicação / banco de dados) e relações com tecnologia.
- **Visões detalhadas** (botão de camadas numa linha): diagrama de componentes de
  um contêiner de aplicação, ou de contêineres de um sistema externo; o botão
  "Novo diagrama de contêineres" do sistema em escopo cria um recorte (ex.: uma jornada).
- A aba aberta fica no endereço (`#conteineres`, `#det-DET-001`).

O modelo é salvo automaticamente no `localStorage` do navegador. Para guardar
ou compartilhar, use **Exportar JSON** / **Importar JSON**; **Exportar HTML**
gera um documento único com todos os diagramas em SVG (abre offline, sem scripts).

## Identidade visual

A interface, o documento exportado e a paleta dos diagramas seguem o design
system da fin-stack academy ([`assets/design-system/`](assets/design-system/README.md))
e usam o símbolo de [`assets/img/`](assets/img/README.md). O HTML exportado
abre offline, então os tokens ficam copiados em `src/c4/render.js`; a paleta
dos elementos está em `PALETTE` (`src/c4/diagram.js`).

## Estrutura

| Arquivo | Papel |
| --- | --- |
| `src/c4/diagram.js` | Mermaid, legenda, tabelas e regras C4 de um diagrama; coerência entre níveis |
| `src/c4/model.js` | O modelo (contexto, contêineres, visões detalhadas) → visões; avisos do modelo |
| `src/c4/render.js` | Páginas HTML (prévia e exportação) — puro, testável em Node |
| `src/editor.js` | O editor em abas/tabelas |
| `src/preview.js` | Desenho com Mermaid (SVG) e prévia em iframe sem scripts |
| `src/main.js` | Barra superior, persistência, importar/exportar, tema |

## Formato do modelo

```json
{
  "sistema": { "nome": "Loja", "descricao": "Vende online" },
  "contexto": {
    "elementos": [{ "id": "cliente", "nome": "Cliente", "tipo": "pessoa", "descricao": "" }],
    "relacoes": [{ "de": "cliente", "para": "sistema", "descricao": "Compra em", "tecnologia": "" }]
  },
  "conteineres": {
    "fronteiras": [{ "id": "loja", "nome": "Loja", "descricao": "" }],
    "elementos": [{ "id": "api", "nome": "API", "tipo": "container", "tecnologia": "Java", "descricao": "", "fronteira": "loja" }],
    "relacoes": []
  },
  "detalhes": []
}
```

Tipos de elemento: `pessoa`, `sistema_externo`, `container`, `banco_dados`,
`componente`. No contexto, o sistema em escopo é referenciado pelo id
reservado `sistema`. Um `modelo.json` do Senpai pode ser importado direto.
