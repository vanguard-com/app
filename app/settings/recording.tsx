import { router } from 'expo-router';
import { AccessibleButton, AdjustableRow, Screen, ScreenHeader, ToggleRow } from '@/components';
import { strings } from '@/i18n';
import {
  nextInCycle,
  useSettings,
  type ElapsedTimeInterval,
  type RecordingCueMode,
} from '@/store/settingsStore';

const CUE_MODES: readonly RecordingCueMode[] = ['earphonesOnly', 'pause', 'always'];
const INTERVALS: readonly ElapsedTimeInterval[] = [30, 60, 0];
const INTERVAL_KEY = { 0: 'off', 30: 's30', 60: 's60' } as const;

export default function RecordingSettings() {
  const t = strings.settings;
  const recordingCues = useSettings((s) => s.recordingCues);
  const interval = useSettings((s) => s.elapsedTimeInterval);
  const voiceWhileRecording = useSettings((s) => s.voiceCommandsWhileRecording);
  const update = useSettings((s) => s.update);

  return (
    <Screen>
      <ScreenHeader title={t.groups.camera.label} />
      <AdjustableRow
        label={t.recordingCues.label}
        valueText={t.recordingCues.values[recordingCues]}
        onIncrement={() => update({ recordingCues: nextInCycle(CUE_MODES, recordingCues, 1) })}
        onDecrement={() => update({ recordingCues: nextInCycle(CUE_MODES, recordingCues, -1) })}
        testID="setting-recording-cues"
      />
      <AccessibleButton
        label={t.framing.label}
        hint={t.framing.hint}
        onPress={() => router.push('/settings/framing')}
        testID="setting-framing"
      />
      <AdjustableRow
        label={t.elapsedTime.label}
        valueText={t.elapsedTime.values[INTERVAL_KEY[interval]]}
        onIncrement={() => update({ elapsedTimeInterval: nextInCycle(INTERVALS, interval, 1) })}
        onDecrement={() => update({ elapsedTimeInterval: nextInCycle(INTERVALS, interval, -1) })}
        testID="setting-elapsed-time"
      />
      <ToggleRow
        label={t.voiceCommandsWhileRecording.label}
        value={voiceWhileRecording}
        onChange={(value) => update({ voiceCommandsWhileRecording: value })}
        testID="setting-voice-while-recording"
      />
    </Screen>
  );
}
