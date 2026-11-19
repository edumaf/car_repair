// POST /functions/v1/vehicle  (CLAUDE.md §7.1). See handler.ts for the request shapes.
import { serviceClient } from '../_shared/quotaRuntime.ts';
import { authenticate } from '../_shared/runtime.ts';
import { handleVehicle, noCache, type VehicleCache } from './handler.ts';

const db = serviceClient();
const cache: VehicleCache = db
  ? {
      async get(key) {
        const { data, error } = await db.from('vehicle_cache').select('payload, fetched_at').eq('key', key).maybeSingle();
        if (error) throw new Error(error.message);
        return data ? { payload: data.payload, fetchedAt: Date.parse(data.fetched_at) } : null;
      },
      async put(key, payload) {
        const { error } = await db.from('vehicle_cache').upsert({ key, payload, fetched_at: new Date().toISOString() });
        if (error) throw new Error(error.message);
      },
    }
  : noCache;

Deno.serve((req) => handleVehicle(req, { authenticate, cache }));
