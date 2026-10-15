import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AccessibleButton, StatusBorder } from '@/components';
import { subjectLabel } from '@/features/framing/subject';
import { strings } from '@/i18n';
import { nextInCycle } from '@/store/settingsStore';
import { GUIDANCE_MODES, useSession } from '@/store/sessionStore';
import { useTheme } from '@/theme';
import { announce, useScreenAnnouncement } from '@/utils/accessibility';
import { formatClock, splitDuration } from '@/utils/time';

// Phase 0 skeleton: zones, navigation and state are wired. The live camera, recording, cues and
// volume button control are added in Phase 1.
export default function CameraScreen() {
  const { colors, typography, spacing, layout } = useTheme('dark');
  const insets = useSafeAreaInsets();
  const t = strings.camera;

  const mode = useSession((s) => s.mode);
  const setMode = useSession((s) => s.setMode);
  const facing = useSession((s) => s.facing);
  const setFacing = useSession((s) => s.setFacing);
  const subject = useSession((s) => s.subject);
  const isRecording = useSession((s) => s.isRecording);
  const startedAt = useSession((s) => s.recordingStartedAt);
  const startRecording = useSession((s) => s.startRecording);
  const stopRecording = useSession((s) => s.stopRecording);

  useScreenAnnouncement(t.screenAnnouncement);
  const elapsed = useElapsed(startedAt);

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
      announce(t.recordingStopped);
      router.push('/review');
    } else {
      startRecording();
      announce(t.recordingStarted);
    }
  };

  const flip = () => {
    const next = facing === 'front' ? 'back' : 'front';
    setFacing(next);
    announce(t.facing[next]);
  };

  const switchMode = () => {
    const next = nextInCycle(GUIDANCE_MODES, mode);
    setMode(next);
    announce(t.modes[next]);
  };

  const edge = {
    top: insets.top + spacing.md,
    bottom: insets.bottom + spacing.md,
    left: insets.left + spacing.md,
    right: insets.right + spacing.md,
  };
  const { minutes, seconds } = splitDuration(elapsed);

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      <StatusBar style="light" />

      {/* Top row: Settings (top left), timer, Flip (top right). Rendered first for screen reader order. */}
      <View style={[styles.corner, styles.layerControls, { top: edge.top, left: edge.left }]}>
        <AccessibleButton
          scheme="dark"
          label={t.settings.label}
          hint={t.settings.hint}
          icon="⚙"
          text=""
          onPress={() => router.push('/settings')}
          testID="camera-settings"
        />
      </View>

      {isRecording ? (
        <View
          style={[
            styles.timer,
            styles.layerControls,
            {
              top: edge.top,
              backgroundColor: colors.surfaceOverlay,
              borderRadius: layout.cornerRadius,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
            },
          ]}
          accessible
          accessibilityRole="text"
          accessibilityLabel={`${t.recordingStarted}, ${t.timer(minutes, seconds)}`}
        >
          <Text style={[typography.timer, { color: colors.textPrimary }]}>
            {`● ${formatClock(elapsed)}`}
          </Text>
        </View>
      ) : null}

      <View style={[styles.corner, styles.layerControls, { top: edge.top, right: edge.right }]}>
        <AccessibleButton
          scheme="dark"
          label={t.flip.label}
          hint={t.flip.hint}
          icon="⟲"
          text=""
          onPress={flip}
          testID="camera-flip"
        />
      </View>

      {/* Centre: full screen camera area. Single tap speaks current status. */}
      <Pressable
        style={[StyleSheet.absoluteFill, styles.layerPreview, styles.center]}
        accessible
        accessibilityRole="button"
        accessibilityLabel={t.preview.label}
        accessibilityHint={t.preview.hint}
        onPress={() => announce(t.statusPlaceholder)}
        testID="camera-preview"
      >
        <View
          style={{
            backgroundColor: colors.surfaceOverlay,
            borderRadius: layout.cornerRadius,
            padding: spacing.md,
            marginHorizontal: spacing.xl,
          }}
        >
          <Text style={[typography.body, styles.centerText, { color: colors.textPrimary }]}>
            {t.placeholder}
          </Text>
        </View>
      </Pressable>

      <StatusBorder status={null} />

      {/* Bottom row: Mode (bottom left), Record (bottom centre), Subject (bottom right). */}
      <View style={[styles.corner, styles.layerControls, { bottom: edge.bottom, left: edge.left }]}>
        <AccessibleButton
          scheme="dark"
          label={t.mode.label(t.modes[mode])}
          hint={t.mode.hint}
          text={t.modes[mode]}
          onPress={switchMode}
          testID="camera-mode"
        />
      </View>

      <View
        style={[styles.recordWrap, styles.layerControls, { bottom: edge.bottom }]}
        pointerEvents="box-none"
      >
        <Pressable
          accessible
          accessibilityRole="button"
          accessibilityLabel={isRecording ? t.record.stopLabel : t.record.startLabel}
          accessibilityHint={t.record.hint}
          accessibilityState={{ selected: isRecording }}
          onPress={toggleRecording}
          testID="camera-record"
          style={({ pressed }) => [
            styles.center,
            {
              width: layout.recordButtonSize,
              height: layout.recordButtonSize,
              borderRadius: layout.recordButtonSize / 2,
              backgroundColor: colors.primaryButton.background,
              borderWidth: layout.focusRingWidth,
              borderColor: pressed ? colors.textPrimary : colors.primaryButton.border,
            },
          ]}
        >
          {/* Shape, not only colour, shows state: circle = ready, square = recording. */}
          <View
            style={{
              width: isRecording ? 32 : 40,
              height: isRecording ? 32 : 40,
              borderRadius: isRecording ? 6 : 20,
              backgroundColor: colors.primaryButton.text,
            }}
          />
        </Pressable>
      </View>

      <View
        style={[styles.corner, styles.layerControls, { bottom: edge.bottom, right: edge.right }]}
      >
        <AccessibleButton
          scheme="dark"
          label={t.subject.label(subjectLabel(subject))}
          hint={t.subject.hint}
          text={subjectLabel(subject)}
          onPress={() => router.push('/subject')}
          testID="camera-subject"
        />
      </View>
    </View>
  );
}

function useElapsed(startedAt: number | null): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (startedAt === null) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  // `now` can be a moment older than `startedAt` until the first tick; clamp to 0.
  return startedAt === null ? 0 : Math.max(0, now - startedAt);
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  centerText: { textAlign: 'center' },
  corner: { position: 'absolute' },
  timer: { position: 'absolute', alignSelf: 'center' },
  recordWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  layerPreview: { zIndex: 0 },
  layerControls: { zIndex: 2 },
});
