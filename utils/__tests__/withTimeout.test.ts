import { TimeoutError, withTimeout } from '../withTimeout';

describe('withTimeout', () => {
  it('resolves with the wrapped value when it settles before the deadline', async () => {
    await expect(withTimeout(Promise.resolve('done'), 1000)).resolves.toBe('done');
  });

  it('rejects with the original error when the wrapped promise rejects first', async () => {
    await expect(withTimeout(Promise.reject(new Error('boom')), 1000)).rejects.toThrow('boom');
  });

  it('rejects with TimeoutError when the wrapped promise never settles in time', async () => {
    jest.useFakeTimers();
    const neverSettles = new Promise(() => {});
    const result = withTimeout(neverSettles, 5000);
    const assertion = expect(result).rejects.toBeInstanceOf(TimeoutError);
    jest.advanceTimersByTime(5000);
    await assertion;
    jest.useRealTimers();
  });
});
