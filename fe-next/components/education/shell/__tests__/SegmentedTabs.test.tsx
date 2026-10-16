import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SegmentedTabs } from '../SegmentedTabs';

const ITEMS = [
  { key: 'students', label: 'Students', count: 6 },
  { key: 'words', label: 'Words', count: 12 },
  { key: 'grid', label: 'Grid' },
];

afterEach(cleanup);

describe('SegmentedTabs', () => {
  it('Given a value, Then exactly that tab is selected and owns its panel id', () => {
    render(<SegmentedTabs items={ITEMS} value="words" onChange={vi.fn()} ariaLabel="Report" idPrefix="rep" />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(3);
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[0]).toHaveAttribute('aria-selected', 'false');
    expect(tabs[1]).toHaveAttribute('id', 'rep-tab-words');
    expect(tabs[1]).toHaveAttribute('aria-controls', 'rep-panel-words');
    expect(tabs[1]).toHaveAttribute('tabindex', '0');
    expect(tabs[0]).toHaveAttribute('tabindex', '-1');
    expect(screen.getByRole('tablist')).toHaveAttribute('aria-label', 'Report');
  });

  it('Given a click, Then it reports the new key', () => {
    const onChange = vi.fn();
    render(<SegmentedTabs items={ITEMS} value="students" onChange={onChange} ariaLabel="Report" idPrefix="rep" />);
    fireEvent.click(screen.getByRole('tab', { name: /Grid/ }));
    expect(onChange).toHaveBeenCalledWith('grid');
  });

  it('Given arrow keys, Then it moves to the neighbour and wraps', () => {
    const onChange = vi.fn();
    render(<SegmentedTabs items={ITEMS} value="students" onChange={onChange} ariaLabel="Report" idPrefix="rep" />);
    fireEvent.keyDown(screen.getByRole('tablist'), { key: 'ArrowRight' });
    expect(onChange).toHaveBeenLastCalledWith('words');
    fireEvent.keyDown(screen.getByRole('tablist'), { key: 'ArrowLeft' });
    expect(onChange).toHaveBeenLastCalledWith('grid');
  });

  it('Then one indicator sits under the selected segment, moved by transform only', () => {
    render(<SegmentedTabs items={ITEMS} value="grid" onChange={vi.fn()} ariaLabel="Report" idPrefix="rep" />);
    const ind = screen.getByTestId('segmented-indicator');
    expect(ind.style.getPropertyValue('--seg-i')).toBe('2');
    expect(ind.className).toMatch(/transition-\[translate\]/);
    expect(ind.className).toContain('motion-reduce:transition-none');
    expect(ind.className).toMatch(/rtl:/);
  });

  it('Then labels are sentence case, not shouted', () => {
    render(<SegmentedTabs items={ITEMS} value="grid" onChange={vi.fn()} ariaLabel="Report" idPrefix="rep" />);
    for (const tab of screen.getAllByRole('tab')) expect(tab.className).not.toContain('uppercase');
  });
});
