import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_DATA } from './data';
import type { AppData, SaveStatus } from './types';
import { normalizeData } from './utils';

const DB_NAME = 'le-chemin-db';
const STORE_NAME = 'state';
const STATE_KEY = 'current';
const BACKUP_KEY = 'le-chemin-local-backup-v1';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB indisponible'));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Impossible d'ouvrir la base locale"));
    request.onblocked = () => reject(new Error('Base locale bloquée par un autre onglet'));
  });
}

async function readPrimary(): Promise<AppData | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const request = transaction.objectStore(STORE_NAME).get(STATE_KEY);
    request.onsuccess = () => resolve(request.result ? normalizeData(request.result) : null);
    request.onerror = () => reject(request.error ?? new Error('Lecture locale impossible'));
    transaction.oncomplete = () => db.close();
  });
}

async function writePrimary(data: AppData): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put(data, STATE_KEY);
    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => {
      const error = transaction.error ?? new Error('Écriture locale impossible');
      db.close();
      reject(error);
    };
    transaction.onabort = () => {
      const error = transaction.error ?? new Error('Écriture locale interrompue');
      db.close();
      reject(error);
    };
  });
}

function readBackup(): AppData | null {
  try {
    const raw = localStorage.getItem(BACKUP_KEY);
    return raw ? normalizeData(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function writeBackup(data: AppData): void {
  localStorage.setItem(BACKUP_KEY, JSON.stringify(data));
}

function newest(a: AppData | null, b: AppData | null): AppData | null {
  if (!a) return b;
  if (!b) return a;
  return Date.parse(a.updatedAt) >= Date.parse(b.updatedAt) ? a : b;
}

export interface AppStore {
  data: AppData;
  ready: boolean;
  saveStatus: SaveStatus;
  saveError: string;
  lastSavedAt?: Date;
  update: (recipe: (current: AppData) => AppData) => void;
  replace: (data: AppData) => void;
  retry: () => void;
}

export function useAppStore(): AppStore {
  const [data, setData] = useState<AppData>(() => structuredClone(DEFAULT_DATA));
  const [ready, setReady] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [saveError, setSaveError] = useState('');
  const [lastSavedAt, setLastSavedAt] = useState<Date>();
  const dataRef = useRef(data);
  const pendingRef = useRef<AppData | null>(null);
  const writingRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const flush = useCallback(async () => {
    if (writingRef.current) return;
    writingRef.current = true;
    while (pendingRef.current) {
      const snapshot = pendingRef.current;
      pendingRef.current = null;
      try {
        await writePrimary(snapshot);
      } catch (error) {
        pendingRef.current = pendingRef.current ?? snapshot;
        if (mountedRef.current) {
          setSaveStatus('error');
          setSaveError(error instanceof Error ? error.message : 'Sauvegarde principale impossible');
        }
        writingRef.current = false;
        return;
      }
    }
    writingRef.current = false;
    if (mountedRef.current) {
      setSaveStatus('saved');
      setSaveError('');
      setLastSavedAt(new Date());
    }
  }, []);

  const persist = useCallback((snapshot: AppData) => {
    setSaveStatus('saving');
    setSaveError('');
    try {
      // Cette copie est synchrone : le clic est protégé avant même la fin de l'écriture IndexedDB.
      writeBackup(snapshot);
    } catch (error) {
      setSaveStatus('error');
      setSaveError(error instanceof Error ? error.message : 'Copie de secours saturée');
      return;
    }
    pendingRef.current = snapshot;
    void flush();
  }, [flush]);

  useEffect(() => {
    mountedRef.current = true;
    void (async () => {
      const [primaryResult] = await Promise.allSettled([readPrimary()]);
      const primary = primaryResult.status === 'fulfilled' ? primaryResult.value : null;
      const backup = readBackup();
      const loaded = newest(primary, backup) ?? structuredClone(DEFAULT_DATA);
      dataRef.current = loaded;
      if (mountedRef.current) {
        setData(loaded);
        setReady(true);
      }
      // Répare automatiquement la copie la plus ancienne ou initialise les deux supports.
      persist(loaded);
    })();
    return () => {
      mountedRef.current = false;
    };
  }, [persist]);

  const update = useCallback((recipe: (current: AppData) => AppData) => {
    const next = {
      ...recipe(dataRef.current),
      version: 1,
      updatedAt: new Date().toISOString(),
    };
    dataRef.current = next;
    setData(next);
    persist(next);
  }, [persist]);

  const replace = useCallback((incoming: AppData) => {
    const next = {
      ...normalizeData(incoming),
      version: 1,
      updatedAt: new Date().toISOString(),
    };
    dataRef.current = next;
    setData(next);
    persist(next);
  }, [persist]);

  const retry = useCallback(() => {
    pendingRef.current = dataRef.current;
    setSaveStatus('saving');
    setSaveError('');
    try {
      writeBackup(dataRef.current);
    } catch (error) {
      setSaveStatus('error');
      setSaveError(error instanceof Error ? error.message : 'Copie de secours saturée');
      return;
    }
    void flush();
  }, [flush]);

  return { data, ready, saveStatus, saveError, lastSavedAt, update, replace, retry };
}

export const STORAGE_BACKUP_KEY = BACKUP_KEY;
