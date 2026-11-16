// The subset of expo-sqlite's async API our repositories use. Keeping it an interface lets tests pass a fake.
export interface SqlDb {
  getAllAsync<T>(sql: string, ...params: (string | number | null)[]): Promise<T[]>;
  getFirstAsync<T>(sql: string, ...params: (string | number | null)[]): Promise<T | null>;
  runAsync(sql: string, ...params: (string | number | null)[]): Promise<unknown>;
  execAsync(sql: string): Promise<void>;
}
