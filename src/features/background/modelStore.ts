import { create } from 'zustand';
import * as FileSystem from 'expo-file-system/legacy';
import type { SceneModel } from '@/store/settingsStore';
import type { ModelManifest } from './catalog';
export interface ModelState {
  installed: Partial<Record<SceneModel, ModelManifest>>;
  phase: 'idle' | 'downloading' | 'verifying';
  downloading: SceneModel | null;
  progress: number;
}
export const useModels = create<ModelState>(() => ({
  installed: {},
  phase: 'idle',
  downloading: null,
  progress: 0,
}));
const root = () => {
  if (!FileSystem.documentDirectory) throw new Error('Documents unavailable');
  return `${FileSystem.documentDirectory}scene-models/`;
};
export const modelDirectory = (kind: SceneModel) => `${root()}${kind}/`;
