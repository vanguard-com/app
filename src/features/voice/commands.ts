// Voice command parsing. Pure logic, no React or native imports.
//
// Commands are multi word phrases on purpose: single words like "save" or "retake" are also button
// labels, and VoiceOver / TalkBack reading a label out loud must never trigger a command.

export type VoiceCommand =
  | { type: 'startRecording' }
  | { type: 'stopRecording' }
  | { type: 'switchCamera' }
  | { type: 'help' }
  | { type: 'saveVideo' }
  | { type: 'retakeVideo' }
  | { type: 'postVideo' }
  | { type: 'checkLighting' }
  | { type: 'findLight' }
  | { type: 'whatIsBehindMe' }
  | { type: 'describeBackground' }
  | { type: 'feedback'; on: boolean }
  | { type: 'focusOn'; subject: string }
  | { type: 'installDetailedMode' }
  | { type: 'useSceneModel'; model: 'standard' | 'detailed' };

export type VoiceCommandType = VoiceCommand['type'];

interface Rule {
  pattern: RegExp;
  build: (match: RegExpMatchArray) => VoiceCommand;
}

// Order matters: more specific phrases first.
const RULES: Rule[] = [
  { pattern: /\bstop (the )?(recording|video)\b/, build: () => ({ type: 'stopRecording' }) },
  {
    pattern: /\b(start|begin) (a )?(recording|video)\b/,
    build: () => ({ type: 'startRecording' }),
  },
  {
    pattern: /\b(switch|change|turn) (the )?camera\b|\bother camera\b/,
    build: () => ({ type: 'switchCamera' }),
  },
  { pattern: /\bsave (the |my |this )?video\b/, build: () => ({ type: 'saveVideo' }) },
  {
    pattern: /\bretake (the |my |this )?video\b|\brecord (it )?again\b/,
    build: () => ({ type: 'retakeVideo' }),
  },
  {
    pattern: /\b(post|share) (the |my |this )?video\b/,
    build: () => ({ type: 'postVideo' }),
  },
  { pattern: /\bcheck (the )?light(ing)?\b/, build: () => ({ type: 'checkLighting' }) },
  { pattern: /\bfind (the )?light\b/, build: () => ({ type: 'findLight' }) },
  { pattern: /\bwhat('s| is) behind me\b/, build: () => ({ type: 'whatIsBehindMe' }) },
  {
    pattern: /\bdescribe (my |the )?background\b/,
    build: () => ({ type: 'describeBackground' }),
  },
  {
    pattern: /\bfeedback (on|off)\b|\bturn (on|off) feedback\b/,
    build: (m) => ({ type: 'feedback', on: (m[1] ?? m[2]) === 'on' }),
  },
  { pattern: /\binstall detailed mode\b/, build: () => ({ type: 'installDetailedMode' }) },
  {
    pattern: /\buse (standard|detailed) mode\b/,
    build: (m) => ({ type: 'useSceneModel', model: m[1] as 'standard' | 'detailed' }),
  },
  {
    pattern: /\bfocus on (my |the |a |an )?([a-z][a-z ]*[a-z])\b/,
    build: (m) => ({ type: 'focusOn', subject: (m[2] ?? '').trim() }),
  },
  { pattern: /^help$|\bwhat can i say\b|\blumi help\b/, build: () => ({ type: 'help' }) },
];

export function normalizeTranscript(text: string): string {
  return text
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z' ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Find the command in what the user said, or null. */
export function parseCommand(transcript: string): VoiceCommand | null {
  const text = normalizeTranscript(transcript);
  if (!text) return null;
  for (const rule of RULES) {
    const match = text.match(rule.pattern);
    if (match) return rule.build(match);
  }
  return null;
}

/** Phrases sent to the recognizer as hints, which improves accuracy for these words. */
export const COMMAND_HINTS = [
  'start recording',
  'stop recording',
  'switch camera',
  'save video',
  'retake video',
  'post video',
  'check lighting',
  'find light',
  'what is behind me',
  'describe my background',
  'feedback on',
  'feedback off',
  'Lumi help',
  'focus on my face',
];
