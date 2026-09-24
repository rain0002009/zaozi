/**
 * Wraps Chinese text by character count with punctuation Kinsoku Shori (避头尾规则).
 * - Avoids starting a line with closing punctuation: ，。、；：！？）』」》”’
 * - Avoids ending a line with opening punctuation: （『「《“‘
 */
export function wrapChineseText(text: string, maxCharsPerLine = 13): string {
  if (!text) return '';

  const noStartPunct = new Set([
    '，', '。', '、', '；', '：', '！', '？', '）', '』', '」', '》', '”', '’'
  ]);
  const noEndPunct = new Set(['（', '『', '「', '《', '“', '‘']);

  const paragraphs = text.split('\n');
  const wrappedParagraphs = paragraphs.map((para) => {
    const lines: string[] = [];
    let remaining = para.trim();

    while (remaining.length > 0) {
      if (remaining.length <= maxCharsPerLine) {
        lines.push(remaining);
        break;
      }

      // Default candidate split point
      let breakPoint = maxCharsPerLine;

      // Look backwards for punctuation to break at natural clause boundary (within last 5 chars)
      let naturalPunctBreak = -1;
      for (let i = maxCharsPerLine; i >= Math.max(1, maxCharsPerLine - 5); i--) {
        if (noStartPunct.has(remaining[i - 1])) {
          naturalPunctBreak = i;
          break;
        }
      }

      if (naturalPunctBreak !== -1) {
        breakPoint = naturalPunctBreak;
      } else {
        // Avoid breaking right after opening punctuation
        if (noEndPunct.has(remaining[breakPoint - 1])) {
          breakPoint--;
        }

        // Avoid starting the next line with closing punctuation
        while (breakPoint < remaining.length && noStartPunct.has(remaining[breakPoint])) {
          breakPoint++;
        }

        // If pushing past maxCharsPerLine made this line too long, break before punctuation instead
        if (breakPoint > maxCharsPerLine + 2) {
          breakPoint = maxCharsPerLine;
          while (breakPoint > 1 && noStartPunct.has(remaining[breakPoint])) {
            breakPoint--;
          }
        }
      }

      lines.push(remaining.slice(0, breakPoint));
      remaining = remaining.slice(breakPoint).trim();
    }

    return lines.join('\n');
  });

  return wrappedParagraphs.join('\n');
}
