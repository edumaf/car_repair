describe('api mode', () => {
  const load = (env: Record<string, string | undefined>, dev: boolean) => {
    jest.resetModules();
    const old = { ...process.env };
    Object.assign(process.env, env);
    (globalThis as any).__DEV__ = dev;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('./mode') as typeof import('./mode');
    process.env = old;
    return mod;
  };

  it('defaults to direct in dev builds without a backend', () => {
    expect(load({ EXPO_PUBLIC_API_MODE: '', EXPO_PUBLIC_SUPABASE_URL: '', EXPO_PUBLIC_SUPABASE_ANON_KEY: '' }, true).getApiMode()).toBe(
      'direct',
    );
  });

  it('never allows direct mode in release builds', () => {
    const m = load({ EXPO_PUBLIC_API_MODE: 'direct', EXPO_PUBLIC_SUPABASE_URL: '', EXPO_PUBLIC_SUPABASE_ANON_KEY: '' }, false);
    expect(m.getApiMode()).toBe('mock');
    expect(m.availableModes()).toEqual(['mock']);
    m.setApiMode('direct');
    expect(m.getApiMode()).toBe('mock');
  });

  it('uses live when the backend is configured, and notifies listeners on change', () => {
    const m = load(
      { EXPO_PUBLIC_API_MODE: '', EXPO_PUBLIC_SUPABASE_URL: 'https://x.supabase.co', EXPO_PUBLIC_SUPABASE_ANON_KEY: 'k' },
      true,
    );
    expect(m.getApiMode()).toBe('live');
    const seen: string[] = [];
    m.onApiModeChange((x) => seen.push(x));
    m.setApiMode('mock');
    expect(seen).toEqual(['mock']);
    expect(m.aiIsSample()).toBe(true);
  });

  afterAll(() => {
    (globalThis as any).__DEV__ = true;
  });
});
