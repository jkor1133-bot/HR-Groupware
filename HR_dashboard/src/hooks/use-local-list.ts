"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useLocalList<T extends { id: string }>(
  storageKey: string,
  seedFn: () => T[],
) {
  const seedRef = useRef(seedFn);
  seedRef.current = seedFn;

  const [items, setItems] = useState<T[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) {
        setItems(seedRef.current());
      } else {
        const parsed = JSON.parse(raw) as T[];
        setItems(Array.isArray(parsed) ? parsed : seedRef.current());
      }
    } catch {
      setItems(seedRef.current());
    }
    setHydrated(true);
  }, [storageKey]);

  const persist = useCallback(
    (next: T[]) => {
      setItems(next);
      window.localStorage.setItem(storageKey, JSON.stringify(next));
    },
    [storageKey],
  );

  const upsert = useCallback(
    (item: T) => {
      setItems((prev) => {
        const exists = prev.some((x) => x.id === item.id);
        const next = exists
          ? prev.map((x) => (x.id === item.id ? item : x))
          : [...prev, item];
        window.localStorage.setItem(storageKey, JSON.stringify(next));
        return next;
      });
    },
    [storageKey],
  );

  const remove = useCallback(
    (id: string) => {
      setItems((prev) => {
        const next = prev.filter((x) => x.id !== id);
        window.localStorage.setItem(storageKey, JSON.stringify(next));
        return next;
      });
    },
    [storageKey],
  );

  const replaceAll = useCallback(
    (next: T[]) => persist(next),
    [persist],
  );

  const reset = useCallback(
    () => persist(seedRef.current()),
    [persist],
  );

  return { hydrated, items, upsert, remove, replaceAll, reset };
}
