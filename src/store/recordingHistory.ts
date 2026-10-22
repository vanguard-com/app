import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { RecordingInfo } from './sessionStore';
import { zustandStorage } from './storage';

interface HistoryState {
  recordings: RecordingInfo[];
  remember: (info: RecordingInfo) => void;
  forget: (uri: string) => void;
}
export const useRecordingHistory = create<HistoryState>()(
  persist(
    (set) => ({
      recordings: [],
      remember: (info) =>
        set((s) => ({
          recordings: [info, ...s.recordings.filter((r) => r.uri !== info.uri)].slice(0, 20),
        })),
      forget: (uri) => set((s) => ({ recordings: s.recordings.filter((r) => r.uri !== uri) })),
    }),
    {
      name: 'recording-history',
      version: 1,
      storage: createJSONStorage(() => zustandStorage),
      partialize: ({ recordings }) => ({ recordings }),
    },
  ),
);
