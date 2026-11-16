// The Edge Functions use copies of some app modules (see scripts/sync-functions.ts). This fails if they drift.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { complaintGroupsJson, denoify, DEST, SHARED_FILES, SRC } from '../../scripts/sync-functions';

describe('supabase/functions/_shared/core is in sync with src/core', () => {
  it.each(SHARED_FILES)('%s', (f) => {
    expect(readFileSync(join(DEST, f), 'utf8')).toBe(denoify(readFileSync(join(SRC, f), 'utf8')));
  });

  it('complaintGroups.json', () => {
    expect(readFileSync(join(DEST, 'complaintGroups.json'), 'utf8')).toBe(complaintGroupsJson());
  });

  it('adds .ts only to extensionless relative imports', () => {
    expect(denoify("import { a } from './x';\nimport b from '../y.json';\nimport c from 'zod';")).toContain("from './x.ts'");
    expect(denoify("import b from '../y.json';")).toContain("'../y.json'");
    expect(denoify("import c from 'zod';")).toContain("'zod'");
  });
});
