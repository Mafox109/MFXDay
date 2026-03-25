import { el } from '../utils/dom.js';
import {
  addMeal,
  deleteMeal,
  getISODate,
  listAllMeals,
  listMealsForDate,
} from '../services/api.js';

const mealTypes = [
  { value: 'cafe_manha', label: 'Café' },
  { value: 'almoco', label: 'Almoço' },
  { value: 'jantar', label: 'Jantar' },
  { value: 'lanche', label: 'Lanche' },
];

function makeSelect(mealType, onChange) {
  const sel = el('select', { class: 'select', name: 'mealType' });
  for (const t of mealTypes) {
    const opt = el('option', { value: t.value }, t.label);
    if (t.value === mealType) opt.selected = true;
    sel.appendChild(opt);
  }
  if (onChange) sel.addEventListener('change', onChange);
  return sel;
}

function renderHeatmap({ allMeals }) {
  const root = el('div', { class: 'heat', style: 'margin-top: 8px;' });
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateISO = getISODate(d);
    const count = allMeals.filter((m) => m.date === dateISO).length;
    const cell = el('div', { class: 'cell' }, el('strong', {}, count));
    cell.appendChild(el('span', { class: 'muted', style: 'font-size:12px;' }, dateISO.slice(5)));
    root.appendChild(cell);
  }
  return root;
}

export async function renderPage({ toast }) {
  const initialDate = getISODate();

  let allMeals = await listAllMeals();

  let selectedDateISO = initialDate;
  const root = el('div', {});

  const formError = el('div', { class: 'alert error', style: 'display:none; margin-top: 12px;' });
  const formErrorMsg = el('div', {}, '');
  formError.appendChild(formErrorMsg);

  const listHost = el('div', { class: 'grid', style: 'margin-top: 12px;' });
  listHost.classList.add('grid-2');

  const heatHost = el('div', { class: 'card', style: 'margin-top: 12px;' });

  const typeDefault = 'almoco';
  const typeSelect = makeSelect(typeDefault);

  const dateInput = el('input', { class: 'input', type: 'date', value: selectedDateISO, 'aria-label': 'Data da refeição' });

  const descInput = el('textarea', { class: 'textarea', placeholder: 'Observação (opcional)...', maxLength: 220 });

  async function refreshMealsUI() {
    // Recarrega só o que muda: lista da data e cards de status (heatmap usa "allMeals").
    const current = await listMealsForDate(selectedDateISO);
    listHost.innerHTML = '';

    if (current.length === 0) {
      listHost.appendChild(el('div', { class: 'alert', style: 'grid-column: 1 / -1;' }, 'Sem refeições registradas nessa data.'));
    } else {
      for (const m of current) {
        const item = el('article', { class: 'card' });
        const header = el('div', { class: 'row' }, [
          el('h3', {}, mealTypes.find((t) => t.value === m.mealType)?.label || m.mealType),
          el('div', { class: 'muted', style: 'font-size: 13px;' }, new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })),
        ]);
        item.appendChild(header);
        item.appendChild(el('p', { class: 'muted' }, m.description ? m.description : 'Sem descrição.'));

        const actions = el('div', { style: 'margin-top: 12px;' });
        const delBtn = el('button', { class: 'btn danger', type: 'button' }, 'Excluir');
        delBtn.addEventListener('click', async () => {
          try {
            await deleteMeal(m.id);
            toast.showToast({
              title: 'Refeição excluída',
              message: 'Registro removido com sucesso.',
            });
            await refreshMealsUI();
            // Atualiza heatmap com "lazy": recarrega allMeals.
            const updatedAll = await listAllMeals();
            allMeals = updatedAll;
            heatHost.innerHTML = '';
            heatHost.appendChild(renderHeatmap({ allMeals }));
          } catch (err) {
            toast.showToast({
              title: 'Falha ao excluir',
              message: err?.message || 'Não foi possível excluir agora.',
            });
          }
        });
        actions.appendChild(delBtn);
        item.appendChild(actions);
        listHost.appendChild(item);
      }
    }
  }

  function renderHeader() {
    const gridTop = el('div', { class: 'grid grid-2' });

    const formCard = el('section', { class: 'card' });
    formCard.appendChild(el('h2', {}, 'Registrar refeição'));

    const form = el('form', { onsubmit: async (e) => e.preventDefault() });

    const row1 = el('div', { class: 'grid grid-2' });
    const fieldDate = el('div', { class: 'field' }, [
      el('div', { class: 'label' }, 'Data'),
      dateInput,
    ]);
    const fieldType = el('div', { class: 'field' }, [
      el('div', { class: 'label' }, 'Tipo'),
      typeSelect,
    ]);
    row1.appendChild(fieldDate);
    row1.appendChild(fieldType);

    const fieldDesc = el('div', { class: 'field', style: 'margin-top: 10px;' }, [
      el('div', { class: 'label' }, 'Descrição (opcional)'),
      descInput,
    ]);

    const actions = el('div', { style: 'display:flex; gap: 10px; margin-top: 12px; flex-wrap:wrap;' });
    const submitBtn = el('button', { class: 'btn primary', type: 'button' }, 'Salvar');
    const resetBtn = el('button', { class: 'btn', type: 'button' }, 'Limpar');

    dateInput.addEventListener('change', () => {
      selectedDateISO = dateInput.value;
      refreshMealsUI();
    });

    resetBtn.addEventListener('click', () => {
      descInput.value = '';
      typeSelect.selectedIndex = 0;
      selectedDateISO = initialDate;
      dateInput.value = initialDate;
      refreshMealsUI();
      formError.style.display = 'none';
    });

    submitBtn.addEventListener('click', async () => {
      formError.style.display = 'none';
      try {
        const description = descInput.value;
        await addMeal({
          dateISO: selectedDateISO,
          mealType: typeSelect.value,
          description,
        });
        descInput.value = '';
        toast.showToast({ title: 'Refeição salva', message: 'Registro adicionado com sucesso.' });

        const updatedAll = await listAllMeals();
        // Atualiza referência local do heatmap.
        allMeals = updatedAll;
        heatHost.innerHTML = '';
        heatHost.appendChild(renderHeatmap({ allMeals }));
        await refreshMealsUI();
      } catch (err) {
        formErrorMsg.textContent = err?.message || 'Não foi possível salvar agora.';
        formError.style.display = 'block';
      }
    });

    actions.appendChild(submitBtn);
    actions.appendChild(resetBtn);

    form.appendChild(row1);
    form.appendChild(fieldDesc);
    form.appendChild(actions);
    form.appendChild(formError);
    formCard.appendChild(form);

    gridTop.appendChild(formCard);

    const summary = el('section', { class: 'card' });
    summary.appendChild(el('h2', {}, 'Status'));
    const totalForDate = allMeals.filter((m) => m.date === selectedDateISO).length;
    summary.appendChild(el('p', { class: 'muted' }, `Total em ${selectedDateISO}: ` + totalForDate));
    summary.appendChild(el('p', { class: 'muted', style: 'margin-top: 6px;' }, 'Dica: funciona offline porque os dados ficam no seu dispositivo.'));

    gridTop.appendChild(summary);

    return gridTop;
  }

  root.appendChild(renderHeader());
  heatHost.appendChild(el('h3', {}, 'Últimos 7 dias (heatmap)'));
  heatHost.appendChild(renderHeatmap({ allMeals }));
  root.appendChild(heatHost);

  root.appendChild(el('div', { class: 'card', style: 'margin-top: 12px;' }, [
    el('h2', {}, 'Refeições na data selecionada'),
  ]));

  root.appendChild(listHost);

  // Render inicial
  await refreshMealsUI();

  return root;
}

