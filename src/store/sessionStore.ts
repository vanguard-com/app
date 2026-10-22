import { create } from 'zustand';
import type { FeedbackSummary } from '@/features/feedback/stats';
import type { VoiceSummary } from '@/features/feedback/recordedVoice';
import { useRecordingHistory } from './recordingHistory';

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

/** idle -> starting (microphone attaching) -> recording -> stopping -> idle */
export type RecordingPhase = 'idle' | 'starting' | 'recording' | 'stopping';

export interface RecordingInfo {
  /** file:// URI inside Lumi's documents folder. */
  uri: string;
  durationMs: number;
  hasAudio: boolean;
  savedToPhotos: boolean;
  autoSaveResult?: 'saved' | 'denied' | 'failed';
  feedbackSummary?: FeedbackSummary;
  voiceSummary?: VoiceSummary;
}

interface SessionState {
  mode: GuidanceMode;
  facing: CameraFacing;
  subject: SubjectTarget;
  recordingPhase: RecordingPhase;
  isRecording: boolean;
  /** Epoch ms when the current recording started. */
  recordingStartedAt: number | null;
  lastRecording: RecordingInfo | null;
  setMode: (mode: GuidanceMode) => void;
  setFacing: (facing: CameraFacing) => void;
  setSubject: (subject: SubjectTarget) => void;
  setRecordingPhase: (phase: RecordingPhase) => void;
  startRecording: (now?: number) => void;
  stopRecording: () => void;
  setLastRecording: (info: RecordingInfo | null) => void;
  markSaved: () => void;
}

// Live, in-memory state for the current camera session. Not persisted.
export const useSession = create<SessionState>()((set) => ({
  mode: 'framing',
  // Front camera by default: most users film themselves.
  facing: 'front',
  subject: { kind: 'face' },
  recordingPhase: 'idle',
  isRecording: false,
  recordingStartedAt: null,
  lastRecording: null,
  setMode: (mode) => set({ mode }),
  setFacing: (facing) => set({ facing }),
  setSubject: (subject) => set({ subject }),
  setRecordingPhase: (recordingPhase) => set({ recordingPhase }),
  startRecording: (now = Date.now()) =>
    set({ recordingPhase: 'recording', isRecording: true, recordingStartedAt: now }),
  stopRecording: () =>
    set({ recordingPhase: 'idle', isRecording: false, recordingStartedAt: null }),
  setLastRecording: (lastRecording) => {
    if (lastRecording) useRecordingHistory.getState().remember(lastRecording);
    set({ lastRecording });
  },
  markSaved: () =>
    set((s) => {
      if (!s.lastRecording) return s;
      const info = { ...s.lastRecording, savedToPhotos: true };
      useRecordingHistory.getState().remember(info);
      return { lastRecording: info };
    }),
}));
