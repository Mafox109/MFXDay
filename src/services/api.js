import { getAll, getByIndex, getOne, put, del } from './idb.js';
import { sanitizeText } from './sanitize.js';

const DAY_ORDER = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];

function isValidDay(day) {
  return DAY_ORDER.includes(day);
}

function uuid() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function getISODate(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function getDayKey(date = new Date()) {
  return DAY_ORDER[date.getDay()] || 'segunda';
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function simulateRequest(fn) {
  const ms = navigator.onLine ? 220 : 60;
  await delay(ms);
  return fn();
}

export async function ensureSeedData() {
  const groups = await getAll('groups');
  if (groups.length > 0) return;

  const group1 = {
    id: uuid(),
    name: 'Atividade',
    description: 'Treinos, estudos e consistência.',
    createdAt: Date.now(),
  };
  const group2 = {
    id: uuid(),
    name: 'Bem-estar',
    description: 'Leitura, respiração e hábitos.',
    createdAt: Date.now(),
  };

  await put('groups', group1);
  await put('groups', group2);

  const todayKey = getDayKey();

  // Um conjunto pequeno para o usuário já ter um check-in utilizável de primeira.
  const tasksToSeed = [
    { title: 'Treino', groupId: group1.id, day: todayKey },
    { title: 'Estudar', groupId: group1.id, day: todayKey },
    { title: 'Ler', groupId: group2.id, day: todayKey },
  ];

  for (const t of tasksToSeed) {
    await put('tasks', {
      id: uuid(),
      title: sanitizeText(t.title, { maxLength: 80 }),
      groupId: t.groupId,
      day: t.day,
      createdAt: Date.now(),
    });
  }
}

export async function listGroups() {
  return simulateRequest(() => getAll('groups'));
}

export async function listTasksByGroup(groupId) {
  return simulateRequest(async () => {
    const tasks = await getByIndex('tasks', 'groupId', groupId);
    // Ordena por dia e criação para UX consistente.
    const byDay = (a) => DAY_ORDER.indexOf(a.day);
    return tasks.sort((a, b) => byDay(a) - byDay(b) || a.createdAt - b.createdAt);
  });
}

export async function listTasksForDay(dayKey) {
  if (!isValidDay(dayKey)) dayKey = getDayKey();
  return simulateRequest(async () => {
    const tasks = await getByIndex('tasks', 'day', dayKey);
    // Ordena por grupo (nome) é mais custoso; mantemos por data.
    return tasks.sort((a, b) => a.createdAt - b.createdAt);
  });
}

export async function listAllTasks() {
  return simulateRequest(() => getAll('tasks'));
}

export async function createGroup({ name, description }) {
  return simulateRequest(async () => {
    const cleanName = sanitizeText(name, { maxLength: 60 });
    const cleanDesc = sanitizeText(description, { maxLength: 180 });
    if (!cleanName) throw new Error('Informe um nome para o grupo.');

    const group = {
      id: uuid(),
      name: cleanName,
      description: cleanDesc,
      createdAt: Date.now(),
    };
    return put('groups', group);
  });
}

export async function deleteGroup(groupId) {
  return simulateRequest(async () => {
    await del('groups', groupId);
    // "Cascata" simples: remove tarefas relacionadas.
    const tasks = await getByIndex('tasks', 'groupId', groupId);
    await Promise.all(tasks.map((t) => del('tasks', t.id)));
    return true;
  });
}

export async function createTask({ groupId, title, day }) {
  return simulateRequest(async () => {
    const cleanTitle = sanitizeText(title, { maxLength: 90 });
    if (!groupId) throw new Error('Grupo inválido.');
    if (!cleanTitle) throw new Error('Informe um título para a tarefa.');

    const cleanDay = isValidDay(day) ? day : getDayKey();
    const task = {
      id: uuid(),
      groupId,
      title: cleanTitle,
      day: cleanDay,
      createdAt: Date.now(),
    };
    return put('tasks', task);
  });
}

export async function deleteTask(taskId) {
  return simulateRequest(async () => {
    await del('tasks', taskId);
    return true;
  });
}

export async function listMealsForDate(dateISO) {
  return simulateRequest(async () => {
    const meals = await getByIndex('meals', 'date', dateISO);
    return meals.sort((a, b) => b.createdAt - a.createdAt);
  });
}

export async function listAllMeals() {
  return simulateRequest(() => getAll('meals'));
}

export async function addMeal({ dateISO, mealType, description }) {
  return simulateRequest(async () => {
    const cleanDate = sanitizeText(dateISO, { maxLength: 10 });
    const cleanType = sanitizeText(mealType, { maxLength: 25 });
    const cleanDesc = sanitizeText(description, { maxLength: 220 });

    // Validação leve: aceita YYYY-MM-DD.
    if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) throw new Error('Data inválida.');
    if (!cleanType) throw new Error('Tipo de refeição inválido.');

    const meal = {
      id: crypto.randomUUID(),
      date: cleanDate,
      mealType: cleanType,
      description: cleanDesc,
      createdAt: Date.now(),
    };
    return put('meals', meal);
  });
}

export async function deleteMeal(mealId) {
  return simulateRequest(async () => {
    await del('meals', mealId);
    return true;
  });
}

export async function saveCheckIn({ dateISO, taskIdsCompleted, rating, reflection }) {
  return simulateRequest(async () => {
    const cleanDate = sanitizeText(dateISO, { maxLength: 10 });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) throw new Error('Data inválida.');

    const cleanRating = Number(rating);
    if (!(cleanRating >= 1 && cleanRating <= 5)) throw new Error('Selecione uma nota entre 1 e 5.');

    const cleanReflection = sanitizeText(reflection, { maxLength: 1200 });
    const uniqueTaskIds = Array.from(new Set((taskIdsCompleted || []).filter(Boolean)));

    // Atualiza check-in existente do dia (1 por data) por substituição.
    const existing = await getByIndex('checkins', 'date', cleanDate);
    for (const chk of existing) {
      await del('checkins', chk.id);
    }

    const checkin = {
      id: uuid(),
      date: cleanDate,
      taskIdsCompleted: uniqueTaskIds,
      rating: cleanRating,
      reflection: cleanReflection,
      createdAt: Date.now(),
    };
    return put('checkins', checkin);
  });
}

export async function getCheckInForDate(dateISO) {
  return simulateRequest(async () => {
    const existing = await getByIndex('checkins', 'date', dateISO);
    // Mantém o mais recente (na prática, só 1 por data).
    return existing.sort((a, b) => b.createdAt - a.createdAt)[0] || null;
  });
}

