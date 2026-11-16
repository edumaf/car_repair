jest.mock('./supabase', () => ({ getAccessToken: jest.fn() }));

import { errorFor, localDay } from './callFunction';

describe('errorFor', () => {
  it.each([
    [402, null, 'quota_exceeded'],
    [429, null, 'daily_limit'],
    [404, { error: 'not_found' }, 'not_found'],
    [404, null, 'not_configured'],
    [504, null, 'timeout'],
    [500, { error: 'server_not_configured' }, 'not_configured'],
    [502, { error: 'model_error' }, 'server'],
    [400, { error: 'bad_request' }, 'invalid_response'],
  ] as const)('HTTP %i %j → %s', (status, body, code) => {
    const e = errorFor('photo-check', status, body);
    expect(e.code).toBe(code);
    expect(e.message.length).toBeGreaterThan(5);
  });
});

it('localDay uses the phone’s calendar day', () => {
  expect(localDay(new Date(2026, 11, 3, 23, 59))).toBe('2026-12-03');
});
