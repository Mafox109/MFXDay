import { el } from '../utils/dom.js';

export function createToastManager() {
  const wrap = el('div', { class: 'toast-wrap', role: 'region', 'aria-label': 'Notificações' });

  document.body.appendChild(wrap);

  function showToast({ title, message, actions = [] } = {}) {
    const toast = el('div', { class: 'toast' });
    toast.appendChild(el('h4', {}, title || ''));
    toast.appendChild(el('p', {}, message || ''));

    if (actions.length) {
      const actionsEl = el('div', { class: 'actions' });
      for (const a of actions) {
        actionsEl.appendChild(
          el(
            'button',
            { class: `btn ${a.variant || ''}`.trim(), type: 'button', onclick: a.onClick },
            a.label
          )
        );
      }
      toast.appendChild(actionsEl);
    }

    wrap.appendChild(toast);

    const timeout = setTimeout(() => {
      if (toast.isConnected) toast.remove();
    }, 6000);

    // Remove ao interagir (UX).
    toast.addEventListener('click', () => clearTimeout(timeout), { once: true });
  }

  return { showToast };
}

