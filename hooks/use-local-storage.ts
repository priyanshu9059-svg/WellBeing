'use client';
/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react';

export function useLocalStorage<T>(key:string, initial:T) {
  const [value,setValue] = useState<T>(initial);
  const [ready,setReady] = useState(false);
  useEffect(() => {
    try { const stored = localStorage.getItem(`wellbeing-support:${key}`); if (stored) setValue(JSON.parse(stored)); } catch {}
    setReady(true);
  },[key]);
  useEffect(() => { if (ready) localStorage.setItem(`wellbeing-support:${key}`,JSON.stringify(value)); },[key,value,ready]);
  return [value,setValue,ready] as const;
}
