import { el } from '../utils/dom.js';
import {
  getDayKey,
  getISODate,
  getCheckInForDate,
  listGroups,
  listTasksForDay,
  saveCheckIn,
} from '../services/api.js';

const STAR_COUNT = 5;

export async function renderPage({ toast }) {
  const root = el('div', {});

  const todayISO = getISODate();
  const todayKey = getDayKey();

  const [tasks, groups, existing] = await Promise.all([
    listTasksForDay(todayKey),
    listGroups(),
    getCheckInForDate(todayISO),
  ]);

  const groupNameById = new Map(groups.map((g) => [g.id, g.name]));

  let selectedTaskIds = new Set(existing?.taskIdsCompleted || []);
  let rating = existing?.rating || 0;
  let reflectionValue = existing?.reflection || '';

  const savedMeta = el('p', { class: 'muted', style: 'margin-top: 6px;' }, existing ? `Salvo em ${new Date(existing.createdAt).toLocaleString()}` : '');

  const offlineHint = el('div', { class: 'alert', style: `display:${navigator.onLine ? 'none' : 'block'}; margin-bottom: 12px;` }, [
    el('strong', {}, 'Modo offline:'),
    ' suas alterações serão salvas localmente.',
  ]);

  const tasksCard = el('section', { class: 'card' });
  tasksCard.appendChild(el('h2', {}, 'Tarefas do dia'));
  tasksCard.appendChild(el('p', { class: 'muted' }, `Hoje: ${todayKey.toUpperCase()}`));

  const tasksHost = el('div', { style: 'margin-top: 12px;' });

  if (tasks.length === 0) {
    tasksHost.appendChild(el('div', { class: 'alert' }, 'Nenhuma tarefa cadastrada para este dia. Crie tarefas em `Grupos`.'));
  } else {
    for (const t of tasks) {
      const row = el('div', { style: 'display:flex; align-items:center; justify-content:space-between; gap: 12px;' });
      const left = el('label', { style: 'display:flex; align-items:center; gap: 10px; cursor:pointer;' });
      const checkbox = el('input', {
        type: 'checkbox',
        checked: selectedTaskIds.has(t.id),
        'aria-label': `Marcar concluída: ${t.title}`,
      });
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) selectedTaskIds.add(t.id);
        else selectedTaskIds.delete(t.id);
      });

      const title = el('span', {}, t.title);
      const groupName = el('span', { class: 'muted', style: 'font-size: 12px;' }, `(${groupNameById.get(t.groupId) || 'Grupo'})`);

      left.appendChild(checkbox);
      left.appendChild(title);
      left.appendChild(groupName);

      row.appendChild(left);
      tasksHost.appendChild(row);
    }
  }

  tasksCard.appendChild(tasksHost);

  const ratingCard = el('section', { class: 'card', style: 'margin-top: 12px;' });
  ratingCard.appendChild(el('h2', {}, 'Avaliação'));

  const starsHost = el('div', { class: 'stars', role: 'radiogroup', 'aria-label': 'Selecione sua nota' });

  function updateStars() {
    for (let i = 1; i <= STAR_COUNT; i++) {
      const btn = starsHost.querySelector(`[data-star="${i}"]`);
      if (!btn) continue;
      const active = i <= rating;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-checked', String(active));
    }
    updateSaveEnabled();
  }

  for (let i = 1; i <= STAR_COUNT; i++) {
    const btn = el(
      'button',
      {
        type: 'button',
        class: 'star',
        'data-star': String(i),
        role: 'radio',
        'aria-checked': String(i === rating),
        onclick: () => {
          rating = i;
          updateStars();
        },
      },
      '★'
    );
    starsHost.appendChild(btn);
  }

  ratingCard.appendChild(starsHost);
  ratingCard.appendChild(savedMeta);

  const reflectionCard = el('section', { class: 'card', style: 'margin-top: 12px;' });
  reflectionCard.appendChild(el('h2', {}, 'Reflexão'));

  const textarea = el('textarea', { class: 'textarea', placeholder: 'Escreva uma reflexão (opcional)...', maxLength: 1200 });
  textarea.value = reflectionValue;

  reflectionCard.appendChild(el('div', { style: 'margin-top: 8px;' }, textarea));

  const formError = el('div', { class: 'alert error', style: 'display:none; margin-top: 12px;' });
  const formErrorMsg = el('div', {}, '');
  formError.appendChild(formErrorMsg);

  const saveBtn = el('button', { class: 'btn primary', type: 'button', style: 'margin-top: 12px;', disabled: rating === 0 }, 'Salvar check-in');
  saveBtn.addEventListener('click', async () => {
    formError.style.display = 'none';
    saveBtn.disabled = true;
    const oldText = saveBtn.textContent;
    saveBtn.textContent = 'Salvando...';

    try {
      reflectionValue = textarea.value;
      await saveCheckIn({
        dateISO: todayISO,
        taskIdsCompleted: Array.from(selectedTaskIds),
        rating,
        reflection: reflectionValue,
      });
      toast.showToast({ title: 'Check-in salvo', message: 'Registro atualizado com sucesso.' });
      // Atualiza meta (sem recarregar tudo).
      savedMeta.textContent = `Salvo em ${new Date().toLocaleString()}`;
    } catch (err) {
      formErrorMsg.textContent = err?.message || 'Não foi possível salvar agora.';
      formError.style.display = 'block';
    } finally {
      saveBtn.disabled = rating === 0;
      saveBtn.textContent = oldText;
    }
  });

  function updateSaveEnabled() {
    saveBtn.disabled = rating === 0;
  }

  updateStars();

  root.appendChild(offlineHint);
  root.appendChild(tasksCard);
  root.appendChild(ratingCard);
  root.appendChild(reflectionCard);
  root.appendChild(formError);
  root.appendChild(saveBtn);

  return root;
}

