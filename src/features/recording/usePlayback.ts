import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useVideoPlayer } from 'expo-video';

import { applyAudioSession } from '@/audio/audioSession';
import { cues } from '@/cues';
import { claimSpeech } from '@/features/voice/speechLease';
import { strings } from '@/i18n';

/** Owns the speech lease from Play through Pause/end/error, including initial buffering. */
export function usePlayback(uri: string | undefined, active: boolean) {
  const player = useVideoPlayer(uri?.startsWith('file://') ? uri : null, (video) => {
    video.loop = false;
    video.staysActiveInBackground = false;
    video.showNowPlayingNotification = false;
    video.allowsExternalPlayback = false;
    video.audioMixingMode = 'mixWithOthers';
    video.timeUpdateEventInterval = 1;
  });
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [failed, setFailed] = useState(false);
  const release = useRef<(() => void) | null>(null);
  const requested = useRef(false);
  const live = useRef(active);
  useLayoutEffect(() => {
    live.current = active;
  });

  const releaseSpeech = useCallback(() => {
    if (!release.current) return;
    release.current?.();
    release.current = null;
    applyAudioSession();
  }, []);
  const pause = useCallback(() => {
    requested.current = false;
    try {
      player.pause();
    } catch {
      /* Player may already have been released on navigation. */
    }
    setPlaying(false);
    releaseSpeech();
  }, [player, releaseSpeech]);

  const play = useCallback(
    // expo-video is a native mutable SharedObject; seeking is its documented API.
    // eslint-disable-next-line react-hooks/immutability
    (restart = false) => {
      if (!live.current || !uri || failed) return;
      try {
        release.current ??= claimSpeech('recording.playback');
        cues.clear();
        if (restart || (player.duration > 0 && player.currentTime >= player.duration - 0.1)) {
          // eslint-disable-next-line react-hooks/immutability
          player.currentTime = 0;
          setPosition(0);
        }
        setPlaying(true);
        requested.current = true;
        player.play();
      } catch {
        pause();
        cues.say({
          id: 'sys.playback.busy',
          category: 'system',
          text: strings.review.busy,
          force: true,
        });
      }
    },
    [player, uri, failed, pause],
  );

  useEffect(() => {
    const listeners = [
      player.addListener('playingChange', ({ isPlaying }) => {
        if (isPlaying && (!live.current || !requested.current)) {
          pause();
          return;
        }
        // Native isPlaying is false while buffering and during interruptions. Keep the Pause
        // control and speech lease until an explicit pause, end, error or navigation.
        if (!requested.current) setPlaying(false);
      }),
      player.addListener('timeUpdate', ({ currentTime }) => setPosition(currentTime)),
      player.addListener('playToEnd', () => {
        pause();
        if (live.current)
          cues.say({
            id: 'sys.playback.ended',
            category: 'system',
            text: strings.playback.ended,
            force: true,
          });
      }),
      player.addListener('statusChange', ({ status }) => {
        if (status !== 'error') return;
        pause();
        setFailed(true);
        if (live.current)
          cues.say({
            id: 'sys.playback.failed',
            category: 'system',
            text: strings.playback.failed,
            force: true,
            earcon: 'error',
          });
      }),
    ];
    return () => {
      listeners.forEach((listener) => listener.remove());
      pause();
    };
  }, [player, pause, releaseSpeech]);

  useEffect(() => {
    // Pause the native player immediately when focus/activity changes; its event also updates UI.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!active) pause();
  }, [active, pause]);
  return { player, playing, position, failed, play, pause };
}
