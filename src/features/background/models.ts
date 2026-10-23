import * as FileSystem from 'expo-file-system/legacy';
import * as Network from 'expo-network';
import * as Device from 'expo-device';
import { AppState } from 'react-native';
import { cues } from '@/cues';
import { strings } from '@/i18n';
import { useSettings, type SceneModel } from '@/store/settingsStore';
import {
  cancelModelHash,
  hashModelFile,
  prepareModelDirectory,
} from '../../../modules/lumi-model-files';
import { useModels, modelDirectory, type ModelState } from './modelStore';
import { inspectSceneModel, cancelScene, waitForScene, forgetVerifiedModel } from './scene';
import { MODEL_SOURCES, progressMilestone, supportsModel, type ModelManifest } from './catalog';
export { useModels, modelDirectory } from './modelStore';

let mutationVersion = 0;
let operation: {
  id: string;
  kind: SceneModel;
  cancelled: boolean;
  hashing: boolean;
  task: FileSystem.DownloadResumable | null;
} | null = null;
export async function downloadAllowed() {
  const state = await Network.getNetworkStateAsync();
  return (
    state.isConnected === true &&
    state.isInternetReachable !== false &&
    (state.type === Network.NetworkStateType.WIFI ||
      useSettings.getState().allowMobileDataDownloads)
  );
}
export async function checkCapacity(manifest: ModelManifest) {
  const free = await FileSystem.getFreeDiskStorageAsync();
  if (!supportsModel(manifest.kind, Device.totalMemory, free, manifest.bytes))
    throw new Error('capacity');
}
export async function refreshModels() {
  const version = mutationVersion;
  const installed: ModelState['installed'] = {};
  for (const kind of ['standard', 'detailed'] as const) {
    if (operation?.kind === kind) {
      const previous = useModels.getState().installed[kind];
      if (previous) installed[kind] = previous;
      continue;
    }
    try {
      const raw = JSON.parse(
        await FileSystem.readAsStringAsync(`${modelDirectory(kind)}ready.json`),
      ) as ModelManifest;
      if (
        raw.kind !== kind ||
        raw.repo !== MODEL_SOURCES[kind].repo ||
        !/^[a-f0-9]{40}$/.test(raw.revision) ||
        !Array.isArray(raw.files) ||
        raw.files.length !== 2
      )
        continue;
      let valid = true;
      for (const f of raw.files) {
        if (
          !/^[\w.-]+\.gguf$/.test(f.name) ||
          !/^[a-f0-9]{64}$/.test(f.sha256) ||
          !Number.isSafeInteger(f.bytes) ||
          f.bytes <= 0
        ) {
          valid = false;
          break;
        }
        const info = await FileSystem.getInfoAsync(`${modelDirectory(kind)}${f.name}`);
        if (!info.exists || info.isDirectory || info.size !== f.bytes) {
          valid = false;
          break;
        }
      }
      if (valid) installed[kind] = raw;
    } catch {
      /* Missing/incomplete downloads are never installed models. */
    }
  }
  if (version !== mutationVersion) return;
  useModels.setState({ installed });
  if (!installed[useSettings.getState().sceneModel])
    useSettings.getState().update({ sceneModel: 'standard' });
}
export async function cancelModelDownload() {
  const op = operation;
  if (!op) return;
  op.cancelled = true;
  if (op.hashing) cancelModelHash(op.id);
  await op.task?.pauseAsync().catch(() => {});
}
export async function installModel(manifest: ModelManifest) {
  if (operation) throw new Error('busy');
  const op = {
    id: `download-${Date.now()}`,
    kind: manifest.kind,
    cancelled: false,
    hashing: false,
    task: null as FileSystem.DownloadResumable | null,
  };
  operation = op;
  ++mutationVersion;
  const check = () => {
    if (op.cancelled || AppState.currentState !== 'active') throw new Error('cancelled');
  };
  const dir = modelDirectory(manifest.kind);
  let complete = false;
  const subscription = AppState.addEventListener('change', (state) => {
    if (state !== 'active') void cancelModelDownload();
  });
  const network = Network.addNetworkStateListener((state) => {
    if (
      state.isConnected === false ||
      (!useSettings.getState().allowMobileDataDownloads &&
        state.type !== Network.NetworkStateType.WIFI)
    )
      void cancelModelDownload();
  });
  try {
    if (useModels.getState().installed[manifest.kind]) return;
    check();
    if (!(await downloadAllowed())) throw new Error('wifi');
    await checkCapacity(manifest);
    check();
    await FileSystem.deleteAsync(dir, { idempotent: true });
    await prepareModelDirectory(dir);
    check();
    useModels.setState({ phase: 'downloading', downloading: manifest.kind, progress: 0 });
    let finished = 0,
      spoken = 0;
    for (const f of manifest.files) {
      if (!(await downloadAllowed())) throw new Error('wifi');
      check();
      const destination = `${dir}${f.name}`;
      op.task = FileSystem.createDownloadResumable(
        f.url,
        `${destination}.part`,
        { sessionType: FileSystem.FileSystemSessionType.FOREGROUND },
        (p) => {
          if (op.cancelled) return;
          const progress = progressMilestone(finished + p.totalBytesWritten, manifest.bytes);
          useModels.setState({ progress });
          while (spoken + 20 <= progress) {
            spoken += 20;
            cues.say({
              id: `model.progress.${spoken}`,
              category: 'system',
              text: strings.background.downloading(spoken),
            });
          }
        },
      );
      const result = await op.task.downloadAsync();
      check();
      if (result?.status !== 200) throw new Error('download');
      const info = await FileSystem.getInfoAsync(`${destination}.part`);
      if (!info.exists || info.isDirectory || info.size !== f.bytes) throw new Error('size');
      useModels.setState({ phase: 'verifying' });
      op.hashing = true;
      let hash: string;
      try {
        hash = await hashModelFile(`${destination}.part`, op.id);
      } finally {
        op.hashing = false;
      }
      check();
      if (hash !== f.sha256) throw new Error('checksum');
      await FileSystem.moveAsync({ from: `${destination}.part`, to: destination });
      check();
      finished += f.bytes;
      op.task = null;
      useModels.setState({ phase: 'downloading' });
    }
    check();
    useModels.setState({ phase: 'verifying' });
    cancelScene();
    await waitForScene();
    check();
    const cancellation = setInterval(() => {
      if (op.cancelled) cancelScene();
    }, 100);
    try {
      await inspectSceneModel(manifest);
    } finally {
      clearInterval(cancellation);
    }
    check();
    await FileSystem.writeAsStringAsync(`${dir}ready.json`, JSON.stringify(manifest));
    check();
    complete = true;
    useModels.setState((s) => ({ installed: { ...s.installed, [manifest.kind]: manifest } }));
    cues.say({
      id: 'model.installed',
      category: 'system',
      text: strings.background.installed,
      force: true,
    });
  } finally {
    subscription.remove();
    network.remove();
    if (!complete && !useModels.getState().installed[manifest.kind])
      await FileSystem.deleteAsync(dir, { idempotent: true }).catch(() => {});
    if (operation === op) operation = null;
    ++mutationVersion;
    useModels.setState({ phase: 'idle', downloading: null, progress: 0 });
  }
}
export async function deleteModel(kind: SceneModel) {
  if (operation) throw new Error('busy');
  const op = { id: `delete-${Date.now()}`, kind, cancelled: false, hashing: false, task: null };
  operation = op;
  ++mutationVersion;
  const installed = { ...useModels.getState().installed };
  delete installed[kind];
  useModels.setState({ installed });
  if (useSettings.getState().sceneModel === kind)
    useSettings.getState().update({ sceneModel: 'standard' });
  try {
    cancelScene();
    await waitForScene();
    await FileSystem.deleteAsync(modelDirectory(kind), { idempotent: true });
    forgetVerifiedModel(kind);
  } finally {
    if (operation === op) operation = null;
    ++mutationVersion;
    await refreshModels();
  }
}
