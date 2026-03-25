/* PWA MFX Day - Vanilla JS */

const STORAGE_KEYS = {
  groups: 'mfx_groups_v1',
  tasks: 'mfx_tasks_v1',
  meals: 'mfx_meals_v1',
  checkins: 'mfx_checkins_v1',
};

const DAY_ORDER = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];

const mealTypes = [
  { value: 'cafe_manha', label: 'Café' },
  { value: 'almoco', label: 'Almoço' },
  { value: 'jantar', label: 'Jantar' },
  { value: 'lanche', label: 'Lanche' },
];

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs || {})) {
    if (value === undefined || value === null) continue;
    if (key === 'class') node.className = String(value);
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else if (key.startsWith('on') && typeof value === 'function') {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key === 'aria') Object.assign(node, value);
    else if (key === 'text') node.textContent = String(value);
    else if (key === 'html') node.innerHTML = String(value); // não use com dados do usuário
    else node.setAttribute(key, String(value));
  }
  for (const child of children.flat()) {
    if (child === undefined || child === null) continue;
    if (typeof child === 'string' || typeof child === 'number') {
      node.appendChild(document.createTextNode(String(child)));
    } else {
      node.appendChild(child);
    }
  }
  return node;
}

function sanitizeText(input, { maxLength = 400 } = {}) {
  const raw = input === undefined || input === null ? '' : String(input);
  // Remove caracteres de controle; reduz risco e mantém texto seguro para textContent.
  return raw
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Pode falhar por quota/correções do navegador.
    throw new Error('Não foi possível salvar dados localmente (quota ou bloqueio do navegador).');
  }
}

function getDayKey(date = new Date()) {
  return DAY_ORDER[date.getDay()] || 'segunda';
}

function getISODate(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function uuid() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') return globalThis.crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toastController() {
  const wrap = document.querySelector('.toast-wrap');

  function show({ title, message }) {
    const t = el('div', { class: 'toast', role: 'status' }, [
      el('h4', { text: title || 'Aviso' }),
      el('p', { text: message || '' }),
    ]);
    wrap.appendChild(t);
    setTimeout(() => {
      if (t.isConnected) t.remove();
    }, 5200);
  }

  return { show };
}

function setOnlineState() {
  const dot = document.querySelector('.dot');
  const txt = document.querySelector('[data-online-text]');
  const offlineStrip = document.querySelector('.offline-strip');

  const online = navigator.onLine;
  dot.classList.toggle('online', online);
  dot.classList.toggle('offline', !online);
  txt.textContent = online ? 'Online' : 'Offline';
  offlineStrip.hidden = online;
}

function routeFromHash() {
  const raw = (location.hash || '').replace(/^#/, '');
  const path = raw.startsWith('/') ? raw : `/${raw}`;
  const parts = path.split('/').filter(Boolean);
  const [p1, p2] = parts;

  if (!p1 || p1 === 'dashboard') return { page: 'dashboard' };
  if (p1 === 'checkin') return { page: 'checkin' };
  if (p1 === 'meals') return { page: 'meals' };
  if (p1 === 'groups' && p2) return { page: 'groupDetail', groupId: p2 };
  if (p1 === 'groups') return { page: 'groups' };
  return { page: 'dashboard' };
}

function setNavCurrent(page) {
  const links = Array.from(document.querySelectorAll('[data-route-link]'));
  const map = { dashboard: 'dashboard', checkin: 'checkin', meals: 'meals', groups: 'groups', groupDetail: 'groups' };
  const current = map[page] || 'dashboard';
  for (const a of links) {
    a.setAttribute('aria-current', a.dataset.routeLink === current ? 'page' : 'false');
  }
}

async function initSeedIfNeeded() {
  let groups = loadJSON(STORAGE_KEYS.groups, []);
  let tasks = loadJSON(STORAGE_KEYS.tasks, []);
  let meals = loadJSON(STORAGE_KEYS.meals, []);
  let checkins = loadJSON(STORAGE_KEYS.checkins, {});

  if (!Array.isArray(groups) || groups.length === 0) {
    const g1 = { id: uuid(), name: 'Atividade', description: 'Treinos, estudos e consistência.', createdAt: Date.now() };
    const g2 = { id: uuid(), name: 'Bem-estar', description: 'Leitura, respiração e hábitos.', createdAt: Date.now() };
    groups = [g1, g2];

    const todayKey = getDayKey();
    tasks = [
      { id: uuid(), title: 'Treino', groupId: g1.id, day: todayKey, createdAt: Date.now() },
      { id: uuid(), title: 'Estudar', groupId: g1.id, day: todayKey, createdAt: Date.now() + 1 },
      { id: uuid(), title: 'Ler', groupId: g2.id, day: todayKey, createdAt: Date.now() + 2 },
    ];
  }

  if (!Array.isArray(meals)) meals = [];
  if (!checkins || typeof checkins !== 'object') checkins = {};

  saveJSON(STORAGE_KEYS.groups, groups);
  saveJSON(STORAGE_KEYS.tasks, tasks);
  saveJSON(STORAGE_KEYS.meals, meals);
  saveJSON(STORAGE_KEYS.checkins, checkins);
}

async function withFakeLatency(fn) {
  await sleep(140);
  return fn();
}

const ui = {
  appHost: document.getElementById('app'),
  loadingOverlay: document.querySelector('.loading-overlay'),
  installBanner: document.querySelector('.install-banner'),
  installHelp: document.getElementById('install-help'),
  installBtn: document.getElementById('install-btn'),
  installClose: document.getElementById('install-close'),
  installDismiss: document.getElementById('install-dismiss'),
  offlineStrip: document.querySelector('.offline-strip'),
  toast: toastController(),
  setLoading(loading) {
    this.loadingOverlay.hidden = !loading;
    this.loadingOverlay.setAttribute('aria-busy', String(loading));
  },
};

function buildLoadingCard() {
  return el('div', { class: 'card' }, [
    el('h2', { text: 'Carregando...' }),
    el('p', { class: 'muted', text: 'Preparando o app com seus dados locais.' }),
  ]);
}

function renderDashboard() {
  const todayISO = getISODate();
  const todayKey = getDayKey();

  const groups = loadJSON(STORAGE_KEYS.groups, []);
  const tasks = loadJSON(STORAGE_KEYS.tasks, []);
  const meals = loadJSON(STORAGE_KEYS.meals, []);
  const checkins = loadJSON(STORAGE_KEYS.checkins, {});

  const groupsById = new Map(groups.map((g) => [g.id, g]));

  const tasksToday = tasks.filter((t) => t.day === todayKey);
  const checkin = checkins[todayISO] || null;
  const completed = new Set(checkin?.taskIdsCompleted || []);
  const doneCount = tasksToday.filter((t) => completed.has(t.id)).length;

  const mealsToday = meals.filter((m) => m.dateISO === todayISO);

  const week = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    week.push(getISODate(d));
  }
  const mealsWeekCount = meals.filter((m) => week.includes(m.dateISO)).length;

  const ratingLabel = checkin?.rating ? `${checkin.rating}/5` : 'Sem avaliação';

  const root = el('div', {}, [
    el('div', { class: 'grid grid-3' }, [
      el('section', { class: 'card' }, [
        el('h2', { text: 'Hoje' }),
        el('p', { class: 'muted', text: `Dia: ${todayKey.toUpperCase()}` }),
        el('div', { class: 'hr' }),
        el('p', { class: 'muted', text: `Tarefas: ${doneCount}/${tasksToday.length}` }),
        el('p', { class: 'muted', text: `Refeições: ${mealsToday.length}` }),
      ]),
      el('section', { class: 'card' }, [
        el('h2', { text: 'Check-in' }),
        el('p', { class: 'muted', text: checkin ? 'Salvo no dispositivo' : 'Pendente' }),
        el('div', { class: 'hr' }),
        el('p', { text: `Nota: ${ratingLabel}`, style: 'margin:0;' }),
      ]),
      el('section', { class: 'card' }, [
        el('h2', { text: 'Semana' }),
        el('p', { class: 'muted', text: 'Últimos 7 dias' }),
        el('div', { class: 'hr' }),
        el('p', { class: 'muted', text: `Refeições registradas: ${mealsWeekCount}` }),
      ]),
    ]),

    el('section', { class: 'card', style: 'margin-top: 12px;' }, [
      el('h3', { text: 'Atalhos' }),
      el('div', { class: 'grid grid-2', style: 'margin-top: 12px;' }, [
        el('div', {}, [
          el(
            'button',
            {
              class: 'btn primary',
              type: 'button',
              onclick: () => (location.hash = '#/checkin'),
            },
            'Fazer check-in'
          ),
        ]),
        el('div', {}, [
          el(
            'button',
            {
              class: 'btn',
              type: 'button',
              onclick: () => (location.hash = '#/meals'),
            },
            'Registrar refeição'
          ),
        ]),
        el('div', {}, [
          el(
            'button',
            {
              class: 'btn',
              type: 'button',
              onclick: () => (location.hash = '#/groups'),
            },
            'Gerenciar grupos/tarefas'
          ),
        ]),
      ]),
      el('div', { class: 'hr' }),
      el(
        'p',
        { class: 'muted', text: `Grupos: ${groups.length} | Tarefas no total: ${tasks.length}` }
      ),
      el('p', { class: 'muted', style: 'margin-top: 8px;', text: 'Dica: tudo funciona offline após a primeira visita.' }),
    ]),
  ]);

  return root;
}

function renderCheckin() {
  const todayISO = getISODate();
  const todayKey = getDayKey();

  const groups = loadJSON(STORAGE_KEYS.groups, []);
  const tasks = loadJSON(STORAGE_KEYS.tasks, []);
  const checkins = loadJSON(STORAGE_KEYS.checkins, {});

  const groupsById = new Map(groups.map((g) => [g.id, g]));
  const tasksToday = tasks.filter((t) => t.day === todayKey);
  const checkin = checkins[todayISO] || null;

  const completed = new Set(checkin?.taskIdsCompleted || []);
  let rating = checkin?.rating || 0;
  let reflection = checkin?.reflection || '';

  const root = el('div', {});

  // Tarefas
  const tasksCard = el('section', { class: 'card' });
  tasksCard.appendChild(el('h2', { text: 'Tarefas do dia' }));
  tasksCard.appendChild(el('p', { class: 'muted', text: `Hoje: ${todayKey.toUpperCase()}` }));

  if (tasksToday.length === 0) {
    tasksCard.appendChild(el('div', { class: 'alert' }, 'Nenhuma tarefa cadastrada para este dia.'));
  } else {
    const list = el('div', { class: 'list', style: 'margin-top: 12px;' });
    for (const t of tasksToday) {
      const group = groupsById.get(t.groupId);
      const row = el('div', { class: 'row' });
      const label = el('label', { style: 'display:flex; align-items:center; gap:10px; cursor:pointer;' });

      const checkbox = el('input', {
        type: 'checkbox',
        checked: completed.has(t.id),
        'aria-label': `Marcar concluída: ${t.title}`,
      });

      checkbox.addEventListener('change', () => {
        if (checkbox.checked) completed.add(t.id);
        else completed.delete(t.id);
      });

      label.appendChild(checkbox);
      label.appendChild(el('span', { text: t.title }));
      label.appendChild(
        el('span', { class: 'muted', text: `(${group?.name || 'Grupo'})`, style: 'font-size:12px;' })
      );
      row.appendChild(label);
      row.appendChild(el('span', { class: 'muted', text: '' }));
      list.appendChild(row);
    }
    tasksCard.appendChild(list);
  }
  root.appendChild(tasksCard);

  // Stars
  const ratingCard = el('section', { class: 'card', style: 'margin-top: 12px;' });
  ratingCard.appendChild(el('h2', { text: 'Avaliação' }));

  const starsHost = el('div', { class: 'stars', role: 'radiogroup', 'aria-label': 'Selecione sua nota' });
  const starBtns = [];
  for (let v = 1; v <= 5; v++) {
    const btn = el('button', {
      type: 'button',
      class: `star${v <= rating ? ' active' : ''}`,
      role: 'radio',
      'aria-checked': String(v === rating),
      'data-star': String(v),
      onclick: () => {
        rating = v;
        updateStars();
      },
    }, '★');
    starBtns.push(btn);
    starsHost.appendChild(btn);
  }
  ratingCard.appendChild(starsHost);
  ratingCard.appendChild(
    el(
      'p',
      { class: 'muted', style: 'margin-top:8px;', text: checkin ? 'Salvo no dispositivo.' : 'Pendente. Salve quando concluir.' }
    )
  );
  root.appendChild(ratingCard);

  // Reflexão
  const reflectionCard = el('section', { class: 'card', style: 'margin-top: 12px;' });
  reflectionCard.appendChild(el('h2', { text: 'Reflexão' }));
  const textarea = el('textarea', { class: 'input textarea', maxLength: 1200, 'aria-label': 'Reflexão' });
  textarea.value = reflection;
  textarea.addEventListener('input', () => {
    reflection = textarea.value;
  });
  reflectionCard.appendChild(textarea);
  root.appendChild(reflectionCard);

  // Erro + salvar
  const errBox = el('div', { class: 'alert error', style: 'display:none; margin-top: 12px;', id: 'checkin-error' }, [
    el('div', { text: '' }),
  ]);
  root.appendChild(errBox);

  const saveBtn = el(
    'button',
    {
      class: 'btn primary',
      type: 'button',
      id: 'checkin-save',
      disabled: rating === 0,
      onclick: async () => {
        errBox.style.display = 'none';
        const errText = errBox.querySelector('div');
        if (rating === 0) {
          errBox.style.display = 'block';
          errText.textContent = 'Dê uma nota de 1 a 5.';
          return;
        }

        try {
          const sanitizedReflection = sanitizeText(reflection, { maxLength: 1200 });
          const payload = {
            dateISO: todayISO,
            rating,
            reflection: sanitizedReflection,
            taskIdsCompleted: Array.from(completed),
            createdAt: Date.now(),
          };

          ui.setLoading(true);
          await withFakeLatency(() => {
            const current = loadJSON(STORAGE_KEYS.checkins, {});
            current[todayISO] = payload;
            saveJSON(STORAGE_KEYS.checkins, current);
          });
          ui.setLoading(false);
          ui.toast.show({ title: 'Check-in salvo', message: 'Registro atualizado com sucesso.' });
          location.hash = '#/dashboard';
        } catch (e) {
          ui.setLoading(false);
          errBox.style.display = 'block';
          errText.textContent = e?.message || 'Não foi possível salvar agora.';
        }
      },
    },
    'Salvar check-in'
  );
  root.appendChild(el('div', { style: 'margin-top: 12px;' }, [saveBtn]));

  function updateStars() {
    saveBtn.disabled = rating === 0;
    for (const btn of starBtns) {
      const v = Number(btn.getAttribute('data-star') || '0');
      const active = v <= rating;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-checked', String(v === rating));
    }
  }

  updateStars();
  return root;
}

function renderMeals() {
  const todayISO = getISODate();

  let selectedDateISO = todayISO;
  let type = 'almoco';

  const root = el('div', {});

  const grid = el('div', { class: 'grid grid-2' });
  root.appendChild(grid);

  // Form card
  const formCard = el('section', { class: 'card' });
  formCard.appendChild(el('h2', { text: 'Registrar refeição' }));

  const form = el('form', { onsubmit: (e) => e.preventDefault() });

  const dateField = el('div', { class: 'field' }, [
    el('div', { class: 'label', text: 'Data' }),
    el('input', {
      class: 'input',
      type: 'date',
      value: selectedDateISO,
      oninput: (e) => {
        selectedDateISO = e.target.value || todayISO;
        refresh();
      },
    }),
  ]);

  const typeSelect = el('select', { class: 'select' });
  for (const t of mealTypes) typeSelect.appendChild(el('option', { value: t.value, text: t.label }));
  typeSelect.value = type;
  typeSelect.addEventListener('change', (e) => {
    type = e.target.value;
  });

  const typeField = el('div', { class: 'field' }, [
    el('div', { class: 'label', text: 'Tipo' }),
    typeSelect,
  ]);

  const row1 = el('div', { class: 'grid grid-2' }, [dateField, typeField]);

  const textarea = el('textarea', { class: 'textarea', maxLength: 220, placeholder: 'Como foi?' });
  const descField = el('div', { class: 'field', style: 'margin-top: 10px;' }, [
    el('div', { class: 'label', text: 'Descrição (opcional)' }),
    textarea,
  ]);

  const actions = el('div', { style: 'margin-top: 12px; display:flex; gap: 10px; flex-wrap: wrap;' });
  const saveBtn = el('button', { class: 'btn primary', type: 'button', text: 'Salvar' });
  const clearBtn = el('button', { class: 'btn', type: 'button', text: 'Limpar' });
  actions.appendChild(saveBtn);
  actions.appendChild(clearBtn);

  clearBtn.onclick = () => {
    textarea.value = '';
  };

  saveBtn.addEventListener('click', async () => {
    const description = sanitizeText(textarea.value, { maxLength: 220 });
    try {
      ui.setLoading(true);
      await withFakeLatency(() => {
        const currentMeals = loadJSON(STORAGE_KEYS.meals, []);
        const payload = {
          id: uuid(),
          dateISO: selectedDateISO,
          mealType: type,
          description,
          createdAt: Date.now(),
        };
        currentMeals.push(payload);
        saveJSON(STORAGE_KEYS.meals, currentMeals);
      });
      ui.setLoading(false);
      ui.toast.show({ title: 'Refeição salva', message: 'Registro adicionado com sucesso.' });
      textarea.value = '';
      refresh();
    } catch (err) {
      ui.setLoading(false);
      ui.toast.show({ title: 'Falha ao salvar', message: err?.message || 'Tente novamente.' });
    }
  });

  form.appendChild(row1);
  form.appendChild(descField);
  form.appendChild(actions);
  formCard.appendChild(form);

  // Summary card
  const summaryCard = el('section', { class: 'card' });
  summaryCard.appendChild(el('h2', { text: 'Resumo' }));
  const totalP = el('p', { class: 'muted', id: 'meals-total', text: '' });
  summaryCard.appendChild(totalP);
  summaryCard.appendChild(el('p', { class: 'muted', style: 'margin-top: 8px;', text: 'Funciona offline após a primeira visita.' }));
  summaryCard.appendChild(el('div', { class: 'hr' }));
  summaryCard.appendChild(el('h3', { text: 'Heatmap (últimos 7 dias)' }));
  const heatmap = el('div', { class: 'heat', id: 'heatmap' });
  summaryCard.appendChild(heatmap);

  grid.appendChild(formCard);
  grid.appendChild(summaryCard);

  // List card
  const listCard = el('section', { class: 'card', style: 'margin-top: 12px;' });
  listCard.appendChild(el('h2', { text: 'Refeições na data selecionada' }));
  const list = el('div', { id: 'meals-list', class: 'list' });
  listCard.appendChild(list);
  root.appendChild(listCard);

  function renderHeatmap() {
    heatmap.innerHTML = '';
    const base = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      base.push(getISODate(d));
    }
    const mealsNow = loadJSON(STORAGE_KEYS.meals, []);
    for (const dateISO of base) {
      const count = mealsNow.filter((m) => m.dateISO === dateISO).length;
      heatmap.appendChild(
        el('div', { class: 'cell' }, [
          el('strong', { text: String(count) }),
          el('span', { text: dateISO.slice(5) }),
        ])
      );
    }
  }

  function renderList() {
    list.innerHTML = '';
    const mealsNow = loadJSON(STORAGE_KEYS.meals, []);
    const filtered = mealsNow
      .filter((m) => m.dateISO === selectedDateISO)
      .sort((a, b) => b.createdAt - a.createdAt);

    totalP.textContent = `Total em ${selectedDateISO}: ${filtered.length}`;

    if (filtered.length === 0) {
      list.appendChild(el('div', { class: 'alert' }, 'Sem refeições registradas nessa data.'));
      return;
    }

    for (const m of filtered) {
      const typeLabel = mealTypes.find((t) => t.value === m.mealType)?.label || m.mealType;
      const row = el('div', { class: 'row', style: 'padding: 10px 12px;' });
      row.appendChild(
        el('div', {}, [
          el('div', { style: 'font-weight: 800; font-family: var(--font-heading);', text: typeLabel }),
          el(
            'div',
            {
              class: 'muted',
              style: 'font-size: 12px; margin-top: 2px;',
              text: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            }
          ),
          m.description ? el('div', { class: 'muted', style: 'font-size: 13px; margin-top: 6px;', text: m.description }) : null,
        ])
      );

      const delBtn = el('button', { class: 'btn danger', type: 'button', text: 'Excluir' });
      delBtn.onclick = async () => {
        try {
          ui.setLoading(true);
          await withFakeLatency(() => {
            const current = loadJSON(STORAGE_KEYS.meals, []);
            const next = current.filter((x) => x.id !== m.id);
            saveJSON(STORAGE_KEYS.meals, next);
          });
          ui.setLoading(false);
          ui.toast.show({ title: 'Refeição excluída', message: 'Registro removido com sucesso.' });
          refresh();
        } catch (err) {
          ui.setLoading(false);
          ui.toast.show({ title: 'Falha ao excluir', message: err?.message || 'Tente novamente.' });
        }
      };
      row.appendChild(delBtn);
      list.appendChild(el('div', { class: 'card' }, [row]));
    }
  }

  function refresh() {
    renderHeatmap();
    renderList();
  }

  refresh();
  return root;
}

function renderGroups() {
  const groups = loadJSON(STORAGE_KEYS.groups, []);
  const tasks = loadJSON(STORAGE_KEYS.tasks, []);

  const counts = new Map();
  for (const t of tasks) counts.set(t.groupId, (counts.get(t.groupId) || 0) + 1);

  const root = el('div', {}, [
    el('section', { class: 'card' }, [
      el('h2', { text: 'Grupos' }),
      el('p', { class: 'muted', text: 'Organize suas tarefas por categoria e por dia.' }),
      el('div', { class: 'hr' }),
      el('div', { class: 'grid grid-2' }, [
        el('section', { class: 'card' }, [
          el('h3', { text: 'Criar grupo' }),
          (() => {
            const nameInput = el('input', { class: 'input', placeholder: 'Nome do grupo', maxLength: 60 });
            const descInput = el('textarea', { class: 'textarea', placeholder: 'Descrição (opcional)', maxLength: 180, style: 'min-height: 90px;' });
            const err = el('div', { class: 'alert error', style: 'display:none; margin-top: 12px;' });
            const btn = el('button', { class: 'btn primary', type: 'button', text: 'Criar' });
            btn.onclick = async () => {
              try {
                err.hidden = true;
                const name = sanitizeText(nameInput.value, { maxLength: 60 });
                const description = sanitizeText(descInput.value, { maxLength: 180 });
                if (!name) throw new Error('Informe um nome para o grupo.');

                ui.setLoading(true);
                await withFakeLatency(() => {
                  const currentGroups = loadJSON(STORAGE_KEYS.groups, []);
                  currentGroups.push({ id: uuid(), name, description, createdAt: Date.now() });
                  saveJSON(STORAGE_KEYS.groups, currentGroups);
                });
                ui.setLoading(false);
                ui.toast.show({ title: 'Grupo criado', message: 'Abra o detalhe para adicionar tarefas.' });
                refresh();
              } catch (e) {
                ui.setLoading(false);
                err.textContent = e?.message || 'Falha ao criar grupo.';
                err.hidden = false;
              }
            };

            return el('div', {}, [
              el('div', { class: 'field' }, [el('div', { class: 'label', text: 'Nome' }), nameInput]),
              el('div', { class: 'field', style: 'margin-top: 10px;' }, [el('div', { class: 'label', text: 'Descrição' }), descInput]),
              el('div', { style: 'margin-top: 12px;' }, btn),
              err,
            ]);
          })(),
        ]),

        el('section', { class: 'card' }, [
          el('h3', { text: 'Seus grupos' }),
          el('div', { class: 'list', id: 'groups-list' }),
        ]),
      ]),
    ]),
  ]);

  function renderList() {
    const list = root.querySelector('#groups-list');
    list.innerHTML = '';
    const groupsNow = loadJSON(STORAGE_KEYS.groups, []);
    const tasksNow = loadJSON(STORAGE_KEYS.tasks, []);
    const mapCounts = new Map();
    for (const t of tasksNow) mapCounts.set(t.groupId, (mapCounts.get(t.groupId) || 0) + 1);

    if (!groupsNow.length) {
      list.appendChild(el('div', { class: 'alert' }, 'Nenhum grupo ainda. Crie seu primeiro grupo.'));
      return;
    }

    for (const g of groupsNow) {
      const card = el('div', { class: 'card' });
      card.appendChild(el('h3', { text: g.name }));
      card.appendChild(el('p', { class: 'muted', text: g.description || 'Sem descrição.' }));
      card.appendChild(el('p', { class: 'muted', style: 'margin-top: 8px;', text: `${mapCounts.get(g.id) || 0} tarefas` }));

      const actions = el('div', { style: 'display:flex; gap: 10px; margin-top: 12px; flex-wrap: wrap;' });
      const openBtn = el('button', { class: 'btn primary', type: 'button', text: 'Abrir' });
      openBtn.onclick = () => (location.hash = `#/groups/${g.id}`);
      const delBtn = el('button', { class: 'btn danger', type: 'button', text: 'Excluir' });
      delBtn.onclick = async () => {
        const ok = window.confirm(`Excluir o grupo "${g.name}"? As tarefas relacionadas também serão removidas.`);
        if (!ok) return;
        try {
          ui.setLoading(true);
          await withFakeLatency(() => {
            const currentGroups = loadJSON(STORAGE_KEYS.groups, []);
            const currentTasks = loadJSON(STORAGE_KEYS.tasks, []);
            const nextGroups = currentGroups.filter((x) => x.id !== g.id);
            const nextTasks = currentTasks.filter((t) => t.groupId !== g.id);
            saveJSON(STORAGE_KEYS.groups, nextGroups);
            saveJSON(STORAGE_KEYS.tasks, nextTasks);
          });
          ui.setLoading(false);
          ui.toast.show({ title: 'Grupo excluído', message: 'Remoção concluída.' });
          refresh();
        } catch (e) {
          ui.setLoading(false);
          ui.toast.show({ title: 'Falha ao excluir', message: e?.message || 'Tente novamente.' });
        }
      };
      actions.appendChild(openBtn);
      actions.appendChild(delBtn);
      card.appendChild(actions);

      list.appendChild(card);
    }
  }

  function refresh() {
    renderList();
    setNavCurrent('groups');
  }

  refresh();
  return root;
}

function renderGroupDetail(groupId) {
  const groups = loadJSON(STORAGE_KEYS.groups, []);
  const tasks = loadJSON(STORAGE_KEYS.tasks, []);
  const group = groups.find((g) => g.id === groupId);

  if (!group) {
    return el('div', {}, [
      el('section', { class: 'card' }, [
        el('h2', { text: 'Grupo não encontrado' }),
        el('p', { class: 'muted', text: 'Volte para a lista.' }),
        el('button', { class: 'btn', type: 'button', onclick: () => (location.hash = '#/groups'), text: 'Voltar' }),
      ]),
    ]);
  }

  const tasksForGroup = () => loadJSON(STORAGE_KEYS.tasks, []).filter((t) => t.groupId === groupId);

  const root = el('div', {}, [
    el('section', { class: 'card' }, [
      el('div', { class: 'row' }, [
        el('div', {}, [
          el('h2', { text: group.name }),
          el('p', { class: 'muted', text: group.description || 'Sem descrição.', style: 'margin:0;' }),
        ]),
        el('button', { class: 'btn', type: 'button', text: 'Voltar', onclick: () => (location.hash = '#/groups') }),
      ]),
    ]),
    el('section', { class: 'card', style: 'margin-top: 12px;' }, [
      el('h3', { text: 'Adicionar tarefa' }),
      el('div', { class: 'grid grid-2' }, [
        el('div', { class: 'field' }, [
          el('div', { class: 'label', text: 'Título' }),
          el('input', { class: 'input', placeholder: 'Ex: Caminhada', maxLength: 90, id: 'task-title' }),
        ]),
        el('div', { class: 'field' }, [
          el('div', { class: 'label', text: 'Dia' }),
          (() => {
            const sel = el('select', { class: 'select', id: 'task-day' });
            for (const d of DAY_ORDER) sel.appendChild(el('option', { value: d, text: d }));
            sel.value = getDayKey();
            return sel;
          })(),
        ]),
      ]),
      el('div', { style: 'margin-top: 12px;' }, [
        el('button', { class: 'btn primary', type: 'button', text: 'Adicionar', id: 'task-add' }),
      ]),
      el('div', { class: 'alert error', style: 'display:none; margin-top: 12px;', id: 'group-task-error' }),
    ]),
    el('section', { class: 'card', style: 'margin-top: 12px;' }, [
      el('h3', { text: 'Tarefas por dia' }),
      el('div', { id: 'tasks-by-day', class: 'list' }),
    ]),
  ]);

  root.querySelector('#task-add').onclick = async () => {
    const err = root.querySelector('#group-task-error');
    err.style.display = 'none';
    try {
      const title = sanitizeText(root.querySelector('#task-title').value, { maxLength: 90 });
      const day = root.querySelector('#task-day').value;
      if (!title) throw new Error('Informe um título para a tarefa.');
      if (!DAY_ORDER.includes(day)) throw new Error('Dia inválido.');

      ui.setLoading(true);
      await withFakeLatency(() => {
        const current = loadJSON(STORAGE_KEYS.tasks, []);
        current.push({ id: uuid(), title, groupId: groupId, day, createdAt: Date.now() });
        saveJSON(STORAGE_KEYS.tasks, current);
      });
      ui.setLoading(false);
      ui.toast.show({ title: 'Tarefa adicionada', message: 'A tarefa já aparece no calendário do grupo.' });
      refresh();
    } catch (e) {
      ui.setLoading(false);
      err.textContent = e?.message || 'Falha ao adicionar tarefa.';
      err.style.display = 'block';
    }
  };

  function renderTasks() {
    const host = root.querySelector('#tasks-by-day');
    host.innerHTML = '';
    const currentTasks = tasksForGroup().sort((a, b) => a.createdAt - b.createdAt);

    if (!currentTasks.length) {
      host.appendChild(el('div', { class: 'alert' }, 'Sem tarefas ainda. Adicione uma acima.'));
      return;
    }

    for (const day of DAY_ORDER) {
      const list = currentTasks.filter((t) => t.day === day);
      if (!list.length) continue;
      const card = el('div', { class: 'card' });
      card.appendChild(el('h3', { text: day.toUpperCase() }));

      for (const t of list) {
        const row = el('div', { class: 'row', style: 'padding: 10px 8px;' }, [
          el('div', {}, [
            el('span', { text: t.title }),
          ]),
        ]);
        const delBtn = el('button', { class: 'btn danger', type: 'button', text: 'Excluir' });
        delBtn.onclick = async () => {
          try {
            ui.setLoading(true);
            await withFakeLatency(() => {
              const current = loadJSON(STORAGE_KEYS.tasks, []);
              const next = current.filter((x) => x.id !== t.id);
              saveJSON(STORAGE_KEYS.tasks, next);
            });
            ui.setLoading(false);
            ui.toast.show({ title: 'Tarefa excluída', message: 'Registro removido com sucesso.' });
            refresh();
          } catch (err) {
            ui.setLoading(false);
            ui.toast.show({ title: 'Falha ao excluir', message: err?.message || 'Tente novamente.' });
          }
        };
        row.appendChild(delBtn);
        card.appendChild(row);
      }
      host.appendChild(card);
    }
  }

  function refresh() {
    renderTasks();
    setNavCurrent('groupDetail');
  }

  refresh();
  return root;
}

async function renderRoute() {
  const route = routeFromHash();
  setNavCurrent(route.page);
  ui.appHost.innerHTML = '';

  ui.setLoading(true);
  try {
    await initSeedIfNeeded();
    
    if (route.page === 'dashboard') ui.appHost.appendChild(renderDashboard());
    else if (route.page === 'checkin') ui.appHost.appendChild(renderCheckin());
    else if (route.page === 'meals') ui.appHost.appendChild(renderMeals());
    else if (route.page === 'groups') ui.appHost.appendChild(renderGroups());
    else if (route.page === 'groupDetail') ui.appHost.appendChild(renderGroupDetail(route.groupId));
    else ui.appHost.appendChild(renderDashboard());
  } catch (e) {
    ui.appHost.appendChild(buildLoadingCard());
    ui.toast.show({ title: 'Erro', message: e?.message || 'Não foi possível carregar o app.' });
  } finally {
    ui.setLoading(false);
  }
}

function setupRouting() {
  window.addEventListener('hashchange', () => renderRoute(), { passive: true });
  // default
  if (!location.hash) location.hash = '#/dashboard';
  return renderRoute();
}

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.register('./service-worker.js');
    // O SW faz update automaticamente no próximo fetch; não exigimos UX adicional.
    void reg;
  } catch {
    // ignore (app continua funcional)
  }
}

function setupInstallPrompt() {
  const banner = ui.installBanner;
  const btn = ui.installBtn;
  const closeBtn = ui.installClose;
  const dismissCheckbox = ui.installDismiss;
  const help = ui.installHelp;

  // Verificar se usuário já dispensou o banner
  const isDismissed = localStorage.getItem('install-banner-dismissed') === 'true';
  if (isDismissed) {
    banner.hidden = true;
    return;
  }

  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
  if (isStandalone) {
    banner.hidden = true;
    return;
  }

  let deferredPrompt = null;
  let helpTimeout = null;

  function showBanner() {
    banner.hidden = false;
  }

  function showHelp() {
    help.hidden = false;
  }

  function hideBanner() {
    banner.hidden = true;
    if (dismissCheckbox.checked) {
      localStorage.setItem('install-banner-dismissed', 'true');
    }
  }

  // Botão X para fechar
  closeBtn.addEventListener('click', hideBanner);

  // iOS/Safari pode não disparar beforeinstallprompt.
  helpTimeout = setTimeout(() => {
    if (!deferredPrompt) {
      showBanner();
      showHelp();
    }
  }, 8000);

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    clearTimeout(helpTimeout);
    showBanner();
  });

  btn.onclick = async () => {
    if (!deferredPrompt) {
      showHelp();
      ui.toast.show({ title: 'Instalação', message: 'Toque e siga as instruções para adicionar à tela de início.' });
      return;
    }

    try {
      btn.disabled = true;
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice?.outcome === 'accepted') {
        ui.toast.show({ title: 'Instalando...', message: 'App será adicionado à tela inicial.' });
        hideBanner();
      } else {
        showHelp();
      }
    } catch {
      showHelp();
    } finally {
      btn.disabled = false;
    }
  };
}

(async function bootstrap() {
  setOnlineState();
  window.addEventListener('online', setOnlineState, { passive: true });
  window.addEventListener('offline', setOnlineState, { passive: true });

  await registerServiceWorker();
  setupInstallPrompt();
  setupRouting();
  setupMobileMenu();
})();

function setupMobileMenu() {
  const menuBtn = document.querySelector('.mobile-menu-btn');
  const nav = document.querySelector('.nav');
  
  if (!menuBtn || !nav) return;
  
  menuBtn.addEventListener('click', () => {
    const isOpen = menuBtn.getAttribute('aria-expanded') === 'true';
    menuBtn.setAttribute('aria-expanded', !isOpen);
    nav.classList.toggle('nav-open', !isOpen);
  });
  
  // Fecha menu ao clicar em um link
  nav.addEventListener('click', (e) => {
    if (e.target.tagName === 'A') {
      menuBtn.setAttribute('aria-expanded', 'false');
      nav.classList.remove('nav-open');
    }
  });
  
  // Fecha menu ao clicar fora
  document.addEventListener('click', (e) => {
    if (!menuBtn.contains(e.target) && !nav.contains(e.target)) {
      menuBtn.setAttribute('aria-expanded', 'false');
      nav.classList.remove('nav-open');
    }
  });
}

