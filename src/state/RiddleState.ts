export const STROKES = ['一', '丨', '丿', '㇏', '丶', '㇇'] as const;
export type Stroke = (typeof STROKES)[number];
export type Inventory = Record<Stroke, number>;

export type CharacterRiddle = {
  id: string;
  clue: string;
  targetWord: string;
  hint1: string; // 结构/部首线索
  hint2: string; // 字义/组词线索
};

export type RiddleSession = {
  riddle: CharacterRiddle;
  unlockedHints: number; // 0, 1, 2
};

export const CHARACTER_RIDDLES: CharacterRiddle[] = [
  {
    id: 'riddle-gao',
    clue: '一口吃掉牛尾巴',
    targetWord: '告',
    hint1: '上下结构，口字底',
    hint2: '意为告知、宣告、报告',
  },
  {
    id: 'riddle-na',
    clue: '一人一张口，下面长只手',
    targetWord: '拿',
    hint1: '上下结构，合手为一',
    hint2: '意为捉拿、拿取、掌管',
  },
  {
    id: 'riddle-shan',
    clue: '门里有人',
    targetWord: '闪',
    hint1: '半包围结构，门字框内藏人',
    hint2: '意为闪电、闪烁、闪避',
  },
  {
    id: 'riddle-jie',
    clue: '一人立在日旁边',
    targetWord: '借',
    hint1: '左右结构，单人旁加昔',
    hint2: '意为借用、假借、借贷',
  },
  {
    id: 'riddle-fu',
    clue: '二人同心，齐力擎天',
    targetWord: '夫',
    hint1: '独体字，二人合一',
    hint2: '意为匹夫、大夫、勇夫',
  },
  {
    id: 'riddle-yu',
    clue: '千条线，万条线，落入水里看不见',
    targetWord: '雨',
    hint1: '独体字，天降甘霖',
    hint2: '意为雨水、疾风骤雨',
  },
  {
    id: 'riddle-ka',
    clue: '上下一体，不上不下',
    targetWord: '卡',
    hint1: '上下结构，有上又有下',
    hint2: '意为关卡、卡片、卡死',
  },
  {
    id: 'riddle-sheng',
    clue: '自小在一起，目前少联系',
    targetWord: '省',
    hint1: '上下结构，少字头与目字底',
    hint2: '意为省悟、反省、节省',
  },
  {
    id: 'riddle-yan',
    clue: '两火并肩，势不可挡',
    targetWord: '炎',
    hint1: '上下结构，重火之相',
    hint2: '意为炎热、赤炎、烈焰',
  },
  {
    id: 'riddle-lin',
    clue: '独木不成林，双木方成景',
    targetWord: '林',
    hint1: '左右结构，双木并立',
    hint2: '意为树林、森林、绿林',
  },
];

export function getRandomRiddle(randomFn: () => number = Math.random): CharacterRiddle {
  const index = Math.floor(randomFn() * CHARACTER_RIDDLES.length);
  return CHARACTER_RIDDLES[Math.min(index, CHARACTER_RIDDLES.length - 1)];
}

export function createRiddleSession(riddle?: CharacterRiddle): RiddleSession {
  return {
    riddle: riddle ?? getRandomRiddle(),
    unlockedHints: 0,
  };
}

export function unlockNextHint(
  session: RiddleSession,
  carried: Inventory
): { success: boolean; consumedStroke?: Stroke; reason?: string } {
  if (session.unlockedHints >= 2) {
    return { success: false, reason: '所有线索已揭示' };
  }

  // Find a stroke in carried with quantity > 0 (prefer stroke with highest count)
  let chosenStroke: Stroke | undefined;
  for (const stroke of STROKES) {
    if ((carried[stroke] ?? 0) > 0) {
      if (!chosenStroke || (carried[stroke] ?? 0) > (carried[chosenStroke] ?? 0)) {
        chosenStroke = stroke;
      }
    }
  }

  if (!chosenStroke) {
    return { success: false, reason: '携带笔画不足，无法解锁线索' };
  }

  carried[chosenStroke] -= 1;
  session.unlockedHints += 1;
  return { success: true, consumedStroke: chosenStroke };
}

export function abandonRiddle(expedition?: { route?: string }): void {
  if (!expedition) return;
  expedition.route = undefined;
}
