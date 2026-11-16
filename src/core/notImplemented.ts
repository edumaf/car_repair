/** Marks a pure-TS module that is planned for a later milestone (see CLAUDE.md §17). */
export function notImplemented(what: string, milestone: string): never {
  throw new Error(`${what} is not implemented yet (planned for ${milestone}).`);
}
