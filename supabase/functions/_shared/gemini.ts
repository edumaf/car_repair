// Gemini vision provider (REST generateContent). Kept as a switchable alternative to Claude.
import { retryInstruction, VisionError, type VisionProvider, type VisionRequest, type VisionResult } from './vision.ts';

type Part = { text: string } | { inline_data: { mime_type: string; data: string } };
type Turn = { role: 'user' | 'model'; parts: Part[] };

export function createGeminiProvider(opts: { apiKey: string; model: string; thinkingLevel?: string; timeoutMs: number }): VisionProvider {
  return {
    name: 'gemini',
    model: opts.model,
    async generate(req: VisionRequest): Promise<VisionResult> {
      const turns: Turn[] = [
        {
          role: 'user',
          parts: [{ text: req.userText }, ...req.imagesBase64Jpeg.map((data) => ({ inline_data: { mime_type: 'image/jpeg', data } }))],
        },
      ];
      if (req.retry) {
        turns.push(
          { role: 'model', parts: [{ text: req.retry.previousText || '{}' }] },
          { role: 'user', parts: [{ text: retryInstruction(req.retry.errors) }] },
        );
      }
      const generationConfig: Record<string, unknown> = {
        responseMimeType: 'application/json',
        responseJsonSchema: req.jsonSchema,
        // Thinking tokens count toward this cap, so leave headroom above the ~700-token answer.
        maxOutputTokens: 2048,
      };
      if (opts.thinkingLevel) generationConfig.thinkingConfig = { thinkingLevel: opts.thinkingLevel };

      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs);
      let res: Response;
      try {
        res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(opts.model)}:generateContent`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-goog-api-key': opts.apiKey },
          body: JSON.stringify({ systemInstruction: { parts: [{ text: req.system }] }, contents: turns, generationConfig }),
          signal: ctrl.signal,
        });
      } catch (e) {
        throw ctrl.signal.aborted
          ? new VisionError(504, 'model timeout')
          : new VisionError(502, `fetch failed: ${String(e).slice(0, 200)}`);
      } finally {
        clearTimeout(timer);
      }
      if (!res.ok) throw new VisionError(502, `model HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);

      const json = (await res.json()) as {
        candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] }; finishReason?: string }[];
        usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number };
        promptFeedback?: { blockReason?: string };
      };
      const cand = json.candidates?.[0];
      const u = json.usageMetadata ?? {};
      return {
        text: (cand?.content?.parts ?? [])
          .filter((p) => !p.thought && typeof p.text === 'string')
          .map((p) => p.text)
          .join(''),
        stopReason: cand?.finishReason ?? json.promptFeedback?.blockReason ?? null,
        usage: {
          inputTokens: u.promptTokenCount ?? 0,
          outputTokens: u.candidatesTokenCount ?? 0,
          thinkingTokens: u.thoughtsTokenCount ?? 0,
        },
      };
    },
  };
}
