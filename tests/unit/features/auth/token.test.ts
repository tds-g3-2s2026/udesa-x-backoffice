import { describe, it, expect } from 'vitest';
import { decodeClaims, isExpired } from '../../../../src/features/auth/token';
import { fakeToken } from '../../helpers/session';

describe('decodeClaims', () => {
  it('reads sub, role and exp from the payload', () => {
    const claims = decodeClaims(fakeToken({ sub: 'abc', role: 'moderator', exp: 1_800_000_000 }));

    expect(claims).toEqual({ sub: 'abc', role: 'moderator', exp: 1_800_000_000 });
  });

  it('returns null for anything that is not a three-part token with those claims', () => {
    expect(decodeClaims('not-a-token')).toBeNull();
    expect(decodeClaims('a.b.c')).toBeNull();
    expect(decodeClaims(`x.${btoa(JSON.stringify({ sub: 'abc' }))}.y`)).toBeNull();
  });
});

describe('isExpired', () => {
  it('treats the exact expiry instant as expired', () => {
    const claims = { sub: 'abc', role: 'superadmin', exp: 1_000 };

    expect(isExpired(claims, 999_999)).toBe(false);
    expect(isExpired(claims, 1_000_000)).toBe(true);
  });
});
