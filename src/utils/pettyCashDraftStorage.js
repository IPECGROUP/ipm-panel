const DATABASE_NAME = "ipm-petty-cash-drafts";
const STORE_NAME = "reports";

function openDraftDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("draft_storage_blocked"));
  });
}

async function transact(userId, mode, operation) {
  const db = await openDraftDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const request = operation(transaction.objectStore(STORE_NAME), String(userId));
    let result;
    request.onsuccess = () => { result = request.result; };
    transaction.oncomplete = () => { db.close(); resolve(result); };
    transaction.onerror = () => { db.close(); reject(transaction.error); };
    transaction.onabort = () => { db.close(); reject(transaction.error || new Error("draft_storage_aborted")); };
  });
}

export const readPettyCashDraft = (userId) => transact(userId, "readonly", (store, key) => store.get(key));
export const writePettyCashDraft = (userId, draft) => transact(userId, "readwrite", (store, key) => store.put(draft, key));
export const removePettyCashDraft = (userId) => transact(userId, "readwrite", (store, key) => store.delete(key));
