import { el } from '../utils/dom.js';

const navItems = [
  { key: 'dashboard', label: 'Dashboard', href: '#/dashboard' },
  { key: 'checkin', label: 'Check-in', href: '#/checkin' },
  { key: 'meals', label: 'Refeições', href: '#/meals' },
  { key: 'groups', label: 'Grupos', href: '#/groups' },
];

export function createTopBar({ getActiveKey } = {}) {
  const topbar = el('div', { class: 'topbar' });
  const inner = el('div', { class: 'topbar-inner' });

  const brand = el('div', { class: 'brand' });
  brand.appendChild(el('div', { class: 'logo', 'aria-hidden': 'true' }, 'M'));
  const brandText = el('div', {});
  brandText.appendChild(el('h1', {}, 'MFX Day'));
  brandText.appendChild(el('p', { class: 'muted' }, 'PWA offline-first'));
  brand.appendChild(brandText);

  const nav = el('nav', { class: 'nav', 'aria-label': 'Navegação principal' });
  for (const item of navItems) {
    const a = el('a', { href: item.href, role: 'link' }, item.label);
    const applyCurrent = () => {
      const active = getActiveKey?.() || '';
      if (active === item.key) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    };
    applyCurrent();
    nav.appendChild(a);
    // Atualiza quando o hash mudar.
    window.addEventListener('hashchange', applyCurrent, { passive: true });
  }

  inner.appendChild(brand);
  inner.appendChild(nav);
  topbar.appendChild(inner);

  return topbar;
}

