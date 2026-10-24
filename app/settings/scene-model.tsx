import { useCallback, useEffect, useState } from 'react';
import { Linking, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { AccessibleButton, Screen, ScreenHeader } from '@/components';
import { cues } from '@/cues';
import {
  checkCapacity,
  cancelModelDownload,
  deleteModel,
  installModel,
  refreshModels,
  useModels,
} from '@/features/background/models';
import { resolveManifest, type ModelManifest } from '@/features/background/catalog';
import { strings } from '@/i18n';
import { useSettings } from '@/store/settingsStore';
import { useTheme } from '@/theme';

export default function SceneModelScreen() {
  const { model } = useLocalSearchParams<{ model?: string }>(),
    kind = model === 'detailed' ? 'detailed' : 'standard';
  const t = strings.background,
    { colors, typography, spacing } = useTheme();
  const installed = useModels((s) => s.installed[kind]),
    phase = useModels((s) => s.phase),
    downloading = useModels((s) => s.downloading),
    progress = useModels((s) => s.progress);
  const selected = useSettings((s) => s.sceneModel);
  const [manifest, setManifest] = useState<ModelManifest | null>(null),
    [message, setMessage] = useState(t.checking),
    [working, setWorking] = useState(false);
  const busy = phase !== 'idle' || working;
  const hasModel = !!installed;
  useEffect(() => {
    void refreshModels();
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    let live = true;
    if (!hasModel)
      resolveManifest(kind, controller.signal)
        .then(async (value) => {
          await checkCapacity(value);
          if (!live) return;
          setManifest(value);
          const consent = t.consent(t.modelNames[kind], t.size(value.bytes));
          setMessage(consent);
          cues.say({ id: 'model.consent', category: 'system', text: consent, force: true });
        })
        .catch((error) => {
          if (live) {
            const text =
              error instanceof Error && error.message === 'capacity'
                ? kind === 'detailed'
                  ? t.detailedCapacity
                  : t.capacity
                : kind === 'detailed' &&
                    error instanceof Error &&
                    error.message.includes('vision model pair')
                  ? t.detailedUnsupported
                  : t.catalogFailed;
            setMessage(text);
            cues.say({ id: 'model.information', category: 'system', text, force: true });
          }
        });
    return () => {
      live = false;
      controller.abort();
      void cancelModelDownload();
    };
  }, [kind, hasModel, t]);
  const run = useCallback(async () => {
    if (!manifest) return;
    setWorking(true);
    try {
      await installModel(manifest);
      setMessage(t.installed);
    } catch (error) {
      const text =
        error instanceof Error && error.message === 'cancelled'
          ? t.cancelled
          : error instanceof Error && error.message === 'wifi'
            ? t.wifi
            : t.downloadFailed;
      setMessage(text);
      cues.say({ id: 'model.result', category: 'system', text, force: true });
    } finally {
      setWorking(false);
    }
  }, [manifest, t]);
  const cancel = () => {
    void cancelModelDownload();
  };
  return (
    <Screen>
      <ScreenHeader title={t.modelNames[kind]} />
      <Text
        style={[typography.body, { color: colors.textPrimary, marginBottom: spacing.md }]}
        accessibilityLiveRegion="polite"
      >
        {downloading === kind
          ? phase === 'verifying'
            ? t.verifying
            : t.downloading(progress)
          : installed
            ? selected === kind
              ? t.selected
              : t.installed
            : message}
      </Text>
      <Text style={[typography.body, { color: colors.textPrimary, marginBottom: spacing.md }]}>
        {kind === 'detailed' ? t.gemmaLicense : t.standardLicense}
      </Text>
      {busy ? (
        <AccessibleButton label={t.cancel.label} hint={t.cancel.hint} onPress={cancel} />
      ) : installed ? (
        <>
          <AccessibleButton
            label={t.select.label}
            hint={t.select.hint}
            disabled={selected === kind}
            onPress={() => {
              useSettings.getState().update({ sceneModel: kind });
              cues.say({
                id: 'model.selected',
                category: 'system',
                text: `${t.modelNames[kind]}. ${t.selected}`,
                force: true,
              });
            }}
          />
          <AccessibleButton
            label={t.delete.label}
            hint={t.delete.hint}
            onPress={() => {
              setWorking(true);
              void deleteModel(kind)
                .then(() => setMessage(t.deleted))
                .catch(() => setMessage(t.downloadFailed))
                .finally(() => setWorking(false));
            }}
          />
        </>
      ) : (
        <AccessibleButton
          label={t.download.label}
          hint={t.download.hint}
          disabled={!manifest}
          onPress={() => void run()}
        />
      )}
      {!busy ? (
        <AccessibleButton
          label={t.licence.label}
          hint={t.licence.hint}
          role="link"
          onPress={() => {
            void Linking.openURL(
              kind === 'detailed'
                ? 'https://ai.google.dev/gemma/terms'
                : 'https://www.apache.org/licenses/LICENSE-2.0',
            ).catch(() =>
              cues.say({
                id: 'sys.link.failed',
                category: 'system',
                text: strings.common.linkFailed,
                force: true,
              }),
            );
          }}
        />
      ) : null}
    </Screen>
  );
}
