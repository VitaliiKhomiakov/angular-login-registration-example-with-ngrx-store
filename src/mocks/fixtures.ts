import type { SignUpRequest, User } from '../app/features/auth/data-access/auth-contracts';

interface DemoAccount {
  readonly user: User;
  readonly password: string;
  readonly token: string;
}

/** Page-local data only. These public demo credentials are not real authentication. */
export class DemoAccounts {
  private readonly accounts: DemoAccount[] = [
    {
      user: { id: 1, email: 'demo@example.test', firstName: 'Demo', lastName: 'User' },
      password: 'demo-password',
      token: 'demo-token',
    },
  ];

  public login(emailOrPhone: string, password: string): string | undefined {
    return this.accounts.find(
      ({ user, password: expected }) =>
        (user.email === emailOrPhone || user.phone === emailOrPhone) && expected === password,
    )?.token;
  }

  public profile(token: string): User | undefined {
    return this.accounts.find((account) => account.token === token)?.user;
  }

  public register(request: SignUpRequest): number | undefined {
    if (this.accounts.some(({ user }) => user.email === request.email)) return undefined;
    const id = this.accounts.length + 1;
    const user: User = {
      id,
      email: request.email,
      firstName: request.firstName,
      lastName: request.lastName,
      ...(request.middleName === undefined ? {} : { middleName: request.middleName }),
      ...(request.phone === undefined ? {} : { phone: request.phone }),
    };
    this.accounts.push({ user, password: request.password, token: `demo-token-${id}` });
    return id;
  }
}
