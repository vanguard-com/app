import { AdjustableRow, Screen, ScreenHeader } from '@/components';
import { strings } from '@/i18n';
import {
  CUE_VOLUME_RANGE,
  nextInCycle,
  stepValue,
  useSettings,
  VOICE_RATE_RANGE,
  type CueType,
  type Verbosity,
} from '@/store/settingsStore';
import { useScreenAnnouncement } from '@/utils/accessibility';

const VERBOSITY: readonly Verbosity[] = ['minimal', 'standard', 'detailed'];
const CUE_TYPES: readonly CueType[] = ['tone', 'voice', 'both'];

export default function SoundSettings() {
  const t = strings.settings;
  const verbosity = useSettings((s) => s.verbosity);
  const cueType = useSettings((s) => s.cueType);
  const voiceRate = useSettings((s) => s.voiceRate);
  const cueVolume = useSettings((s) => s.cueVolume);
  const update = useSettings((s) => s.update);

  useScreenAnnouncement(t.groups.sound.label);

  return (
    <Screen>
      <ScreenHeader title={t.groups.sound.label} />
      <AdjustableRow
        label={t.verbosity.label}
        valueText={t.verbosity.values[verbosity]}
        onIncrement={() => update({ verbosity: nextInCycle(VERBOSITY, verbosity, 1) })}
        onDecrement={() => update({ verbosity: nextInCycle(VERBOSITY, verbosity, -1) })}
        testID="setting-verbosity"
      />
      <AdjustableRow
        label={t.cueType.label}
        valueText={t.cueType.values[cueType]}
        onIncrement={() => update({ cueType: nextInCycle(CUE_TYPES, cueType, 1) })}
        onDecrement={() => update({ cueType: nextInCycle(CUE_TYPES, cueType, -1) })}
        testID="setting-cue-type"
      />
      <AdjustableRow
        label={t.voiceRate.label}
        valueText={t.voiceRate.value(Math.round(voiceRate * 100))}
        onIncrement={() => update({ voiceRate: stepOrWrap(voiceRate, VOICE_RATE_RANGE, 1) })}
        onDecrement={() => update({ voiceRate: stepValue(voiceRate, VOICE_RATE_RANGE, -1) })}
        testID="setting-voice-rate"
      />
      <AdjustableRow
        label={t.cueVolume.label}
        valueText={t.cueVolume.value(Math.round(cueVolume * 100))}
        onIncrement={() => update({ cueVolume: stepOrWrap(cueVolume, CUE_VOLUME_RANGE, 1) })}
        onDecrement={() => update({ cueVolume: stepValue(cueVolume, CUE_VOLUME_RANGE, -1) })}
        testID="setting-cue-volume"
      />
    </Screen>
  );
}

/** Double tap steps up and wraps to the minimum at the top, so it never gets stuck. */
function stepOrWrap(value: number, range: { min: number; max: number; step: number }, dir: 1) {
  return value >= range.max ? range.min : stepValue(value, range, dir);
}
