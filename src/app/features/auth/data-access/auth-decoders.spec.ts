import { ApiContractError, decodeSignUpResult, decodeTokens, decodeUser } from './auth-decoders';

describe('Auth response contracts', () => {
  const user = { id: 1, email: 'demo@example.test', firstName: 'Demo', lastName: 'User' };

  it('projects valid responses without unknown fields', () => {
    expect(decodeUser({ ...user, password: 'private' })).toEqual(user);
    expect(decodeTokens({ accessToken: 'token', extra: true })).toEqual({ accessToken: 'token' });
    expect(decodeSignUpResult({ id: 2, status: 'created', extra: true })).toEqual({
      id: 2,
      status: 'created',
    });
  });

  it.each([
    null,
    [],
    {},
    { ...user, id: 0 },
    { ...user, id: 1.5 },
    { ...user, id: Number.MAX_SAFE_INTEGER + 1 },
    { ...user, email: ' ' },
    { ...user, firstName: false },
    { ...user, middleName: null },
    { ...user, phone: 42 },
  ])('rejects an invalid profile without leaking its contents', (value: unknown) => {
    expect(() => decodeUser(value)).toThrow(ApiContractError);
  });

  it('keeps optional strings and rejects malformed tokens/results', () => {
    expect(decodeUser({ ...user, middleName: '', phone: '123' })).toEqual({
      ...user,
      middleName: '',
      phone: '123',
    });
    for (const value of [
      null,
      [],
      {},
      { accessToken: '' },
      { accessToken: ' ' },
      { accessToken: 123 },
    ]) {
      expect(() => decodeTokens(value)).toThrow(ApiContractError);
    }
    expect(() => decodeSignUpResult({ id: 2, status: '' })).toThrow(ApiContractError);
    expect(() => decodeSignUpResult({ id: -1, status: 'created' })).toThrow(ApiContractError);
  });
});
