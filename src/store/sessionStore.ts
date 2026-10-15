import { create } from 'zustand';

export type GuidanceMode = 'framing' | 'lighting' | 'feedback' | 'background';
export const GUIDANCE_MODES: readonly GuidanceMode[] = [
  'framing',
  'lighting',
  'feedback',
  'background',
];

export type CameraFacing = 'front' | 'back';

/** What the user wants kept in frame. COCO class names are added in Phase 2. */
export type SubjectTarget =
  { kind: 'face' } | { kind: 'person' } | { kind: 'object'; cocoClass: string; label: string };

interface SessionState {
  mode: GuidanceMode;
  facing: CameraFacing;
  subject: SubjectTarget;
  isRecording: boolean;
  /** Epoch ms when the current recording started. */
  recordingStartedAt: number | null;
  setMode: (mode: GuidanceMode) => void;
  setFacing: (facing: CameraFacing) => void;
  setSubject: (subject: SubjectTarget) => void;
  startRecording: (now?: number) => void;
  stopRecording: () => void;
}

// Live, in-memory state for the current camera session. Not persisted.
export const useSession = create<SessionState>()((set) => ({
  mode: 'framing',
  // Front camera by default: most users film themselves.
  facing: 'front',
  subject: { kind: 'face' },
  isRecording: false,
  recordingStartedAt: null,
  setMode: (mode) => set({ mode }),
  setFacing: (facing) => set({ facing }),
  setSubject: (subject) => set({ subject }),
  startRecording: (now = Date.now()) => set({ isRecording: true, recordingStartedAt: now }),
  stopRecording: () => set({ isRecording: false, recordingStartedAt: null }),
}));
