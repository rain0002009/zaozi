import { describe, it, expect } from 'vitest';

declare const require: any;
declare const __dirname: string;

describe('Melee Trajectory Line Removal Verification', () => {
  it('confirms GameScene no longer renders ugly knifeTrail line segments or melee wind cut lines', () => {
    const fs = require('fs');
    const path = require('path');
    const gameScenePath = path.resolve(__dirname, '../scenes/GameScene.ts');
    const content = fs.readFileSync(gameScenePath, 'utf-8');

    // Ensure knifeTrail lineBetween is removed
    expect(content.includes('this.knifeTrail.lineBetween')).toBe(false);
    expect(content.includes('this.updateKnifeTrail')).toBe(false);

    // Ensure spawnMeleeWindCut arc lines are removed
    expect(content.includes('spawnMeleeWindCut')).toBe(false);
  });
});


