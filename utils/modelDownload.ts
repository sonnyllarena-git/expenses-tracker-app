import { File, Paths } from 'expo-file-system';

const MODEL_MARKER_FILENAME = 'ai-chat-model-ready.marker';

function markerFile(): File {
  return new File(Paths.document, MODEL_MARKER_FILENAME);
}

/**
 * Stands in for the real ~600MB llama.rn model download (deferred to a
 * follow-up sprint — see the Weeks 11-12 agent notes). No network call is
 * made here — offline only, per that sprint's constraints — but the
 * download/progress/cache lifecycle a real model file would need is real:
 * a marker file is written via expo-file-system on first success and
 * checked on every later launch, so this can be swapped for an actual fetch
 * later without touching the screen that drives it.
 */
export function isModelDownloaded(): boolean {
  return markerFile().exists;
}

export interface DownloadModelOptions {
  onProgress?: (fraction: number) => void;
  /** Total simulated download time in ms; split into 20 progress steps. */
  durationMs?: number;
}

const PROGRESS_STEPS = 20;

export async function downloadModel(options: DownloadModelOptions = {}): Promise<void> {
  const { onProgress, durationMs = 2000 } = options;

  for (let step = 1; step <= PROGRESS_STEPS; step++) {
    await new Promise((resolve) => setTimeout(resolve, durationMs / PROGRESS_STEPS));
    onProgress?.(step / PROGRESS_STEPS);
  }

  const file = markerFile();
  file.create({ overwrite: true });
  file.write('ready');
}

export function clearDownloadedModel(): void {
  const file = markerFile();
  if (file.exists) {
    file.delete();
  }
}
