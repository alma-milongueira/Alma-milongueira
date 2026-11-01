// Guarda de áudios no próprio aparelho (IndexedDB): modo local e cache do modo nuvem.
const BANCO = "galpao-audios";
const LOJA = "audios";

function abrir(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(BANCO, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(LOJA);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

async function tx<T>(modo: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await abrir();
  return new Promise((res, rej) => {
    const t = db.transaction(LOJA, modo);
    const req = f(t.objectStore(LOJA));
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
    t.oncomplete = () => db.close();
  });
}

export const guardarAudio = (chave: string, blob: Blob) => tx("readwrite", (s) => s.put(blob, chave)).then(() => undefined);
export const lerAudio = (chave: string) => tx<Blob | undefined>("readonly", (s) => s.get(chave)).then((b) => b ?? null);
export const apagarAudio = (chave: string) => tx("readwrite", (s) => s.delete(chave)).then(() => undefined);
