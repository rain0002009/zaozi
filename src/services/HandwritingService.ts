import { WORDS, WordId } from '../state/GameState';

declare global {
  interface Window {
    HanziLookup?: any;
  }
}

export type HandwritingCandidate = {
  character: string;
  score: number;
  isKnown: boolean;
  wordId?: WordId;
};

export class HandwritingService {
  private isInitialized = false;
  private initPromise: Promise<boolean> | null = null;

  /**
   * Initializes HanziLookup with the MMAH dataset.
   * Runs asynchronously in the background.
   */
  async init(): Promise<boolean> {
    if (this.isInitialized) return true;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        if (typeof window === 'undefined') return false;

        // If script hasn't loaded yet, wait briefly
        if (!window.HanziLookup) {
          let attempts = 0;
          while (!window.HanziLookup && attempts < 10) {
            await new Promise((r) => setTimeout(r, 100));
            attempts++;
          }
        }

        if (!window.HanziLookup) {
          console.warn('[HandwritingService] window.HanziLookup is not defined.');
          return false;
        }

        const res = await fetch('/assets/data/mmah.json');
        if (!res.ok) {
          console.error('[HandwritingService] Failed to fetch /assets/data/mmah.json:', res.statusText);
          return false;
        }

        const data = await res.json();
        window.HanziLookup.data['mmah'] = data;
        window.HanziLookup.data['mmah'].substrokes = window.HanziLookup.decodeCompact(data.substrokes);
        this.isInitialized = true;
        console.log('[HandwritingService] Initialized successfully with 9507 Hanzi characters.');
        return true;
      } catch (err) {
        console.error('[HandwritingService] Initialization error:', err);
        return false;
      }
    })();

    return this.initPromise;
  }

  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Recognizes handwritten strokes using HanziLookup.
   * @param strokes Array of strokes, where each stroke is an array of [x, y] coordinates.
   * @param limit Maximum number of candidate characters to return.
   */
  recognize(strokes: number[][][], limit = 6): HandwritingCandidate[] {
    if (!this.isInitialized || typeof window === 'undefined' || !window.HanziLookup) {
      return [];
    }

    if (!strokes || strokes.length === 0) {
      return [];
    }

    try {
      const analyzedChar = new window.HanziLookup.AnalyzedCharacter(strokes);
      const matcher = new window.HanziLookup.Matcher('mmah');
      let results: HandwritingCandidate[] = [];

      matcher.match(analyzedChar, limit, (matches: Array<{ character: string; score: number }>) => {
        results = matches.map((m) => {
          return {
            character: m.character,
            score: m.score,
            isKnown: true,
            wordId: m.character as WordId,
          };
        });
      });

      return results;
    } catch (err) {
      console.error('[HandwritingService] Recognition error:', err);
      return [];
    }
  }
}

export const handwritingService = new HandwritingService();
