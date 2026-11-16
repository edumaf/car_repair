// Claude vision provider (official Anthropic SDK).
import Anthropic from 'npm:@anthropic-ai/sdk@0.135.0';

import { toClaudeSchema } from './claudeSchema.ts';
import { retryInstruction, VisionError, type VisionProvider, type VisionRequest, type VisionResult } from './vision.ts';

type Effort = 'low' | 'medium' | 'high';

export function createClaudeProvider(opts: { apiKey: string; model: string; effort: Effort; timeoutMs: number }): VisionProvider {
  const client = new Anthropic({ apiKey: opts.apiKey, timeout: opts.timeoutMs, maxRetries: 1 });

  return {
    name: 'claude',
    model: opts.model,
    async generate(req: VisionRequest): Promise<VisionResult> {
      const messages: Anthropic.MessageParam[] = [
        {
          role: 'user',
          content: [
            ...req.imagesBase64Jpeg.map(
              (data): Anthropic.ImageBlockParam => ({
                type: 'image',
                source: { type: 'base64', media_type: 'image/jpeg', data },
              }),
            ),
            { type: 'text', text: req.userText },
          ],
        },
      ];
      if (req.retry) {
        messages.push(
          { role: 'assistant', content: req.retry.previousText || '{}' },
          { role: 'user', content: retryInstruction(req.retry.errors) },
        );
      }

      let res: Anthropic.Message;
      try {
        res = await client.messages.create({
          model: opts.model,
          // Pay only for what's generated; headroom covers adaptive thinking + the ~700-token answer.
          max_tokens: 4096,
          system: req.system,
          messages,
          output_config: {
            effort: opts.effort,
            format: { type: 'json_schema', schema: toClaudeSchema(req.jsonSchema) as Record<string, unknown> },
          },
        });
      } catch (e) {
        if (e instanceof Anthropic.APIConnectionTimeoutError) throw new VisionError(504, 'model timeout');
        if (e instanceof Anthropic.APIError) throw new VisionError(502, `model HTTP ${e.status}: ${e.message.slice(0, 200)}`);
        throw new VisionError(502, `model call failed: ${String(e).slice(0, 200)}`);
      }

      if (res.stop_reason === 'refusal') throw new VisionError(502, 'model refusal');
      const text = res.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
      return {
        text,
        stopReason: res.stop_reason,
        usage: {
          inputTokens: res.usage.input_tokens,
          outputTokens: res.usage.output_tokens,
          thinkingTokens: res.usage.output_tokens_details?.thinking_tokens ?? 0,
        },
      };
    },
  };
}
