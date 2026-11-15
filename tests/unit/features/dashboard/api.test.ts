import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchRegistrations } from '../../../../src/features/dashboard/api';
import { apiClient } from '../../../../src/services/apiClient';

const days = [{ date: '2026-11-09', registrations: 2 }];

function get() {
  return vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { days } });
}

/** The `since` the last call sent. */
const sinceOf = (spy: ReturnType<typeof get>) =>
  (spy.mock.calls[0][1]?.params as { since: string }).since;

afterEach(() => {
  vi.restoreAllMocks();
});

describe('fetchRegistrations', () => {
  it('asks from the local midnight of six days ago and returns the days as they come', async () => {
    const spy = get();
    const midnight = new Date();
    midnight.setHours(0, 0, 0, 0);
    midnight.setDate(midnight.getDate() - 6);

    await expect(fetchRegistrations()).resolves.toEqual(days);

    expect(spy.mock.calls[0][0]).toBe('/admin/metrics/registrations');
    // The same instant, whatever zone the machine is in.
    expect(new Date(sinceOf(spy)).getTime()).toBe(midnight.getTime());
  });

  it.each([
    [180, '-03:00'],
    [0, '+00:00'],
    [-330, '+05:30'],
    [-540, '+09:00'],
  ])('writes the offset of the machine (%i minutes behind UTC) as %s', async (behind, offset) => {
    const spy = get();
    vi.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(behind);

    await fetchRegistrations();

    // The server needs the offset, not UTC: it is what tells it where each day starts.
    expect(sinceOf(spy).endsWith(`T00:00:00${offset}`)).toBe(true);
  });
});
