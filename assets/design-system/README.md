# Design system — fin-stack academy

Este design system transforma o posicionamento da fin-stack academy em uma linguagem visual editorial e tecnológica. A base quase monocromática evita a estética bancária genérica; o verde-sinal identifica ações, progresso e conhecimento.

## Como usar

Importe a folha principal em qualquer página:

```html
<link rel="stylesheet" href="../assets/design-system/design-system.css">
```

Ela já carrega `tokens.css`. Prefira as classes `fs-*` para elementos compartilhados e os tokens `--fs-*` ao criar variações locais.

```html
<section class="fs-section">
  <div class="fs-shell fs-stack">
    <p class="fs-kicker">Curso / Arquitetura</p>
    <h1 class="fs-display">Arquitetura para o mercado financeiro</h1>
    <p class="fs-lead fs-reading">Conteúdo técnico com aplicação prática.</p>
    <div class="fs-row">
      <a class="fs-action fs-action--signal" href="#matricula">Quero me matricular</a>
      <a class="fs-action fs-action--quiet" href="#programa">Ver programa</a>
    </div>
  </div>
</section>
```

## Princípios

1. **Clareza primeiro.** Uma ação principal por contexto e títulos que antecipam o conteúdo.
2. **Densidade confortável.** Conteúdo técnico precisa de respiro, mas sem grandes áreas vazias decorativas.
3. **Confiança sem cara de banco.** Preto mineral transmite precisão; verde-sinal comunica movimento e aplicação.
4. **Consistência flexível.** Use tokens e componentes como base; adapte a composição ao objetivo da página.
5. **Acessibilidade nativa.** HTML semântico, foco visível, áreas de toque de pelo menos 44px e texto principal a partir de 16px.

## Tokens

- `tokens.css`: cores, tipografia, espaço, raios, largura e movimento.
- Tokens semânticos, como `--fs-accent`, `--fs-text` e `--fs-surface`, devem ser preferidos a cores brutas.
- Para tema escuro, aplique `data-theme="dark"` ao elemento `html` ou a um contêiner isolado.
- A escala de espaçamento usa base de 4px. Na composição, priorize 8, 16, 24, 32, 48 e 64px.

## Componentes disponíveis

- Layout: `fs-shell`, `fs-section`, `fs-stack`, `fs-row`, `fs-grid`, `fs-reading`, `fs-rule`.
- Tipografia: `fs-kicker`, `fs-display`, `fs-title`, `fs-heading`, `fs-lead`, `fs-meta`.
- Ações: `fs-action`, `fs-action--signal`, `fs-action--quiet`.
- Conteúdo: `fs-panel`, `fs-panel--solid`, `fs-panel--interactive`, `fs-tag`, `fs-notice`.
- Formulários: `fs-field`, `fs-label`, `fs-input`, `fs-help`.
- Navegação e marca: `fs-nav`, `fs-wordmark`, `fs-wordmark__dot`, `fs-nav__links`, `fs-nav__link`.

## Regras de composição

- Use `fs-display` apenas no momento de maior impacto; para seções, use `fs-title` ou `fs-heading`.
- Limite parágrafos longos com `fs-reading` para preservar a leitura.
- A ação de maior energia usa verde-sinal. Ações padrão usam preto; ações discretas ficam transparentes.
- Prefira ritmo, linhas e espaço em branco a uma coleção de caixas. Use `fs-panel--solid` somente para criar contraste ou foco.
- O azul aparece apenas em foco, links informativos ou estados funcionais; não atua como cor de marca.
- Em telas pequenas, botões ocupam a largura disponível e grades viram uma coluna automaticamente.

## Voz da marca

Escreva em português direto, seguro e didático. Explique conceitos financeiros e técnicos sem promessas exageradas. Prefira “Aprenda a desenhar uma arquitetura resiliente” a “Revolucione sua carreira para sempre”. CTAs devem dizer o que acontece: “Ver programa”, “Começar aula”, “Baixar material”.

## Acessibilidade

- Preserve contraste mínimo de 4,5:1 para texto normal.
- Não comunique estado somente por cor; combine texto, ícone ou padrão.
- Todo campo precisa de um `label`; todo ícone interativo precisa de nome acessível.
- Respeite `prefers-reduced-motion`. Os tokens zeram as animações nesse caso.
- Teste navegação por teclado e ampliação de texto em 200% antes de publicar.

Abra `index.html` para consultar a paleta, a tipografia e os componentes em uma página responsiva com temas claro e escuro.

## Templates de redes sociais

O [kit de Instagram](../instagram/README.md) oferece quatro composições em versões post e story, com PNGs prontos, SVGs editáveis e geração reutilizável por JSON a partir dos tokens deste design system.

O [kit de LinkedIn](../linkedin/README.md) oferece quatro composições em versões quadrada e horizontal para o feed, com PNGs, SVGs editáveis e geração por JSON.
