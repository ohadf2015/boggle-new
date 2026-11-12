import React from 'react';

export const tMock = (key: string, params?: Record<string, unknown>) =>
  params ? `${key}|${Object.values(params).join(',')}` : key;

export function motionMock() {
  const Div = React.forwardRef(
    ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>, ref: React.Ref<HTMLDivElement>) =>
      React.createElement('div', { ...props, ref }, children),
  );
  Div.displayName = 'MockMotionDiv';
  const Span = React.forwardRef(
    ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>, ref: React.Ref<HTMLSpanElement>) =>
      React.createElement('span', { ...props, ref }, children),
  );
  Span.displayName = 'MockMotionSpan';
  return {
    m: { div: Div, span: Span, button: 'button' },
    AnimatePresence: ({ children }: React.PropsWithChildren) => React.createElement(React.Fragment, null, children),
  };
}

export function linkMock() {
  const MockLink = ({ children, href, ...props }: React.PropsWithChildren<{ href: string }>) =>
    React.createElement('a', { href, ...props }, children);
  MockLink.displayName = 'MockLink';
  return { default: MockLink };
}
