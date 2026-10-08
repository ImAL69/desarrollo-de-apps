import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ServerConfigService } from './server-config.service';

describe('ServerConfigService', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.clear();
    fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error('Servidor fuera de línea'))
      .mockResolvedValue({
        ok: true,
        json: async () => ({})
      } as Response);
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('retries server discovery after all health checks fail', async () => {
    const service = TestBed.inject(ServerConfigService);
    const fallbackCandidate = service.baseUrl();

    await expect(service.resolve()).resolves.toBe(fallbackCandidate);
    const failedProbeCount = fetchMock.mock.calls.length;
    expect(failedProbeCount).toBeGreaterThan(0);

    await expect(service.resolve()).resolves.toBe(fallbackCandidate);

    expect(fetchMock.mock.calls.length).toBeGreaterThan(failedProbeCount);
  });
});
