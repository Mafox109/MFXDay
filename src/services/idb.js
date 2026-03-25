const DB_NAME = 'mfxday';
const DB_VERSION = 1;

const STORES = {
  groups: 'groups',
  tasks: 'tasks',
  meals: 'meals',
  checkins: 'checkins',
};

let dbPromise = null;

function open() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;

      if (!db.objectStoreNames.contains(STORES.groups)) {
        db.createObjectStore(STORES.groups, { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains(STORES.tasks)) {
        const store = db.createObjectStore(STORES.tasks, { keyPath: 'id' });
        store.createIndex('groupId', 'groupId', { unique: false });
        store.createIndex('day', 'day', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.meals)) {
        const store = db.createObjectStore(STORES.meals, { keyPath: 'id' });
        store.createIndex('date', 'date', { unique: false });
        store.createIndex('mealType', 'mealType', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.checkins)) {
        const store = db.createObjectStore(STORES.checkins, { keyPath: 'id' });
        store.createIndex('date', 'date', { unique: false });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getDB() {
  if (!dbPromise) dbPromise = open();
  return dbPromise;
}

export async function getAll(storeName) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function getByIndex(storeName, indexName, key) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const index = store.index(indexName);
    const req = index.getAll(key);
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function getOne(storeName, key) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function put(storeName, value) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.put(value);
    req.onsuccess = () => resolve(value);
    req.onerror = () => reject(req.error);
  });
}

export async function del(storeName, key) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.delete(key);
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

export async function clearStore(storeName) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.clear();
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

export function stores() {
  return STORES;
}

