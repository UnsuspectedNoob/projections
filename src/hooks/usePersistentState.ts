import { useState, useEffect } from 'react';

export function usePersistentState<T>(key: string, initialValue: T, isDate: boolean = false): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        const parsed = JSON.parse(item);
        if (isDate && parsed) {
          return new Date(parsed) as unknown as T;
        }
        return parsed;
      }
    } catch (error) {
      console.warn(`Error reading localStorage for key "${key}":`, error);
    }
    return initialValue;
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      console.warn(`Error setting localStorage for key "${key}":`, error);
    }
  }, [key, state]);

  return [state, setState];
}
