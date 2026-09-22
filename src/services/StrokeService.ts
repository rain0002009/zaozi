export class StrokeService {
  private strokeMap: Record<string, string> = {};
  private isLoaded = false;
  private loadPromise: Promise<boolean> | null = null;

  async init(): Promise<boolean> {
    if (this.isLoaded) return true;
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = (async () => {
      try {
        if (typeof window === 'undefined') return false;
        const res = await fetch('/assets/data/strokes.json');
        if (!res.ok) {
          console.warn('[StrokeService] Failed to load /assets/data/strokes.json');
          return false;
        }
        this.strokeMap = await res.json();
        this.isLoaded = true;
        console.log('[StrokeService] Loaded stroke data for 9,507 characters.');
        return true;
      } catch (err) {
        console.error('[StrokeService] Error loading strokes.json:', err);
        return false;
      }
    })();

    return this.loadPromise;
  }

  isReady(): boolean {
    return this.isLoaded;
  }

  getStrokeSequence(char: string): string | undefined {
    return this.strokeMap[char];
  }
}

export const strokeService = new StrokeService();
