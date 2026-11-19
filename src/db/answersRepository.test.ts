import { FIXTURE_REPORTS } from '@/core/api/mocks/mockClients';
import type { PhotoCheckResult } from '@/core/photoCheck/types';

import {
  addPhoto,
  addPhotoCheck,
  clearAnswer,
  confirmedAnswers,
  countPhotoChecks,
  getAnswers,
  listPhotoChecks,
  removePhoto,
  setAnswer,
  setDecision,
  setNote,
} from './answersRepository';
import { createCar, deleteCar, getCar } from './carsRepository';
import { createTestDb } from './__testutils__/nodeSqlDb';

const RESULT: PhotoCheckResult = {
  quality: { ok: true, retake_tip: null },
  findings: [{ code: 'tread_low', confidence: 'high', description: 'Front left tread is near the wear bars.' }],
  lights: [],
  transcriptions: {},
  notes_for_user: '',
};

describe('answersRepository', () => {
  let db: ReturnType<typeof createTestDb>;
  let carId: string;
  beforeEach(async () => {
    db = createTestDb();
    carId = await createCar(db, { report: FIXTURE_REPORTS.civic_2018 }, 1);
  });
  afterEach(() => db.close());

  it('saves answers, notes and photos; photos/notes alone leave the item unanswered', async () => {
    await addPhoto(db, carId, 'tire_tread', 'file:///p1.jpg', 10);
    await setNote(db, carId, 'tire_tread', '  front left low  ', 11);
    let a = await getAnswers(db, carId);
    expect(a.tire_tread).toMatchObject({ answer: null, note: 'front left low', photoUris: ['file:///p1.jpg'], fromAi: false });
    expect(confirmedAnswers(a)).toEqual({});

    await setAnswer(db, carId, 'tire_tread', 'problem', { fromAi: true }, 12);
    await setAnswer(db, carId, 'vin_match', 'ok', {}, 13);
    a = await getAnswers(db, carId);
    expect(a.tire_tread).toMatchObject({ answer: 'problem', fromAi: true, note: 'front left low', updatedAt: 12 });
    expect(confirmedAnswers(a)).toEqual({ tire_tread: 'problem', vin_match: 'ok' });
    expect((await getCar(db, carId))?.updatedAt).toBe(13);

    await clearAnswer(db, carId, 'tire_tread');
    expect((await getAnswers(db, carId)).tire_tread).toMatchObject({ answer: null, note: 'front left low' });
  });

  it('stores photo checks with decisions, and removes them with the photo', async () => {
    await addPhoto(db, carId, 'tire_tread', 'file:///p1.jpg');
    const id = await addPhotoCheck(db, carId, 'tire_tread', 'file:///p1.jpg', RESULT, true, 5);
    await setDecision(db, id, 'tread_low', 'confirmed');
    const [pc] = await listPhotoChecks(db, carId);
    expect(pc).toMatchObject({ id, itemId: 'tire_tread', sample: true, decisions: { tread_low: 'confirmed' } });
    expect(pc.result.findings[0].code).toBe('tread_low');
    expect(await countPhotoChecks(db, carId)).toBe(1);

    await removePhoto(db, carId, 'tire_tread', 'file:///p1.jpg');
    expect((await getAnswers(db, carId)).tire_tread.photoUris).toEqual([]);
    expect(await listPhotoChecks(db, carId)).toEqual([]);
  });

  it('deletes answers and photo checks with the car', async () => {
    await setAnswer(db, carId, 'vin_match', 'ok');
    await addPhotoCheck(db, carId, 'tire_tread', 'file:///p.jpg', RESULT, false);
    await deleteCar(db, carId);
    expect(await getAnswers(db, carId)).toEqual({});
    expect(await countPhotoChecks(db, carId)).toBe(0);
  });

  it('rejects invalid answers', async () => {
    await expect(setAnswer(db, carId, 'vin_match', 'maybe' as never)).rejects.toThrow();
  });
});
