import { el } from '../utils/dom.js';
import { createGroup, deleteGroup, listAllTasks, listGroups } from '../services/api.js';
import { navigate } from '../router.js';

export async function renderPage({ toast }) {
  const root = el('div', {});

  let groups = await listGroups();
  let tasksAll = await listAllTasks();

  const countsByGroupId = new Map();
  for (const t of tasksAll) countsByGroupId.set(t.groupId, (countsByGroupId.get(t.groupId) || 0) + 1);

  const refresh = async () => {
    groups = await listGroups();
    tasksAll = await listAllTasks();
    countsByGroupId.clear();
    for (const t of tasksAll) countsByGroupId.set(t.groupId, (countsByGroupId.get(t.groupId) || 0) + 1);
    renderList();
    formError.style.display = 'none';
  };

  const formError = el('div', { class: 'alert error', style: 'display:none; margin-top: 12px;' });
  const formErrorMsg = el('div', {}, '');
  formError.appendChild(formErrorMsg);

  const nameInput = el('input', { class: 'input', placeholder: 'Nome do grupo', maxLength: 60 });
  const descInput = el('textarea', { class: 'textarea', placeholder: 'Descrição (opcional)...', maxLength: 180 });

  const listHost = el('div', { class: 'grid grid-2', style: 'margin-top: 12px;' });

  function renderList() {
    listHost.innerHTML = '';

    if (groups.length === 0) {
      listHost.appendChild(el('div', { class: 'alert', style: 'grid-column: 1 / -1;' }, 'Nenhum grupo ainda. Crie o primeiro para começar.'));
      return;
    }

    for (const g of groups) {
      const card = el('section', { class: 'card' });
      card.appendChild(el('h3', {}, g.name));
      card.appendChild(el('p', { class: 'muted' }, g.description || 'Sem descrição.'));
      card.appendChild(el('p', { class: 'muted', style: 'margin-top: 8px;' }, `${countsByGroupId.get(g.id) || 0} tarefas`));

      const actions = el('div', { style: 'display:flex; gap: 10px; margin-top: 12px; flex-wrap:wrap;' });
      const openBtn = el('button', { class: 'btn primary', type: 'button' }, 'Abrir');
      openBtn.addEventListener('click', () => navigate(`#/groups/${g.id}`));

      const delBtn = el('button', { class: 'btn danger', type: 'button' }, 'Excluir');
      delBtn.addEventListener('click', async () => {
        const ok = window.confirm(`Excluir o grupo "${g.name}"? As tarefas relacionadas também serão removidas.`);
        if (!ok) return;
        try {
          await deleteGroup(g.id);
          toast.showToast({ title: 'Grupo excluído', message: 'Remoção concluída.' });
          await refresh();
        } catch (err) {
          toast.showToast({ title: 'Falha ao excluir', message: err?.message || 'Tente novamente.' });
        }
      });

      actions.appendChild(openBtn);
      actions.appendChild(delBtn);
      card.appendChild(actions);

      listHost.appendChild(card);
    }
  }

  const header = el('section', { class: 'card' });
  header.appendChild(el('h2', {}, 'Grupos e Tarefas'));
  header.appendChild(el('p', { class: 'muted' }, 'Organize suas atividades por categoria e por dia.'));

  const formCard = el('section', { class: 'card', style: 'margin-top: 12px;' });
  formCard.appendChild(el('h3', {}, 'Criar grupo'));

  const createBtn = el('button', { class: 'btn primary', type: 'button' }, 'Criar');
  createBtn.addEventListener('click', async () => {
    try {
      formError.style.display = 'none';
      await createGroup({ name: nameInput.value, description: descInput.value });
      nameInput.value = '';
      descInput.value = '';
      toast.showToast({ title: 'Grupo criado', message: 'Agora você pode adicionar tarefas no detalhe.' });
      await refresh();
    } catch (err) {
      formErrorMsg.textContent = err?.message || 'Não foi possível criar o grupo.';
      formError.style.display = 'block';
    }
  });

  formCard.appendChild(el('div', { class: 'grid grid-2' }, [
    el('div', { class: 'field' }, [el('div', { class: 'label' }, 'Nome'), nameInput]),
    el('div', { class: 'field' }, [el('div', { class: 'label' }, 'Descrição'), descInput]),
  ]));

  formCard.appendChild(el('div', { style: 'margin-top: 12px;' }, createBtn));
  formCard.appendChild(formError);

  root.appendChild(header);
  root.appendChild(formCard);
  root.appendChild(listHost);

  renderList();

  return root;
}

