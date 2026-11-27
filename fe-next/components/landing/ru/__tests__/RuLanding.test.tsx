import React from 'react';
import { render, screen } from '@testing-library/react';
import { RuLanding } from '../RuLanding';

vi.mock('next/link', () => ({
  default: ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));
vi.mock('next/image', () => ({ default: ({ alt }: { alt: string }) => <span role="img" aria-label={alt} /> }));

const art = { src: '/x.webp', alt: 'art', width: 1, height: 1 };

function renderPage(ctaLabel: string) {
  return render(
    <RuLanding
      locale="ru"
      slug="balda-onlayn"
      jsonLd={[{ id: 'ld-x', data: { '@type': 'FAQPage' } }]}
      hero={{ title: 'Балда онлайн', lead: 'Лид.', art, cta: { href: '/ru/multiplayer', label: ctaLabel } }}
      faqs={[{ q: 'Вопрос?', a: 'Ответ.' }]}
      final={{ title: 'Финал', body: 'Текст', cta: { href: '/ru/multiplayer', label: ctaLabel } }}
    >
      <p>Секция</p>
    </RuLanding>,
  );
}

describe('RuLanding', () => {
  it('keeps the JSON-LD, the FAQ and links to every other ru page but not itself', () => {
    const { container } = renderPage('Играть');
    expect(container.querySelector('script#ld-x')?.textContent).toContain('FAQPage');
    expect(screen.getByText('Вопрос?')).toBeInTheDocument();
    expect(container.querySelector('a[href="/ru/erudit-onlayn"]')).not.toBeNull();
    expect(container.querySelector('a[href="/ru/balda-onlayn"]')).toBeNull();
  });

  it('repeats a short CTA in the top bar and drops a long one so the bar never wraps', () => {
    expect(renderPage('Играть').getAllByRole('link', { name: 'Играть' })).toHaveLength(3);
    renderPage('Играть в ассоциации бесплатно');
    expect(screen.getAllByRole('link', { name: 'Играть в ассоциации бесплатно' })).toHaveLength(2);
  });
});
