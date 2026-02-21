/**
 * @jest-environment jsdom
 */
// Tests: ResultsPage root div must not use min-h-dvh (parent constrains height)
import fs from 'fs';
import path from 'path';

describe('ResultsPage layout', () => {
  let source: string;

  beforeAll(() => {
    source = fs.readFileSync(
      path.join(__dirname, '../../components/views/ResultsPage.tsx'),
      'utf-8'
    );
  });

  it('root div uses flex-1 min-h-0 instead of min-h-dvh', () => {
    expect(source).not.toContain('"min-h-dvh flex flex-col bg-neo-navy');
    expect(source).toContain('flex-1 flex flex-col min-h-0 bg-neo-navy');
  });
});
