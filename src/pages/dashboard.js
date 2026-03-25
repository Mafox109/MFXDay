import { el } from '../utils/dom.js';
import { getDayKey, getISODate, getCheckInForDate, listAllMeals, listGroups, listTasksForDay } from '../services/api.js';
import { navigate } from '../router.js';

function formatRating(r) {
  if (!r) return 'Sem avaliação';
  return `${r}/5`;
}

export async function renderPage() {
  const todayISO = getISODate();
  const todayKey = getDayKey();

  const [groups, tasksToday, mealsAll, checkin] = await Promise.all([
    listGroups(),
    listTasksForDay(todayKey),
    listAllMeals(),
    getCheckInForDate(todayISO),
  ]);

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return getISODate(d);
  });
  const meals7 = mealsAll.filter((m) => last7.includes(m.date)).length;

  const mealsToday = mealsAll.filter((m) => m.date === todayISO);
  const completedCount = checkin?.taskIdsCompleted?.length || 0;
  const totalTasks = tasksToday.length;

  const grid = el('div', { class: 'grid grid-3' });

  grid.appendChild(
    el('section', { class: 'card' }, [
      el('div', { class: 'row' }, [
        el('h2', {}, 'Hoje'),
        el('div', { class: 'muted' }, `${mealsToday.length} refeições`),
      ]),
      el('p', { class: 'muted' }, `Últimos 7 dias: ${meals7} registros`),
    ])
  );

  grid.appendChild(
    el('section', { class: 'card' }, [
      el('div', { class: 'row' }, [
        el('h2', {}, 'Check-in'),
        el('div', { class: 'muted' }, checkin ? 'Salvo' : 'Pendente'),
      ]),
      el('p', { class: 'muted' }, `Nota: ${formatRating(checkin?.rating)}`),
    ])
  );

  grid.appendChild(
    el('section', { class: 'card' }, [
      el('div', { class: 'row' }, [
        el('h2', {}, 'Tarefas do dia'),
        el('div', { class: 'muted' }, `${completedCount}/${totalTasks}`),
      ]),
      el('p', { class: 'muted' }, totalTasks === 0 ? 'Crie tarefas para habilitar o check-in.' : 'Marque as conclusões e registre sua reflexão.' ),
    ])
  );

  const shortcuts = el(
    'section',
    { class: 'card', style: 'margin-top: 12px;' },
    el('div', {}, [
      el('h3', {}, 'Atalhos'),
      el('p', { class: 'muted' }, 'Fluxo rápido, pensado para mobile-first.'),
      el(
        'div',
        { class: 'grid grid-2', style: 'margin-top: 12px;' },
        [
          el(
            'div',
            {},
            el(
              'button',
              { class: 'btn primary', type: 'button', onclick: () => navigate('#/checkin') },
              'Fazer check-in'
            )
          ),
          el(
            'div',
            {},
            el(
              'button',
              { class: 'btn', type: 'button', onclick: () => navigate('#/meals') },
              'Registrar refeição'
            )
          ),
        ]
      ),
      el(
        'div',
        { class: 'hr' },
        ''
      ),
      el('p', { class: 'muted' }, `Grupos cadastrados: ${groups.length}`),
      el('button', { class: 'btn', type: 'button', style: 'margin-top: 10px;', onclick: () => navigate('#/groups') }, 'Gerenciar grupos/tarefas'),
    ])
  );

  return el('div', {}, [grid, shortcuts]);
}

