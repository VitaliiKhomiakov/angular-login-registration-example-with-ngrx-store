import { TestBed } from '@angular/core/testing';
import { SESSION_STORAGE, SessionTokenStorage } from './session-token-storage';

describe('session storage boundary', () => {
  afterEach(() => sessionStorage.clear());

  it('persists only its token and preserves unrelated session values', () => {
    TestBed.configureTestingModule({});
    sessionStorage.setItem('unrelated', 'keep');
    const storage = TestBed.inject(SessionTokenStorage);
    expect(storage.read()).toBeNull();
    storage.write('demo-token');
    expect(storage.read()).toBe('demo-token');
    expect(sessionStorage.length).toBe(2);
    storage.clear();
    expect(storage.read()).toBeNull();
    expect(sessionStorage.getItem('unrelated')).toBe('keep');
  });

  it('propagates unavailable storage so session orchestration can report it', () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: SESSION_STORAGE,
          useValue: {
            getItem: () => {
              throw new DOMException('Blocked', 'SecurityError');
            },
          },
        },
      ],
    });
    expect(() => TestBed.inject(SessionTokenStorage).read()).toThrow('Blocked');
  });
});
