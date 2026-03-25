function normalizeHash(hash) {
  const h = hash || '';
  if (!h.startsWith('#')) return '';
  return h.slice(1); // remove '#'
}

// Suporta:
//  - /dashboard
//  - /checkin
//  - /meals
//  - /groups
//  - /groups/:id
export function parseRoute() {
  const raw = normalizeHash(window.location.hash);
  const path = raw.startsWith('/') ? raw : `/${raw}`;
  const parts = path.split('/').filter(Boolean);

  const [first, second] = parts;

  if (!first || first === 'dashboard') return { key: 'dashboard', params: {} };
  if (first === 'checkin') return { key: 'checkin', params: {} };
  if (first === 'meals') return { key: 'meals', params: {} };
  if (first === 'groups' && !second) return { key: 'groups', params: {} };
  if (first === 'groups' && second) return { key: 'groupDetail', params: { id: second } };

  return { key: 'dashboard', params: {} };
}

export function navigate(hash) {
  const next = hash.startsWith('#') ? hash : `#${hash}`;
  window.location.hash = next;
}

