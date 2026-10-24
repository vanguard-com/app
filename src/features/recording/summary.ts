import { strings } from '@/i18n';
import type { RecordingInfo } from '@/store/sessionStore';

/** Shared visible/spoken summary, with coverage rather than invented full-video percentages. */
export function recordingSummary(recording: RecordingInfo, detailed: boolean): string {
  return [
    strings.review.summary(strings.common.duration(recording.durationMs / 1000)),
    recording.hasAudio ? '' : strings.review.noAudio,
    strings.review.measurements(recording.recordingSummary),
    recording.feedbackSummary ? strings.feedback.summary(recording.feedbackSummary) : '',
    recording.voiceSummary ? strings.feedback.voiceSummary(recording.voiceSummary, detailed) : '',
  ]
    .filter(Boolean)
    .join(' ');
}
