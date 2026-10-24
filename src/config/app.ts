import Constants from 'expo-constants';

export const SUPPORT_EMAIL = 'projectvanguard.sg@gmail.com';

// Owner-approved public policy until the website is ready (24 October 2026).
export const PRIVACY_POLICY_URL = 'https://github.com/vanguard-com/app/blob/main/docs/PRIVACY.md';

export const APP_VERSION = Constants.expoConfig?.version ?? '0.0.0';

/** Taps on the version number needed to toggle the hidden debug overlay. */
export const DEBUG_UNLOCK_TAPS = 5;
