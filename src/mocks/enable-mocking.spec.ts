import { enableMocking } from './enable-mocking';

describe('mock startup barrier', () => {
  const startMocking = vi.fn<() => Promise<void>>();
  const loadBrowser = vi.fn(() => Promise.resolve({ startMocking }));
  beforeEach(() => {
    startMocking.mockReset();
    loadBrowser.mockClear();
  });

  it('does not become ready until the worker is ready', async () => {
    let resolveReady = (): void => {
      throw new Error('Readiness not initialized');
    };
    const readiness = new Promise<void>((resolve) => {
      resolveReady = resolve;
    });
    startMocking.mockReturnValue(readiness);
    const bootstrapped = vi.fn();
    const startup = enableMocking({ mode: 'demo', apiBaseUrl: '/api' }, loadBrowser).then(
      bootstrapped,
    );
    await vi.waitFor(() => expect(startMocking).toHaveBeenCalledOnce());
    expect(bootstrapped).not.toHaveBeenCalled();
    resolveReady();
    await startup;
    expect(bootstrapped).toHaveBeenCalledOnce();
  });

  it('does not start mocks in remote mode', async () => {
    await enableMocking({ mode: 'remote', apiBaseUrl: '/api' }, loadBrowser);
    expect(loadBrowser).not.toHaveBeenCalled();
    expect(startMocking).not.toHaveBeenCalled();
  });

  it('rejects startup instead of silently using real network', async () => {
    startMocking.mockRejectedValue(new Error('Worker unavailable'));
    await expect(enableMocking({ mode: 'demo', apiBaseUrl: '/api' }, loadBrowser)).rejects.toThrow(
      'Worker unavailable',
    );
  });
});
