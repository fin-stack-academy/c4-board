# C4 Board

Produto da **fin-stack academy**. Editor de diagramas C4 (contexto, contêineres e componentes) a partir de tabelas de elementos e relações. O Mermaid, a legenda, as tabelas e a verificação das regras do [C4 model](https://c4model.com) são gerados por código a partir do modelo — nunca escritos à mão.

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

## Docker

A imagem serve o site estático com nginx (sem root, porta 8080). O build roda
`npm test` antes de `npm run build`: a imagem só sai se os testes passarem.

Para usar (imagem publicada em [`finstackacademy/c4-board`](https://hub.docker.com/r/finstackacademy/c4-board)):

```sh
docker run -d -p 8080:8080 --name c4-board finstackacademy/c4-board:latest
# ou, neste repositório
docker compose up -d            # imagem publicada
docker compose up -d --build    # a partir do código local
```

- O modelo fica no `localStorage` **do navegador**, não no contêiner: recriar ou
  atualizar a imagem não perde nada, mas trocar a porta ou o host sim (cada
  endereço tem o seu armazenamento). Use **Exportar JSON** para guardar.
- `GET /healthz` responde `ok` (usado pelo `HEALTHCHECK` da imagem).

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

## Dependências

| Dependência | Versão | Uso | Licença |
| --- | --- | --- | --- |
| [Mermaid](https://github.com/mermaid-js/mermaid) | 12.0.0 | Desenho dos diagramas (vai no bundle) | MIT |
| [Vite](https://github.com/vitejs/vite) | 7.3.6 | Servidor de desenvolvimento e build (só desenvolvimento) | MIT |

Imagens base do Docker:

| Imagem | Uso | Licença |
| --- | --- | --- |
| [`node:22.12-alpine`](https://hub.docker.com/_/node) | Etapa de build (não vai para a imagem final) | MIT (Node.js) |
| [`nginxinc/nginx-unprivileged:1.27.3-alpine`](https://hub.docker.com/r/nginxinc/nginx-unprivileged) | Servidor da imagem final | BSD-2-Clause (nginx) |

O bundle publicado leva o Mermaid e as dependências dele (cerca de 120
pacotes, quase todos MIT, ISC, Apache-2.0 ou BSD-3-Clause, todas permissivas).
Pontos de atenção:

- [`elkjs`](https://github.com/kieler/elkjs) (layout, via Mermaid) é **EPL-2.0**,
  copyleft fraco por arquivo: distribuir sem modificar não gera obrigação além
  de manter o aviso de licença; modificar os arquivos dele obriga a publicar
  essas modificações.
- [`DOMPurify`](https://github.com/cure53/DOMPurify) (sanitização, via Mermaid)
  é licenciado como MPL-2.0 **ou** Apache-2.0; este projeto o usa sob Apache-2.0.

Para a lista completa: `npx license-checker --production --summary`.

As fontes do design system (Inter, Avenir Next) não são distribuídas: o app
usa as que estiverem instaladas no sistema.

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

## Licença

[MIT](LICENSE) © 2026 fin-stack academy. As dependências mantêm as próprias
licenças (ver [Dependências](#dependências)). A marca e o kit visual em
`assets/` identificam a fin-stack academy e não são cobertos pela licença MIT
do código.
