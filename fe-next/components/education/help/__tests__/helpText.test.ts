import { describe, it, expect } from 'vitest';
import { fillHelpVars, parseHelpText } from '../helpText';

describe('fillHelpVars', () => {
  it('replaces known facts and leaves unknown braces alone', () => {
    expect(fillHelpVars('Up to {classes} classes for {price}', { classes: 3, price: '$9' })).toBe(
      'Up to 3 classes for $9',
    );
    expect(fillHelpVars('keep {unknown}', { classes: 3 })).toBe('keep {unknown}');
  });
});

describe('parseHelpText', () => {
  it('splits bold, label chips and links out of plain text', () => {
    const segs = parseHelpText('Press [[teacher.playNow.goLive]] then **wait**. See [the join guide](help:how-students-join).');
    expect(segs).toEqual([
      { type: 'text', value: 'Press ' },
      { type: 'label', key: 'teacher.playNow.goLive' },
      { type: 'text', value: ' then ' },
      { type: 'bold', value: 'wait' },
      { type: 'text', value: '. See ' },
      { type: 'link', value: 'the join guide', target: 'help:how-students-join' },
      { type: 'text', value: '.' },
    ]);
  });

  it('returns a single text segment when there is no markup', () => {
    expect(parseHelpText('Just words.')).toEqual([{ type: 'text', value: 'Just words.' }]);
  });

  it('keeps RTL and CJK text intact around chips', () => {
    const segs = parseHelpText('לחצו על [[teacher.playNow.goLive]] ועכשיו');
    expect(segs.map((s) => s.type)).toEqual(['text', 'label', 'text']);
    expect(parseHelpText('**ライブ**開始')).toEqual([
      { type: 'bold', value: 'ライブ' },
      { type: 'text', value: '開始' },
    ]);
  });
});
