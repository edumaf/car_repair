// Converts a JSON Schema to the subset Claude structured outputs accept:
// every object gets additionalProperties:false; type arrays become anyOf;
// unsupported constraints (maxLength, maxItems, …) are dropped and re-checked by zod afterwards.
// Pure TS, no imports — unit-tested from Jest.

const UNSUPPORTED = new Set(['maxLength', 'minLength', 'maxItems', 'minItems', 'minimum', 'maximum', 'multipleOf', 'pattern']);

export function toClaudeSchema(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(toClaudeSchema);
  if (typeof schema !== 'object' || schema === null) return schema;
  const src = schema as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(src)) {
    if (UNSUPPORTED.has(key)) continue;
    if (key === 'properties' && typeof value === 'object' && value !== null) {
      out.properties = Object.fromEntries(Object.entries(value).map(([k, v]) => [k, toClaudeSchema(v)]));
    } else if (key === 'items') {
      out.items = toClaudeSchema(value);
    } else {
      out[key] = value;
    }
  }
  if (Array.isArray(out.type)) {
    const types = out.type as string[];
    delete out.type;
    const rest = { ...out };
    return { anyOf: types.map((t) => ({ ...rest, type: t })) };
  }
  if (out.type === 'object') out.additionalProperties = false;
  return out;
}
