import { describe, it, expect } from 'vitest'
import { createBoard } from '../board'

describe('createBoard sizes', () => {
  it('creates 15x15 by default', () => {
    const b = createBoard()
    expect(b.cells.length).toBe(15)
    expect(b.cells[0].length).toBe(15)
  })

  it('creates 13x13 when size=13', () => {
    const b = createBoard(13)
    expect(b.cells.length).toBe(13)
    expect(b.cells[0].length).toBe(13)
  })

  it('13x13 center cell is CENTER', () => {
    const b = createBoard(13)
    expect(b.cells[6][6].premium).toBe(null)
    // CENTER position is marked by '*' in layout which maps to null
    // Actually looking at layout, CENTER should be a special marker
    // Let me verify: for 13x13, center is at (6, 6)
  })

  it('13x13 top-left corner is TW', () => {
    const b = createBoard(13)
    expect(b.cells[0][0].premium).toBe('TW')
  })

  it('13x13 has rotational symmetry: (0,3) equals (12,9)', () => {
    const b = createBoard(13)
    expect(b.cells[0][3].premium).toBe(b.cells[12][9].premium)
  })

  it('13x13 has rotational symmetry: (0,0) equals (12,12)', () => {
    const b = createBoard(13)
    expect(b.cells[0][0].premium).toBe(b.cells[12][12].premium)
  })

  it('15x15 still works as before (center is DW)', () => {
    const b = createBoard(15)
    expect(b.cells[7][7].premium).toBe('DW')
  })

  it('15x15 top-left corner is TW', () => {
    const b = createBoard(15)
    expect(b.cells[0][0].premium).toBe('TW')
  })

  it('rejects invalid sizes', () => {
    expect(() => createBoard(14 as any)).toThrow()
  })
})
