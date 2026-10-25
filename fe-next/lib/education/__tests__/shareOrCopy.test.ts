import { afterEach, describe, expect, it, vi } from 'vitest';
import { shareOrCopy } from '../shareOrCopy';

describe('shareOrCopy', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('Given emoji in the text, When sharing natively, Then the sheet receives it stripped', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { share });
    await expect(shareOrCopy({ title: 'Class 🎉', text: 'I scored 112 🔥', url: 'https://x.test' })).resolves.toBe('native');
    const sent = share.mock.calls[0][0];
    expect(sent.title).not.toMatch(/\p{Extended_Pictographic}/u);
    expect(sent.text).not.toMatch(/\p{Extended_Pictographic}/u);
    expect(sent.url).toBe('https://x.test');
  });

  it('Given no share sheet, When copying, Then the clipboard text carries no emoji', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    await expect(shareOrCopy({ text: 'Beat 112 🔥', url: 'https://x.test' })).resolves.toBe('copy');
    expect(writeText.mock.calls[0][0]).not.toMatch(/\p{Extended_Pictographic}/u);
    expect(writeText.mock.calls[0][0]).toContain('https://x.test');
  });

  it('Given the viewer cancels the sheet, Then it reports cancelled and does not copy', async () => {
    const writeText = vi.fn();
    vi.stubGlobal('navigator', { share: vi.fn().mockRejectedValue(Object.assign(new Error('x'), { name: 'AbortError' })), clipboard: { writeText } });
    await expect(shareOrCopy({ url: 'https://x.test' })).resolves.toBe('cancelled');
    expect(writeText).not.toHaveBeenCalled();
  });
});
