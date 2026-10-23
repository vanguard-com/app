import { useCallback, useEffect, useRef, type RefObject } from 'react';
import { router } from 'expo-router';
import type { CameraRef } from 'react-native-vision-camera';
import * as FileSystem from 'expo-file-system/legacy';
import { cues } from '@/cues';
import { strings } from '@/i18n';
import { useSettings } from '@/store/settingsStore';
import { cancelScene, describeScene, useSceneState } from './scene';
import { refreshModels, useModels } from './models';

export function useSceneDescription(
  camera: RefObject<CameraRef | null>,
  active: boolean,
  fallback: () => string,
) {
  const busy = useSceneState((s) => s.busy);
  const generation = useRef(0),
    running = useRef(false),
    live = useRef(active);
  useEffect(() => {
    live.current = active;
    void refreshModels();
    const counter = generation;
    return () => {
      live.current = false;
      ++counter.current;
      cancelScene();
    };
  }, [active]);
  const cancel = useCallback(() => {
    ++generation.current;
    cancelScene();
    cues.clearCategory('background');
  }, []);
  const describe = useCallback(async () => {
    if (!live.current || running.current) return;
    const kind = useSettings.getState().sceneModel;
    if (!useModels.getState().installed[kind]) {
      cues.say({ id: 'scene.fallback', category: 'background', text: fallback(), force: true });
      router.push({ pathname: '/settings/scene-model', params: { model: kind, request: '1' } });
      return;
    }
    running.current = true;
    const token = ++generation.current;
    const valid = () => live.current && generation.current === token;
    let uri: string | null = null;
    cues.say({
      id: 'scene.thinking',
      category: 'background',
      text: strings.background.thinking,
      earcon: 'thinking',
      force: true,
    });
    const timer = setInterval(() => {
      if (valid())
        cues.say({ id: 'scene.thinking.sound', category: 'background', earcon: 'thinking' });
    }, 3000);
    try {
      const image = await camera.current?.takeSnapshot();
      if (!image) throw new Error('snapshot unavailable');
      try {
        const scale = Math.min(1, 640 / Math.max(image.width, image.height));
        const small = await image.resizeAsync(
          Math.max(1, Math.round(image.width * scale)),
          Math.max(1, Math.round(image.height * scale)),
        );
        try {
          if (!FileSystem.cacheDirectory) throw new Error('cache unavailable');
          uri = `${FileSystem.cacheDirectory}scene-${Date.now()}.jpg`;
          await small.saveToFileAsync(uri.replace('file://', ''), 'jpg', 80);
        } finally {
          small.dispose();
        }
      } finally {
        image.dispose();
      }
      if (!valid()) return;
      const result = await describeScene(uri, kind);
      if (valid())
        cues.say({
          id: 'scene.description',
          category: 'background',
          text: strings.background.description(result.text),
          force: true,
        });
    } catch {
      if (valid())
        cues.say({
          id: 'scene.fallback',
          category: 'background',
          text: strings.background.fallback(fallback()),
          force: true,
        });
    } finally {
      clearInterval(timer);
      if (uri) await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
      running.current = false;
    }
  }, [camera, fallback]);
  return { busy, describe, cancel };
}
