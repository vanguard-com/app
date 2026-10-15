import { createMMKV } from 'react-native-mmkv';
import type { StateStorage } from 'zustand/middleware';

// Single on-device key/value store. Nothing here ever leaves the phone.
export const storage = createMMKV({ id: 'lumi' });

/** Adapter so Zustand's `persist` middleware can read and write MMKV synchronously. */
export const zustandStorage: StateStorage = {
  getItem: (name) => storage.getString(name) ?? null,
  setItem: (name, value) => storage.set(name, value),
  removeItem: (name) => {
    storage.remove(name);
  },
};
