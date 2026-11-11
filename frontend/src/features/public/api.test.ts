import { it, expect } from 'vitest';
import { categoriesFrom, money } from './api';
it('derives categories only from real catalog values and deduplicates without case differences', () =>
  expect(
    categoriesFrom([
      { category: ' Pho ' },
      { category: 'PHO' },
      { category: null },
      { category: '' },
      { category: '  ' },
    ]),
  ).toEqual(['Pho']));
it('retains Vietnamese category labels and handles empty catalog', () => {
  expect(categoriesFrom([{ category: 'Đồ chay' }, { category: 'Phở' }])).toEqual([
    'Đồ chay',
    'Phở',
  ]);
  expect(categoriesFrom([])).toEqual([]);
});
it('formats server prices as Vietnamese đồng', () => expect(money(45000)).toContain('45.000'));
it.each([
  [0.01, '0,01'],
  [25000.5, '25.000,5'],
  [25000.25, '25.000,25'],
  [9999999999.99, '9.999.999.999,99'],
])('preserves the server decimal amount %s in the displayed price', (value, expected) => {
  expect(money(value)).toContain(expected);
});
