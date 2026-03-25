import { el } from '../utils/dom.js';
import {
  createTask,
  deleteTask,
  getDayKey,
  listGroups,
  listTasksByGroup,
} from '../services/api.js';
import { navigate } from '../router.js';

const DAY_ORDER = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];

export async function renderGroupDetailPage({ route, toast }) {
  const groupId = route?.params?.id;
  const root = el('div', {});

  const allGroups = await listGroups();
  const group = allGroups.find((g) => g.id === groupId);

  if (!group) {
    root.appendChild(el('div', { class: 'alert error' }, 'Grupo não encontrado.'));
    root.appendChild(
      el('button', { class: 'btn', type: 'button', onclick: () => navigate('#/groups') }, 'Voltar para grupos')
    );
    return root;
  }

  let tasks = await listTasksByGroup(groupId);

  const taskTitleInput = el('input', { class: 'input', placeholder: 'Título da tarefa', maxLength: 90 });
  const daySelect = el('select', { class: 'select' });
  for (const d of DAY_ORDER) {
    daySelect.appendChild(el('option', { value: d }, d));
  }
  daySelect.value = getDayKey();

  const listHost = el('div', { style: 'margin-top: 12px;' });

  const formError = el('div', { class: 'alert error', style: 'display:none; margin-top: 12px;' });
  const formErrorMsg = el('div', {}, '');
  formError.appendChild(formErrorMsg);

  function renderTasks() {
    listHost.innerHTML = '';

    const tasksByDay = new Map();
    for (const t of tasks) {
      tasksByDay.set(t.day, [...(tasksByDay.get(t.day) || []), t]);
    }

    if (tasks.length === 0) {
      listHost.appendChild(el('div', { class: 'alert' }, 'Sem tarefas nesse grupo. Crie uma tarefa para começar.'));
      return;
    }

    for (const day of DAY_ORDER) {
      const dayTasks = tasksByDay.get(day) || [];
      if (dayTasks.length === 0) continue;

      const dayCard = el('section', { class: 'card', style: 'margin-top: 12px;' });
      dayCard.appendChild(el('h3', {}, day.toUpperCase()));

      const dayList = el('div', { class: 'grid grid-2', style: 'margin-top: 10px;' });

      for (const t of dayTasks) {
        const item = el('div', { class: 'card' }, el('h3', { style: 'font-size: 15px; margin-bottom: 0;' }, t.title));
        const actions = el('div', { style: 'margin-top: 10px;' });
        const delBtn = el('button', { class: 'btn danger', type: 'button' }, 'Excluir');
        delBtn.addEventListener('click', async () => {
          try {
            await deleteTask(t.id);
            toast.showToast({ title: 'Tarefa excluída', message: 'Registro removido com sucesso.' });
            tasks = tasks.filter((x) => x.id !== t.id);
            renderTasks();
          } catch (err) {
            toast.showToast({ title: 'Falha ao excluir', message: err?.message || 'Tente novamente.' });
          }
        });
        actions.appendChild(delBtn);
        item.appendChild(actions);
        dayList.appendChild(item);
      }

      dayCard.appendChild(dayList);
      listHost.appendChild(dayCard);
    }
  }

  const header = el('section', { class: 'card' });
  header.appendChild(
    el('div', { class: 'row' }, [
      el('div', {}, [
        el('h2', {}, group.name),
        el('p', { class: 'muted', style: 'margin:0;' }, group.description || 'Sem descrição.'),
      ]),
      el('button', { class: 'btn', type: 'button', onclick: () => navigate('#/groups') }, 'Voltar'),
    ])
  );

  const createCard = el('section', { class: 'card', style: 'margin-top: 12px;' });
  createCard.appendChild(el('h3', {}, 'Nova tarefa'));

  const createBtn = el('button', { class: 'btn primary', type: 'button' }, 'Adicionar');
  createBtn.addEventListener('click', async () => {
    formError.style.display = 'none';
    try {
      await createTask({
        groupId,
        title: taskTitleInput.value,
        day: daySelect.value,
      });
      toast.showToast({ title: 'Tarefa criada', message: 'A tarefa já aparece no calendário do grupo.' });
      taskTitleInput.value = '';
      tasks = await listTasksByGroup(groupId);
      renderTasks();
    } catch (err) {
      formErrorMsg.textContent = err?.message || 'Não foi possível criar a tarefa.';
      formError.style.display = 'block';
    }
  });

  const formGrid = el('div', { class: 'grid grid-2', style: 'margin-top: 10px;' });
  formGrid.appendChild(el('div', { class: 'field' }, [el('div', { class: 'label' }, 'Título'), taskTitleInput]));
  formGrid.appendChild(el('div', { class: 'field' }, [el('div', { class: 'label' }, 'Dia'), daySelect]));

  createCard.appendChild(formGrid);
  createCard.appendChild(el('div', { style: 'margin-top: 12px;' }, createBtn));
  createCard.appendChild(formError);

  root.appendChild(header);
  root.appendChild(createCard);
  root.appendChild(listHost);

  renderTasks();

  return root;
}

