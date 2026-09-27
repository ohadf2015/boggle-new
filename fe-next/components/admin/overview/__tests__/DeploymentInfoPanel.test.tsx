import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { DeploymentInfoPanel } from '../DeploymentInfoPanel';

// t() returns the key so we can assert on stable strings.
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

const DEPLOY_INFO = {
  latest: {
    sha: 'fb8425080aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    shortSha: 'fb84250',
    subject: 'perf(blast): skip the always-on Pixi FX overlay on low-end devices',
    author: 'Ohad Fisher',
    branch: 'master',
    deploymentId: 'dep-1',
    githubUrl: 'https://github.com/ohadf/boggle-new/commit/fb8425080aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    deployedAt: '2026-06-12T11:00:00.000Z',
    source: 'railway',
  },
  recent: [
    {
      sha: 'fb8425080aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      shortSha: 'fb84250',
      subject: 'perf(blast): skip the always-on Pixi FX overlay on low-end devices',
      author: 'Ohad Fisher',
      date: '2026-06-12T09:00:00.000Z',
    },
    {
      sha: 'c4e447c2fbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      shortSha: 'c4e447c',
      subject: 'fix(blast): repair stranded blank tiles at gravity chokepoint',
      author: 'Ohad Fisher',
      date: '2026-06-12T08:00:00.000Z',
    },
  ],
  builtAt: '2026-06-12T10:00:00.000Z',
};

function mockFetchOnce(impl: () => Promise<Partial<Response>>) {
  global.fetch = vi.fn(impl as unknown as typeof fetch);
}

describe('DeploymentInfoPanel', () => {
  beforeEach(() => {
    mockFetchOnce(async () => ({ ok: true, json: async () => ({ success: true, data: DEPLOY_INFO }) }));
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the latest deploy subject and short sha after load', async () => {
    render(<DeploymentInfoPanel authToken="tok-123" />);
    await waitFor(() => {
      // Subject shows in both the live headline and the recent list.
      expect(
        screen.getAllByText('perf(blast): skip the always-on Pixi FX overlay on low-end devices')
          .length,
      ).toBeGreaterThan(0);
    });
    expect(screen.getAllByText(/fb84250/).length).toBeGreaterThan(0);
    expect(screen.getByText('master')).toBeTruthy();
  });

  it('lists recent commits', async () => {
    render(<DeploymentInfoPanel authToken="tok-123" />);
    await waitFor(() => {
      expect(
        screen.getByText('fix(blast): repair stranded blank tiles at gravity chokepoint'),
      ).toBeTruthy();
    });
  });

  it('sends the bearer token on fetch', async () => {
    render(<DeploymentInfoPanel authToken="tok-xyz" />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const [url, opts] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('/api/admin/deployment-info');
    expect(opts.headers.Authorization).toBe('Bearer tok-xyz');
  });

  it('shows an error message when the fetch fails', async () => {
    mockFetchOnce(async () => ({ ok: false, status: 500, json: async () => ({ error: 'boom' }) }));
    render(<DeploymentInfoPanel authToken="tok-123" />);
    await waitFor(() => {
      expect(screen.getByText('admin.deployment.error')).toBeTruthy();
    });
  });

  it('renders a skeleton before data resolves', () => {
    // fetch never resolves this render → skeleton stays visible
    mockFetchOnce(() => new Promise(() => {}) as unknown as Promise<Partial<Response>>);
    render(<DeploymentInfoPanel authToken="tok-123" />);
    expect(screen.getByTestId('deployment-info-skeleton')).toBeTruthy();
  });
});
