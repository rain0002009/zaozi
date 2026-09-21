const fs = require('fs');
const path = require('path');
const vm = require('vm');

const code = fs.readFileSync(path.join(__dirname, '../public/libs/hanzilookup.min.js'), 'utf8');
vm.runInThisContext(code);


const mmahRaw = fs.readFileSync(path.join(__dirname, '../public/assets/data/mmah.json'), 'utf8');
const HanziLookup = global.HanziLookup;

console.log('HanziLookup loaded:', !!HanziLookup);

// Initialize data directly
HanziLookup.data["mmah"] = JSON.parse(mmahRaw);
HanziLookup.data["mmah"].substrokes = HanziLookup.decodeCompact(HanziLookup.data["mmah"].substrokes);
console.log('Data initialized, total chars:', HanziLookup.data["mmah"].chars.length);

// Let's test recognizing "十" (cross: horizontal stroke + vertical stroke)
// Stroke 1: horizontal line from (50, 128) to (200, 128)
// Stroke 2: vertical line from (128, 50) to (128, 200)
const stroke1 = [[50, 128], [100, 128], [150, 128], [200, 128]];
const stroke2 = [[128, 50], [128, 100], [128, 150], [128, 200]];

const analyzed = new HanziLookup.AnalyzedCharacter([stroke1, stroke2]);
const matcher = new HanziLookup.Matcher("mmah");

matcher.match(analyzed, 8, (matches) => {
  console.log('Matches for 十:', matches.map(m => ({ char: m.character, score: m.score.toFixed(2) })));
});

// Let's test recognizing "人" (撇 + 捺)
// Stroke 1: 撇 from (128, 50) down-left to (60, 220)
// Stroke 2: 捺 from (100, 120) down-right to (200, 220)
const renStroke1 = [[128, 50], [110, 100], [90, 160], [60, 220]];
const renStroke2 = [[100, 120], [130, 150], [160, 180], [200, 220]];

const analyzedRen = new HanziLookup.AnalyzedCharacter([renStroke1, renStroke2]);
matcher.match(analyzedRen, 8, (matches) => {
  console.log('Matches for 人:', matches.map(m => ({ char: m.character, score: m.score.toFixed(2) })));
});

// Let's test recognizing "木" (横 + 竖 + 撇 + 捺)
const muStroke1 = [[50, 100], [128, 100], [200, 100]]; // 横
const muStroke2 = [[128, 40], [128, 130], [128, 220]]; // 竖
const muStroke3 = [[128, 100], [90, 160], [50, 210]];   // 撇
const muStroke4 = [[128, 100], [160, 160], [210, 210]]; // 捺

const analyzedMu = new HanziLookup.AnalyzedCharacter([muStroke1, muStroke2, muStroke3, muStroke4]);
matcher.match(analyzedMu, 8, (matches) => {
  console.log('Matches for 木:', matches.map(m => ({ char: m.character, score: m.score.toFixed(2) })));
});
