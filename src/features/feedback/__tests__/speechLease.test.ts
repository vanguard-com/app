import { claimSpeech, isSpeechClaimed, onSpeechClaimChange } from '@/features/voice/speechLease';

describe('recorded audio cannot trigger camera/review commands', () => {
  it('exclusively leases the recognizer and notifies command listeners before analysis', () => {
    const listener = jest.fn(),
      stop = onSpeechClaimChange(listener);
    const release = claimSpeech('one');
    expect(isSpeechClaimed()).toBe(true);
    expect(listener).toHaveBeenCalledWith(true);
    expect(() => claimSpeech('two')).toThrow();
    release();
    expect(isSpeechClaimed()).toBe(false);
    expect(listener).toHaveBeenLastCalledWith(false);
    stop();
  });
});
