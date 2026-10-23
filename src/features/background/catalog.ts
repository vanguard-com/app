import reviewedModels from '../../../assets/models/scene-models.json';
import type { SceneModel } from '@/store/settingsStore';

export interface ModelFile {
  name: string;
  bytes: number;
  sha256: string;
  url: string;
}
export interface ModelManifest {
  kind: SceneModel;
  repo: string;
  revision: string;
  files: [ModelFile, ModelFile];
  bytes: number;
}
export const MODEL_SOURCES = {
  standard: {
    repo: 'ggml-org/SmolVLM2-500M-Video-Instruct-GGUF',
    model: /SmolVLM2-500M-Video-Instruct-Q8_0\.gguf$/i,
    projector: /^mmproj.*(?:Q8_0|f16)\.gguf$/i,
  },
  detailed: {
    repo: 'shreyashmakadia/gemma-3n-E2B-it-vision-GGUF',
    model: /^gemma-3n-E2B-it-Q4_K_M\.gguf$/i,
    projector: /^mmproj.*(?:BF16|F16|Q8_0)\.gguf$/i,
  },
} as const;

/** Only accept complete, hashed GGUF pairs from the configured publisher, pinned to one commit. */
export function parseManifest(kind: SceneModel, input: unknown): ModelManifest {
  const data = input as {
    sha?: unknown;
    siblings?: { rfilename?: unknown; lfs?: { sha256?: unknown; size?: unknown } }[];
  };
  const source = MODEL_SOURCES[kind];
  if (
    typeof data?.sha !== 'string' ||
    !/^[a-f0-9]{40}$/.test(data.sha) ||
    !Array.isArray(data.siblings)
  )
    throw new Error('Invalid model revision');
  const files = [source.model, source.projector].map((pattern) => {
    const candidates = data.siblings!.filter(
      (f) =>
        typeof f.rfilename === 'string' &&
        /^[\w.-]+\.gguf$/.test(f.rfilename) &&
        pattern.test(f.rfilename),
    );
    // Prefer Q8_0 projector where present; deterministic selection stays within the same repository.
    candidates.sort(
      (a, b) =>
        Number(String(b.rfilename).includes('Q8_0')) - Number(String(a.rfilename).includes('Q8_0')),
    );
    const f = candidates[0],
      size = f?.lfs?.size,
      hash = f?.lfs?.sha256;
    if (
      !f ||
      typeof f.rfilename !== 'string' ||
      typeof size !== 'number' ||
      !Number.isSafeInteger(size) ||
      size <= 0 ||
      size > 8e9 ||
      typeof hash !== 'string' ||
      !/^[a-f0-9]{64}$/.test(hash)
    )
      throw new Error('Verified vision model pair unavailable');
    return {
      name: f.rfilename,
      bytes: size,
      sha256: hash,
      url: `https://huggingface.co/${source.repo}/resolve/${data.sha}/${encodeURIComponent(f.rfilename)}`,
    };
  }) as [ModelFile, ModelFile];
  return {
    kind,
    repo: source.repo,
    revision: data.sha,
    files,
    bytes: files.reduce((n, f) => n + f.bytes, 0),
  };
}
export async function resolveManifest(
  kind: SceneModel,
  signal?: AbortSignal,
): Promise<ModelManifest> {
  if (signal?.aborted) throw new Error('cancelled');
  const reviewed = reviewedModels[kind];
  if (reviewed.repo !== MODEL_SOURCES[kind].repo) throw new Error('Unreviewed publisher');
  return parseManifest(kind, {
    sha: reviewed.revision,
    siblings: reviewed.files.map((file) => ({
      rfilename: file.name,
      lfs: { size: file.bytes, sha256: file.sha256 },
    })),
  });
}
export function supportsModel(
  kind: SceneModel,
  ram: number | null,
  free: number,
  bytes: number,
): boolean {
  return (
    ram !== null && ram >= (kind === 'detailed' ? 8 : 3) * 1024 ** 3 && free >= bytes + 1024 ** 3
  );
}
export function progressMilestone(downloaded: number, total: number): number {
  return total > 0 ? Math.min(100, Math.floor((Math.max(0, downloaded) / total) * 5) * 20) : 0;
}
export function shortDescription(text: string): string {
  return (
    text
      .replace(/<\|[^>]+\|>/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .match(/[^.!?]+[.!?]?(?:\s|$)/g)
      ?.slice(0, 3)
      .join('')
      .trim()
      .slice(0, 800) ?? ''
  );
}
