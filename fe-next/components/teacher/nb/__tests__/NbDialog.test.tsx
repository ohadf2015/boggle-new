import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Dialog } from '@/components/ui/dialog';
import { NbDialogBody, NbDialogContent, NbDialogFooter, NbDialogHeader } from '../NbDialog';

function renderDialog(props: Partial<React.ComponentProps<typeof NbDialogContent>> = {}, header: Partial<React.ComponentProps<typeof NbDialogHeader>> = {}) {
  const onOpenChange = vi.fn();
  render(
    <Dialog open onOpenChange={onOpenChange}>
      <NbDialogContent data-testid="nb" {...props}>
        <NbDialogHeader title="Rename class" closeLabel="Close" {...header} />
        <NbDialogBody>body</NbDialogBody>
        <NbDialogFooter>
          <button type="button">Save</button>
        </NbDialogFooter>
      </NbDialogContent>
    </Dialog>,
  );
  return { onOpenChange, el: screen.getByTestId('nb') };
}

const tokens = (el: HTMLElement) => el.className.split(/\s+/);

describe('NbDialogContent', () => {
  it('Given the teacher NB chrome, Then the primitive light/halftone defaults do not survive', () => {
    const { el } = renderDialog();
    const cls = tokens(el);
    const leftovers = ['dark:border-slate-600', 'sm:border-4', 'border-neo-black', 'lg:max-w-xl', 'xl:max-w-2xl', 'bg-neo-cream', 'shadow-hard', 'max-h-[90vh]', 'sm:max-h-[85vh]'];
    expect(leftovers.filter((c) => cls.includes(c))).toEqual([]);
    expect(cls, 'radius beats the unmerged primitive radius').toEqual(expect.arrayContaining(['rounded-neo-xl!', 'sm:rounded-neo-xl!']));
    expect(el.style.backgroundImage).toBe('none');
  });

  it('Given the dark app theme, Then navy fill, cream 3px edge and hard shadow hold under dark: too', () => {
    const cls = tokens(renderDialog().el);
    for (const want of ['bg-neo-navy', 'dark:bg-neo-navy', 'border-[3px]', 'sm:border-[3px]', 'border-neo-cream/50', 'dark:border-neo-cream/50', 'shadow-hard-xl', 'text-neo-cream', 'dark:text-neo-cream']) {
      expect(cls, want).toContain(want);
    }
  });

  it('Given a phone, Then a short dialog docks as a bottom sheet with no opacity tween', () => {
    const cls = tokens(renderDialog().el);
    for (const want of ['max-sm:mt-auto', 'max-sm:w-full', 'max-sm:max-w-none', 'max-sm:rounded-b-none!', 'max-sm:data-[state=open]:animate-none']) {
      expect(cls, want).toContain(want);
    }
  });

  it('Given phone="full", Then the dialog fills the phone screen', () => {
    const cls = tokens(renderDialog({ phone: 'full' }).el);
    for (const want of ['max-sm:h-dvh', 'max-sm:max-h-dvh', 'max-sm:rounded-none!', 'max-sm:w-full']) {
      expect(cls, want).toContain(want);
    }
    expect(cls).not.toContain('max-sm:mt-auto');
  });

  it('Given a size, Then the desktop width is set on every breakpoint the primitive sets', () => {
    const cls = tokens(renderDialog({ size: 'sm' }).el);
    expect(cls).toEqual(expect.arrayContaining(['sm:max-w-md', 'lg:max-w-md', 'xl:max-w-md']));
    expect(cls).not.toContain('xl:max-w-2xl');
  });

  it('Then the primitive red close button is gone and the header carries one chunky close', async () => {
    const { onOpenChange } = renderDialog();
    const closes = screen.getAllByRole('button', { name: 'Close' });
    expect(closes).toHaveLength(1);
    expect(closes[0].className).toContain('size-11');
    expect(closes[0].className).not.toContain('bg-neo-red');
    closes[0].click();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

describe('NbDialogHeader', () => {
  it('Given a color, Then the strip is that flat block with a 3px rule and a big display title', () => {
    renderDialog({}, { color: 'yellow', description: 'One line' });
    const title = screen.getByRole('heading', { name: 'Rename class' });
    expect(title.className).toContain('font-neo-display');
    expect(title.className).toContain('normal-case');
    const strip = title.closest('[data-nb-dialog-header]') as HTMLElement;
    expect(strip.className).toContain('bg-neo-yellow');
    expect(strip.className).toContain('border-b-[3px]');
    expect(strip.className).toContain('border-neo-black');
    expect(screen.getByText('One line')).toBeInTheDocument();
  });

  it('Given no color, Then the strip is navy with a cream rule (never black on navy)', () => {
    renderDialog();
    const strip = screen.getByRole('heading', { name: 'Rename class' }).closest('[data-nb-dialog-header]') as HTMLElement;
    expect(strip.className).toContain('bg-neo-navy-light');
    expect(strip.className).toContain('border-neo-cream/50');
    expect(strip.className).not.toContain('border-neo-black');
  });

  it('Given no closeLabel, Then no close button is drawn', () => {
    renderDialog({}, { closeLabel: undefined });
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
  });
});
