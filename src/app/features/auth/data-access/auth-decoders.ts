import type { SignUpResult, Tokens, User } from './auth-contracts';
import { readId, readObject, readOptionalString, readString } from './auth-validation';
export { ApiContractError } from './auth-validation';

export function decodeUser(value: unknown): User {
  const body = readObject(value);
  const middleName = readOptionalString(body['middleName']);
  const phone = readOptionalString(body['phone']);
  return {
    id: readId(body['id']),
    email: readString(body['email']),
    firstName: readString(body['firstName']),
    lastName: readString(body['lastName']),
    ...(middleName === undefined ? {} : { middleName }),
    ...(phone === undefined ? {} : { phone }),
  };
}

export function decodeTokens(value: unknown): Tokens {
  return { accessToken: readString(readObject(value)['accessToken']) };
}

export function decodeSignUpResult(value: unknown): SignUpResult {
  const body = readObject(value);
  return { id: readId(body['id']), status: readString(body['status']) };
}
