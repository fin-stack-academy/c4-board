// escapeHtml: texto do usuario dentro do HTML gerado (tabelas, avisos,
// legenda). Puro — sem DOM — para rodar tambem nos testes em Node.
export function escapeHtml(text) {
  return String(text ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
