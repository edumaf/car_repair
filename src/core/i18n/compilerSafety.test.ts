// The React Compiler (app.json experiments.reactCompiler) caches values it thinks never change, such as tr('Back').
// tr() reads the current language, so in a component that never remounts the cached text stays in the language the
// app started in. Screens remount on a language switch (the Stack is keyed by language); the root layout above it
// does not, and its cached header titles stayed Romanian after switching to English (phone test 2026-11-18).
import { transformSync } from '@babel/core';
import { readFileSync } from 'fs';
import path from 'path';

function compile(file: string): string {
  const abs = path.join(__dirname, '../../..', file);
  const out = transformSync(readFileSync(abs, 'utf8'), {
    filename: abs,
    babelrc: false,
    configFile: false,
    presets: [['@babel/preset-typescript', { isTSX: true, allExtensions: true }]],
    plugins: ['@babel/plugin-syntax-jsx', 'babel-plugin-react-compiler'],
  });
  return out?.code ?? '';
}

describe('React Compiler and translations', () => {
  it('does not cache translated header titles in the root layout', () => {
    const code = compile('src/app/_layout.tsx');
    expect(code).toMatch(/tr\(['"]Inspection['"]\)/);
    // Any compiler cache in the root layout would freeze its tr() calls at the first language.
    expect(code).not.toContain('react.memo_cache_sentinel');
  });
});
