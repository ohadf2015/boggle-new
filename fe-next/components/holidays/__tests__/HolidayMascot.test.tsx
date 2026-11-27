import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import HolidayMascot from '../HolidayMascot';

describe('HolidayMascot', () => {
  it('server-renders the default and both holiday mascots so the html class picks one before paint', () => {
    const { container } = render(
      <HolidayMascot defaultSrc="/mascot/hello-nobg.webp" defaultWidth={320} defaultHeight={320} sizes="84px" className="w-[76px]" />,
    );
    const imgs = [...container.querySelectorAll('img')];
    expect(imgs.map((i) => i.className.split(' ')[0])).toEqual([
      'holiday-mascot-default',
      'holiday-mascot-hanukkah',
      'holiday-mascot-christmas',
    ]);
    expect(imgs.every((i) => i.className.includes('w-[76px]'))).toBe(true);
    expect(decodeURIComponent(imgs[1].getAttribute('src')!)).toContain('/holidays/m-hanukkah.webp');
    expect(decodeURIComponent(imgs[2].getAttribute('src')!)).toContain('/holidays/m-christmas.webp');
  });

  it('loads the default eagerly and the hidden holiday art lazily, so off-season costs no bytes', () => {
    const { container } = render(
      <HolidayMascot defaultSrc="/mascot/hello-nobg.webp" defaultWidth={320} defaultHeight={320} sizes="84px" />,
    );
    const [def, h, c] = [...container.querySelectorAll('img')];
    expect(def.getAttribute('loading')).toBe('eager');
    expect(h.getAttribute('loading')).toBe('lazy');
    expect(c.getAttribute('loading')).toBe('lazy');
    expect([def, h, c].every((i) => i.getAttribute('alt') === '')).toBe(true);
  });
});
