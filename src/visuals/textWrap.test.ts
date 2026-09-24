import { describe, it, expect } from 'vitest';
import { wrapChineseText } from './textWrap';
import { ROUTES } from '../state/GameState';

describe('wrapChineseText', () => {
  it('wraps all route descriptions without breaking Kinsoku rules', () => {
    for (const [id, route] of Object.entries(ROUTES)) {
      const wrapped = wrapChineseText(route.description, 13);
      const lines = wrapped.split('\n');
      expect(lines.length).toBeGreaterThanOrEqual(2);
      expect(lines.length).toBeLessThanOrEqual(3);

      for (const line of lines) {
        // No line should start with closing punctuation
        expect(line).not.toMatch(/^[，。、；：！？）』」》”’]/);
        // No line should end with opening punctuation
        expect(line).not.toMatch(/[（『「《“‘]$/);
      }
    }
  });

  it('handles short text and empty text cleanly', () => {
    expect(wrapChineseText('')).toBe('');
    expect(wrapChineseText('短句')).toBe('短句');
  });
});
