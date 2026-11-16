import { FIXTURE_REPORTS } from '@/core/api/mocks/mockClients';

import { createCar, deleteCar } from './carsRepository';
import { addComparable, deleteComparable, listComparables } from './comparablesRepository';
import { createTestDb } from './__testutils__/nodeSqlDb';

describe('comparablesRepository', () => {
  it('adds, lists in order, deletes, and cascades with the car', async () => {
    const db = createTestDb();
    const carId = await createCar(db, { report: FIXTURE_REPORTS.civic_2018 });
    const a = await addComparable(db, carId, { price: 15000, mileage: 60000, year: 2018, note: 'Marketplace' });
    await addComparable(db, carId, { price: 14000, mileage: null, year: null, note: null });
    expect((await listComparables(db, carId)).map((c) => c.price)).toEqual([15000, 14000]);
    await deleteComparable(db, a);
    expect(await listComparables(db, carId)).toHaveLength(1);
    await deleteCar(db, carId);
    expect(await listComparables(db, carId)).toHaveLength(0);
    db.close();
  });
});
