// C4 Board (fin-stack academy): o editor do modelo C4 com o modelo salvo no navegador, mais
// importar/exportar (JSON do modelo, HTML com todos os diagramas).
import './style.css';
import { icon } from './icons.js';
import { mountEditor } from './editor.js';
import { emptyModel, normalizeModel } from './c4/model.js';
import { exampleModel } from './c4/example.js';
import { loadModel, saveModel, loadTheme, saveTheme, download } from './storage.js';
import { modelPage } from './preview.js';

const app = document.getElementById('app');
app.innerHTML = `
  <header class="topbar">
    <div class="brand">
      <svg class="brand-mark" viewBox="0 0 96 96" aria-hidden="true"><g shape-rendering="crispEdges"><path d="M12 18H84V36H36V78H12V18Z" fill="currentColor"/><path d="M36 42H84V60H36V42Z" fill="#B7F34A"/></g></svg>
      <span class="brand-text"><span class="brand-name">C4 Board</span><span class="brand-endorse">fin-stack academy</span></span>
    </div>
    <span class="status" aria-live="polite"></span>
    <div class="actions">
      <button type="button" class="button tertiary small" data-act="new">${icon('fileText', 14)} Novo</button>
      <button type="button" class="button tertiary small" data-act="example">${icon('refreshCw', 14)} Exemplo</button>
      <button type="button" class="button tertiary small" data-act="import">${icon('upload', 14)} Importar JSON</button>
      <button type="button" class="button tertiary small" data-act="export-json">${icon('download', 14)} Exportar JSON</button>
      <button type="button" class="button primary small" data-act="export-html">${icon('code', 14)} Exportar HTML</button>
      <button type="button" class="icon-button" data-act="theme" aria-label="Alternar tema"></button>
      <input type="file" accept="application/json,.json" hidden data-file>
    </div>
  </header>
  <div class="confirm" hidden>
    <span class="confirm-text"></span>
    <button type="button" class="button secondary small" data-confirm-no>Cancelar</button>
    <button type="button" class="button danger small" data-confirm-yes>Substituir</button>
  </div>
  <main class="editor-host"></main>`;

const $ = (sel) => app.querySelector(sel);
const host = $('.editor-host');
let data = normalizeModel(loadModel() ?? exampleModel());
let saveTimer = null;

function status(text, isError = false) {
  const el = $('.status');
  el.textContent = text;
  el.classList.toggle('error', isError);
}

function mount() {
  mountEditor(host, {
    data,
    // A aba aberta fica no endereco (#conteineres, #det-DET-001).
    initialTab: decodeURIComponent(location.hash.slice(1)),
    onTab: (tab) => history.replaceState(null, '', `#${encodeURIComponent(tab)}`),
    onChange: () => {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        const ok = saveModel(data);
        status(ok ? 'Salvo no navegador' : 'Não foi possível salvar no navegador — exporte o JSON', !ok);
      }, 300);
    },
  });
}

// Trocar o modelo inteiro (novo, exemplo, importar) pede confirmacao: o
// modelo atual so existe no navegador.
let pending = null;
function confirmReplace(text, next) {
  pending = next;
  $('.confirm-text').textContent = text;
  $('.confirm').hidden = false;
}
$('[data-confirm-no]').addEventListener('click', () => {
  pending = null;
  $('.confirm').hidden = true;
});
$('[data-confirm-yes]').addEventListener('click', () => {
  $('.confirm').hidden = true;
  if (pending) replace(pending());
  pending = null;
});
function replace(model) {
  data = normalizeModel(model);
  saveModel(data);
  mount();
  status('Modelo carregado');
}

const slug = () => (data.sistema?.nome || 'modelo').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'modelo';

app.querySelector('.actions').addEventListener('click', async (e) => {
  const act = e.target.closest('[data-act]')?.dataset.act;
  if (act === 'new') confirmReplace('Começar um modelo vazio? O modelo atual será substituído.', emptyModel);
  else if (act === 'example') confirmReplace('Carregar o modelo de exemplo? O modelo atual será substituído.', exampleModel);
  else if (act === 'import') $('[data-file]').click();
  else if (act === 'export-json') download(`${slug()}.c4.json`, JSON.stringify(data, null, 2), 'application/json');
  else if (act === 'export-html') {
    status('Gerando HTML…');
    try {
      download(`${slug()}.html`, await modelPage(data), 'text/html');
      status('HTML exportado');
    } catch (err) {
      status(`Não foi possível exportar: ${err.message ?? err}`, true);
    }
  } else if (act === 'theme') setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
});

$('[data-file]').addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  e.target.value = '';
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    if (!parsed || typeof parsed !== 'object' || (!parsed.sistema && !parsed.contexto && !parsed.conteineres)) throw new Error('o arquivo não parece um modelo C4 (faltam sistema/contexto/conteineres)');
    confirmReplace(`Importar “${file.name}”? O modelo atual será substituído.`, () => parsed);
  } catch (err) {
    status(`Não foi possível importar: ${err.message ?? err}`, true);
  }
});

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  $('[data-act="theme"]').innerHTML = icon(theme === 'dark' ? 'sun' : 'moon', 16);
  saveTheme(theme);
}
setTheme(loadTheme() ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));

mount();
