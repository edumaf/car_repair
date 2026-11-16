// Finds every user-visible English string in the app, so `src/core/i18n/ro.json` can be checked for gaps.
//   npx tsx scripts/i18n-extract.ts            → prints missing Romanian keys as JSON (to paste and translate)
//   npx tsx scripts/i18n-extract.ts --stale    → also lists ro.json keys no longer used
// What counts as visible: JSX text; string literals used as JSX children (incl. `a ? 'x' : 'y'`); string props
// in TEXT_PROPS; `title:`-like object properties; arguments of t(), tk(), plural() and Alert.alert().
// Template literals with ${…} in those places can't be keys: they're reported as "dynamic" to rewrite with t().
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import ts from 'typescript';

export const ROOT = join(__dirname, '..');
const SCAN_DIRS = ['src'];

const TEXT_PROPS = new Set([
  'label',
  'title',
  'subtitle',
  'placeholder',
  'accessibilityLabel',
  'accessibilityHint',
  'hint',
  'message',
  'body',
  'caption',
  'headline',
  'emptyText',
  'description',
  'cta',
  'text',
  'prefixLabel',
  'position',
  'overline',
  'headlineLabel',
]);
const TEXT_KEYS = new Set(['title', 'headerTitle', 'tabBarAccessibilityLabel', 'label', 'hint', 'body', 'subtitle', 'description']);
// UPPER_CASE object constants whose string values are shown to the user.
const LABEL_TABLE = /(LABELS?|HEADLINES?|HELP|BY_LETTER|TEXTS?)$/;
// Any other multi-word literal is treated as visible text, except in these files (schemas, network, makes list).
const NOT_UI = /(Schema\.ts|nhtsa\.ts|popularMakes\.ts|scripts\/)/;
const SKIP_CALLS = /(Error|console\.|require|\.(get|run|exec|prepare)\w*Async|describe|^it$|^test$)/;
const looksLikeText = (s: string) =>
  /^[A-Za-z“‘"(¿]/.test(s) && /[A-Za-z’']{2,} [A-Za-z(“]{1,}/.test(s) && !/^(SELECT|INSERT|UPDATE|DELETE|CREATE|PRAGMA|ALTER)\b/.test(s);
const T_FUNCS = new Set(['tr', 'tk', 'plural']);

export type Found = { key: string; where: string };

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return name === 'node_modules' || name === 'mocks' ? [] : files(p);
    return /\.(tsx?|ts)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [p] : [];
  });
}

const hasLetters = (s: string) => /[A-Za-z]{2,}/.test(s);
/** JSX text the way React renders it: lines trimmed, inner newlines collapsed. */
function jsxText(raw: string): string {
  const lines = raw.split(/\r?\n/);
  if (lines.length === 1) return raw.trim();
  return lines
    .map((l) => l.trim())
    .filter(Boolean)
    .join(' ')
    .trim();
}

/** Is this expression in a place where its string value is shown? */
function shownPosition(node: ts.Node): boolean {
  let n: ts.Node = node;
  for (let depth = 0; depth < 6; depth++) {
    const p = n.parent;
    if (!p) return false;
    if (ts.isJsxExpression(p)) {
      const gp = p.parent;
      if (ts.isJsxElement(gp) || ts.isJsxFragment(gp)) return true;
      if (ts.isJsxAttribute(gp)) return TEXT_PROPS.has(gp.name.getText());
      return false;
    }
    if (ts.isConditionalExpression(p) && (p.whenTrue === n || p.whenFalse === n)) {
      n = p;
      continue;
    }
    if (
      ts.isBinaryExpression(p) &&
      p.right === n &&
      [ts.SyntaxKind.QuestionQuestionToken, ts.SyntaxKind.BarBarToken, ts.SyntaxKind.AmpersandAmpersandToken].includes(p.operatorToken.kind)
    ) {
      n = p;
      continue;
    }
    if (ts.isParenthesizedExpression(p)) {
      n = p;
      continue;
    }
    if (ts.isPropertyAssignment(p) && p.initializer === n) return TEXT_KEYS.has(p.name.getText());
    return false;
  }
  return false;
}

export function extract(): { found: Found[]; dynamic: Found[] } {
  const found: Found[] = [];
  const dynamic: Found[] = [];
  for (const dir of SCAN_DIRS) {
    for (const file of files(join(ROOT, dir))) {
      const src = ts.createSourceFile(
        file,
        readFileSync(file, 'utf8'),
        ts.ScriptTarget.Latest,
        true,
        file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
      );
      const where = (n: ts.Node) => `${relative(ROOT, file)}:${src.getLineAndCharacterOfPosition(n.getStart()).line + 1}`;
      const add = (key: string, n: ts.Node) => {
        if (hasLetters(key)) found.push({ key: key.trim(), where: where(n) });
      };
      const visit = (n: ts.Node) => {
        if (ts.isJsxText(n)) {
          const s = jsxText(n.getFullText());
          if (s) add(s, n);
        } else if (ts.isCallExpression(n)) {
          const callee = n.expression.getText(src);
          const isT = T_FUNCS.has(callee);
          const isAlert = callee === 'Alert.alert';
          if (isT || isAlert) {
            const args =
              isT && callee !== 'plural'
                ? n.arguments.slice(0, 1)
                : callee === 'plural'
                  ? n.arguments.slice(1, 3)
                  : n.arguments.slice(0, 2);
            for (const a of args) {
              if (ts.isStringLiteral(a) || ts.isNoSubstitutionTemplateLiteral(a)) add(a.text, a);
              else if (ts.isTemplateExpression(a) && isT) dynamic.push({ key: a.getText(src), where: where(a) });
            }
            // Alert button texts: [{ text: '…' }]
            if (isAlert && n.arguments[2] && ts.isArrayLiteralExpression(n.arguments[2])) {
              for (const el of n.arguments[2].elements) {
                if (!ts.isObjectLiteralExpression(el)) continue;
                for (const prop of el.properties) {
                  if (ts.isPropertyAssignment(prop) && prop.name.getText(src) === 'text' && ts.isStringLiteral(prop.initializer))
                    add(prop.initializer.text, prop.initializer);
                }
              }
            }
          }
        } else if ((ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) && shownPosition(n)) {
          add(n.text, n);
        } else if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && /^[A-Z][A-Z0-9_]+$/.test(n.name.text) && n.initializer) {
          // UPPER_CASE constants: a sentence (has a space), or a label table (name says so).
          const init = n.initializer;
          if ((ts.isStringLiteral(init) || ts.isNoSubstitutionTemplateLiteral(init)) && init.text.includes(' ')) add(init.text, init);
          if (ts.isObjectLiteralExpression(init) && LABEL_TABLE.test(n.name.text)) {
            for (const p of init.properties) {
              if (ts.isPropertyAssignment(p) && (ts.isStringLiteral(p.initializer) || ts.isNoSubstitutionTemplateLiteral(p.initializer)))
                add(p.initializer.text, p.initializer);
            }
          }
        } else if (
          (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) &&
          !NOT_UI.test(file) &&
          looksLikeText(n.text) &&
          !ts.isImportDeclaration(n.parent) &&
          !ts.isNewExpression(n.parent) &&
          !(ts.isCallExpression(n.parent) && SKIP_CALLS.test(n.parent.expression.getText(src)))
        ) {
          add(n.text, n);
        } else if (ts.isJsxAttribute(n) && TEXT_PROPS.has(n.name.getText(src)) && n.initializer && ts.isStringLiteral(n.initializer)) {
          add(n.initializer.text, n.initializer);
        } else if (ts.isTemplateExpression(n) && shownPosition(n)) {
          dynamic.push({ key: n.getText(src), where: where(n) });
        }
        ts.forEachChild(n, visit);
      };
      visit(src);
    }
  }
  return { found, dynamic };
}

export function missing(dict: Record<string, string>): Found[] {
  const seen = new Set<string>();
  return extract().found.filter((f) => {
    if (f.key in dict || seen.has(f.key)) return false;
    seen.add(f.key);
    return true;
  });
}

if (require.main === module) {
  const dict = JSON.parse(readFileSync(join(ROOT, 'src/core/i18n/ro.json'), 'utf8')) as Record<string, string>;
  const { found, dynamic } = extract();
  const miss = missing(dict);
  const out: Record<string, string> = {};
  for (const m of miss) out[m.key] = '';
  console.log(JSON.stringify(out, null, 2));
  console.error(`${found.length} strings found, ${miss.length} missing in ro.json, ${dynamic.length} dynamic`);
  if (process.argv.includes('--dynamic')) for (const d of dynamic) console.error(`dynamic ${d.where}: ${d.key}`);
  if (process.argv.includes('--where')) for (const m of miss) console.error(`${m.where}: ${m.key}`);
  if (process.argv.includes('--stale')) {
    const used = new Set(found.map((f) => f.key));
    for (const k of Object.keys(dict)) if (!used.has(k)) console.error(`stale: ${k}`);
  }
}
