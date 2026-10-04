export interface User {
  readonly id: number;
  readonly email: string;
  readonly firstName: string;
  readonly middleName?: string;
  readonly lastName: string;
  readonly phone?: string;
}

export interface LoginCredentials {
  readonly emailOrPhone: string;
  readonly password: string;
}

export interface SignUpRequest {
  readonly firstName: string;
  readonly middleName?: string;
  readonly lastName: string;
  readonly email: string;
  readonly phone?: string;
  readonly password: string;
  readonly confirmPassword: string;
}

export interface Tokens {
  readonly accessToken: string;
}
export interface SignUpResult {
  readonly id: number;
  readonly status: string;
}
