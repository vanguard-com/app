import { channelPolicy, hasEarphones, type ChannelInputs } from '@/cues/policy';

const base: ChannelInputs = {
  isRecording: false,
  recordingCues: 'earphonesOnly',
  earphonesConnected: false,
  cueType: 'both',
  screenReaderOn: false,
};

describe('channelPolicy', () => {
  it('allows everything when not recording', () => {
    expect(channelPolicy(base)).toEqual({
      guidanceSpeech: 'tts',
      systemSpeech: 'tts',
      tones: true,
      earcons: true,
      haptics: true,
    });
  });

  it('earphones only: vibration only while recording without earphones', () => {
    expect(channelPolicy({ ...base, isRecording: true })).toEqual({
      guidanceSpeech: 'off',
      systemSpeech: 'off',
      tones: false,
      earcons: false,
      haptics: true,
    });
  });

  it('earphones only: full cues while recording with earphones', () => {
    const p = channelPolicy({ ...base, isRecording: true, earphonesConnected: true });
    expect(p.guidanceSpeech).toBe('tts');
    expect(p.tones).toBe(true);
    expect(p.haptics).toBe(true);
  });

  it('pause: nothing while recording, even with earphones', () => {
    const p = channelPolicy({
      ...base,
      isRecording: true,
      recordingCues: 'pause',
      earphonesConnected: true,
    });
    expect(p).toEqual({
      guidanceSpeech: 'off',
      systemSpeech: 'off',
      tones: false,
      earcons: false,
      haptics: false,
    });
  });

  it('always: sound on the loudspeaker while recording', () => {
    const p = channelPolicy({ ...base, isRecording: true, recordingCues: 'always' });
    expect(p.systemSpeech).toBe('tts');
    expect(p.tones).toBe(true);
  });

  it('tone only: no spoken guidance, but system messages are still spoken', () => {
    const p = channelPolicy({ ...base, cueType: 'tone' });
    expect(p.guidanceSpeech).toBe('off');
    expect(p.systemSpeech).toBe('tts');
    expect(p.tones).toBe(true);
  });

  it('voice only: no guidance tones, earcons stay', () => {
    const p = channelPolicy({ ...base, cueType: 'voice' });
    expect(p.tones).toBe(false);
    expect(p.earcons).toBe(true);
  });

  it('routes words through the screen reader when it is on', () => {
    const p = channelPolicy({ ...base, screenReaderOn: true });
    expect(p.guidanceSpeech).toBe('screenReader');
    expect(p.systemSpeech).toBe('screenReader');
  });
});

describe('hasEarphones', () => {
  const none = { currentOutputs: [], availableOutputs: [] };

  it.each(['Headphones', 'BluetoothA2DPOutput', 'BluetoothHFP', 'BluetoothLE', 'USBAudio'])(
    'iOS: %s counts as earphones',
    (category) => {
      expect(hasEarphones({ ...none, currentOutputs: [{ category }] }, 'ios')).toBe(true);
    },
  );

  it.each(['Speaker', 'Receiver', 'AirPlay', 'HDMI'])('iOS: %s does not', (category) => {
    expect(hasEarphones({ ...none, currentOutputs: [{ category }] }, 'ios')).toBe(false);
  });

  it('Android: uses the connected device list', () => {
    const speakerOnly = {
      ...none,
      availableOutputs: [{ category: 'Built-in Speaker' }, { category: 'Built-in Earpiece' }],
    };
    expect(hasEarphones(speakerOnly, 'android')).toBe(false);
    expect(
      hasEarphones(
        {
          ...none,
          availableOutputs: [...speakerOnly.availableOutputs, { category: 'Bluetooth A2DP' }],
        },
        'android',
      ),
    ).toBe(true);
    expect(
      hasEarphones({ ...none, availableOutputs: [{ category: 'Other (22)' }] }, 'android'),
    ).toBe(true);
  });
});
