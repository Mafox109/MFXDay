import { el } from '../utils/dom.js';

export function createErrorBanner() {
  const host = el('div', { class: 'alert error', style: 'display:none' });
  const msg = el('div', {});
  host.appendChild(msg);

  function setError(error) {
    const text = error instanceof Error ? error.message : String(error || '');
    msg.textContent = text || 'Ocorreu um erro inesperado.';
    host.style.display = 'block';
  }

  function clear() {
    msg.textContent = '';
    host.style.display = 'none';
  }

  return { element: host, setError, clear };
}

