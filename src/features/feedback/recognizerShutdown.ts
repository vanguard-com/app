import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';

/** Keep command recognition leased until file recognition has actually stopped natively. */
export async function stopFileRecognition(): Promise<boolean> {
  try {
    if ((await ExpoSpeechRecognitionModule.getStateAsync()) === 'inactive') return true;
  } catch {
    /* Still ask the native recognizer to stop and wait for its end event. */
  }
  return new Promise((resolve) => {
    let done = false;
    const finish = (stopped: boolean) => {
      if (done) return;
      done = true;
      clearTimeout(timeout);
      clearInterval(poll);
      subscription.remove();
      resolve(stopped);
    };
    const subscription = ExpoSpeechRecognitionModule.addListener('end', () => finish(true));
    const check = () => {
      ExpoSpeechRecognitionModule.getStateAsync()
        .then((state) => {
          if (state === 'inactive') finish(true);
        })
        .catch(() => {});
    };
    const poll = setInterval(check, 100);
    const timeout = setTimeout(() => finish(false), 5000);
    try {
      ExpoSpeechRecognitionModule.abort();
    } catch {}
    check();
  });
}

/** A stalled native recognizer must not hand late file transcripts to live command handlers. */
export function releaseWhenStopped(release: () => void): void {
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    subscription.remove();
    release();
  };
  const subscription = ExpoSpeechRecognitionModule.addListener('end', finish);
  ExpoSpeechRecognitionModule.getStateAsync()
    .then((state) => {
      if (state === 'inactive') finish();
    })
    .catch(() => {});
}
