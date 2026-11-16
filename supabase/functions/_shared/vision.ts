// Provider-neutral interface for the vision model call. Provider + model are server settings
// (CLAUDE.md §3): VISION_PROVIDER=claude|gemini, then CLAUDE_MODEL / GEMINI_MODEL.

export type VisionUsage = { inputTokens: number; outputTokens: number; thinkingTokens: number };

export type VisionRequest = {
  system: string;
  userText: string;
  imagesBase64Jpeg: string[];
  jsonSchema: Record<string, unknown>;
  /** Set on the validation retry (§7.2 step 5): the previous output and what was wrong with it. */
  retry?: { previousText: string; errors: string };
};

export type VisionResult = { text: string; stopReason: string | null; usage: VisionUsage };

export interface VisionProvider {
  readonly name: string;
  readonly model: string;
  generate(req: VisionRequest): Promise<VisionResult>;
}

/** Thrown for provider failures; `status` is the HTTP status the function should answer with. */
export class VisionError extends Error {
  constructor(
    public readonly status: 502 | 504,
    message: string,
  ) {
    super(message);
    this.name = 'VisionError';
  }
}

export function retryInstruction(errors: string): string {
  return `Your previous output failed validation:\n${errors}\nReturn corrected JSON only, matching the schema.`;
}
