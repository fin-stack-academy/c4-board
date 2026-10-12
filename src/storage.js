// O modelo mora no localStorage do navegador; importar/exportar JSON e o
// caminho para guardar ou compartilhar fora dele. Toda leitura e escrita
// pode falhar (janela privada, armazenamento bloqueado): o app continua
// funcionando, so sem lembrar o modelo.
const KEY = 'c4board.model.v1';
const THEME_KEY = 'c4board.theme';

export function loadModel() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveModel(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function loadTheme() {
  try {
    return localStorage.getItem(THEME_KEY);
  } catch {
    return null;
  }
}

export function saveTheme(theme) {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // so nao lembra o tema
  }
}

export function download(filename, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
