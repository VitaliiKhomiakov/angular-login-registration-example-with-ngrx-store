export class ApiContractError extends Error {
  constructor() {
    super('Invalid API response');
    this.name = 'ApiContractError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function readObject(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) throw new ApiContractError();
  return value;
}

export function readString(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0) throw new ApiContractError();
  return value;
}

export function readOptionalString(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') throw new ApiContractError();
  return value;
}

export function readId(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0)
    throw new ApiContractError();
  return value;
}
