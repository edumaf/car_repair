// Supabase auth storage backed by expo-secure-store (CLAUDE.md §10).
// SecureStore values can be size-limited on some devices, so long values are split into chunks.
import * as SecureStore from 'expo-secure-store';

const CHUNK = 1800;
const safeKey = (key: string) => key.replace(/[^A-Za-z0-9._-]/g, '_');

export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    const k = safeKey(key);
    const count = await SecureStore.getItemAsync(`${k}.n`);
    if (count === null) return SecureStore.getItemAsync(k);
    const parts = await Promise.all(Array.from({ length: Number(count) }, (_, i) => SecureStore.getItemAsync(`${k}.${i}`)));
    return parts.some((p) => p === null) ? null : parts.join('');
  },
  async setItem(key: string, value: string): Promise<void> {
    const k = safeKey(key);
    await this.removeItem(key);
    if (value.length <= CHUNK) return SecureStore.setItemAsync(k, value);
    const parts = value.match(new RegExp(`[\\s\\S]{1,${CHUNK}}`, 'g')) ?? [];
    await Promise.all(parts.map((p, i) => SecureStore.setItemAsync(`${k}.${i}`, p)));
    await SecureStore.setItemAsync(`${k}.n`, String(parts.length));
  },
  async removeItem(key: string): Promise<void> {
    const k = safeKey(key);
    const count = await SecureStore.getItemAsync(`${k}.n`);
    if (count !== null) {
      await Promise.all(Array.from({ length: Number(count) }, (_, i) => SecureStore.deleteItemAsync(`${k}.${i}`)));
      await SecureStore.deleteItemAsync(`${k}.n`);
    }
    await SecureStore.deleteItemAsync(k);
  },
};
