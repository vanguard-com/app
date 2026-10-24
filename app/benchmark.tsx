import { useEffect, useRef, useState } from 'react';
import { Platform, Text } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Device from 'expo-device';
import { Images } from 'react-native-nitro-image';
import { AccessibleButton, Screen, ScreenHeader } from '@/components';
import { useBenchmarks } from '@/features/background/benchmark';
import { cancelScene, describeScene } from '@/features/background/scene';
import { refreshModels, useModels } from '@/features/background/models';
import { strings } from '@/i18n';
import { useSettings } from '@/store/settingsStore';
import { useTheme } from '@/theme';

export default function BenchmarkScreen() {
  const t = strings.background,
    { colors, typography } = useTheme();
  const unlocked = useSettings((s) => s.debugOverlay),
    records = useBenchmarks((s) => s.records);
  const [running, setRunning] = useState(false),
    [status, setStatus] = useState(t.benchmark.intro);
  const job = useRef(0),
    mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    const counter = job;
    return () => {
      mounted.current = false;
      ++counter.current;
      cancelScene();
    };
  }, []);
  const cancel = () => {
    ++job.current;
    cancelScene();
  };
  const run = async () => {
    if (running || !unlocked) return;
    const token = ++job.current;
    setRunning(true);
    let uri: string | null = null,
      original: string | null = null;
    const live = () => mounted.current && job.current === token;
    try {
      // System picker: no request for broad photo-library access, and no image upload.
      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
        exif: false,
      });
      if (picked.canceled || !picked.assets[0]) {
        if (live()) setStatus(t.benchmark.noPhoto);
        return;
      }
      original = picked.assets[0].uri;
      if (!original.startsWith('file://') || !FileSystem.cacheDirectory)
        throw new Error('Local photo unavailable');
      const image = await Images.loadFromFileAsync(original.replace('file://', ''));
      try {
        const scale = Math.min(1, 640 / Math.max(image.width, image.height));
        const small = await image.resizeAsync(
          Math.max(1, Math.round(image.width * scale)),
          Math.max(1, Math.round(image.height * scale)),
        );
        try {
          uri = `${FileSystem.cacheDirectory}benchmark-${Date.now()}.jpg`;
          await small.saveToFileAsync(uri.replace('file://', ''), 'jpg', 80);
        } finally {
          small.dispose();
        }
      } finally {
        image.dispose();
      }
      await refreshModels();
      for (const model of ['standard', 'detailed'] as const) {
        if (!live()) break;
        setStatus(`${t.benchmark.running}. ${t.modelNames[model]}`);
        const base = {
          model,
          at: Date.now(),
          device: Device.modelName ?? 'unknown',
          os: `${Platform.OS} ${Platform.Version}`,
        };
        if (!useModels.getState().installed[model]) {
          useBenchmarks.getState().add({ ...base, result: null, status: 'missing' });
          continue;
        }
        try {
          const result = await describeScene(uri, model);
          if (live()) useBenchmarks.getState().add({ ...base, result, status: 'ok' });
        } catch {
          if (live()) useBenchmarks.getState().add({ ...base, result: null, status: 'failed' });
        }
      }
      if (live()) setStatus(t.benchmark.intro);
    } catch {
      if (live()) setStatus(t.benchmark.failed);
    } finally {
      if (uri) await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
      // Only remove picker-created copies inside this app's cache, never a library original.
      if (original && FileSystem.cacheDirectory && original.startsWith(FileSystem.cacheDirectory))
        await FileSystem.deleteAsync(original, { idempotent: true }).catch(() => {});
      if (mounted.current) setRunning(false);
    }
  };
  return (
    <Screen>
      <ScreenHeader title={t.benchmark.label} />
      <Text
        style={[typography.body, { color: colors.textPrimary }]}
        accessibilityLiveRegion="polite"
      >
        {status}
      </Text>
      {unlocked ? (
        <>
          <AccessibleButton
            label={running ? t.cancel.label : t.benchmark.choose}
            hint={running ? t.cancel.hint : t.benchmark.chooseHint}
            onPress={running ? cancel : () => void run()}
          />
          <AccessibleButton
            label={t.benchmark.clear}
            hint={t.benchmark.clearHint}
            disabled={running}
            onPress={() => useBenchmarks.getState().clear()}
          />
          {records.map((r, i) => (
            <Text key={i} selectable style={[typography.body, { color: colors.textPrimary }]}>
              {r.result
                ? t.benchmark.result(
                    t.modelNames[r.model],
                    r.result.totalMs,
                    r.result.loadMs,
                    r.result.generationMs,
                    r.result.text,
                  )
                : `${t.modelNames[r.model]}. ${r.status === 'missing' ? t.benchmark.missing : t.benchmark.failed}`}
            </Text>
          ))}
        </>
      ) : null}
    </Screen>
  );
}
