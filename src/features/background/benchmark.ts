import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { zustandStorage } from '@/store/storage';
import type { SceneModel } from '@/store/settingsStore';
import type { SceneResult } from './scene';
export interface BenchmarkRecord {
  model: SceneModel;
  at: number;
  result: SceneResult | null;
  status: 'ok' | 'missing' | 'failed';
  device: string;
  os: string;
}
export const useBenchmarks = create<{
  records: BenchmarkRecord[];
  add: (record: BenchmarkRecord) => void;
  clear: () => void;
}>()(
  persist(
    (set) => ({
      records: [],
      add: (record) => set((s) => ({ records: [...s.records, record].slice(-20) })),
      clear: () => set({ records: [] }),
    }),
    {
      name: 'scene-benchmarks',
      storage: createJSONStorage(() => zustandStorage),
      partialize: ({ records }) => ({ records }),
    },
  ),
);
