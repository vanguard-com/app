let owner: string | null = null;
const listeners = new Set<(claimed: boolean) => void>();
export const isSpeechClaimed = () => owner !== null;
export function claimSpeech(id: string): () => void {
  if (owner !== null) throw new Error('Speech recognition is already in use');
  owner = id;
  listeners.forEach((listener) => listener(true));
  return () => {
    if (owner !== id) return;
    owner = null;
    listeners.forEach((listener) => listener(false));
  };
}
export function onSpeechClaimChange(listener: (claimed: boolean) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
