export interface CommonResponse<T> {
  start: number;
  limit: number;
  total: number;
  items: T;
}
