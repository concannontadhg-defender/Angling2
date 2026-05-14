// test-riverTactics.mjs - calibration tests for river tactics module
// Run with: node tests/test-riverTactics.mjs
import { recommendRiverTactics, estimateWaterTemp, inferRiverFeedingMode } from '../api/riverTactics.js';

function hr(t) { console.log('\n' + '='.repeat(75) + '\n' + t + '\n' + '='.repeat(75)); }

// TEST 1: Bandon 13 May 2026 — actual calibration data
hr('TEST 1: Bandon, 13 May 2026 evening — 3 brown + 1 sea trout on Teal Blue & Silver');

const bandon = recommendRiverTactics({
  riverKey: 'bandon',
  riverName: 'Bandon (Innishannon)',
  airTempHistory7DayC: [11, 12, 13, 12, 13, 14, 14],
  rainfall24hMm: 2,
  month: 5,
  targetSpecies: 'seatrout',
});

console.log('Headline:', bandon.headline);
console.log('Temp:', bandon.temp);
console.log('Mode:', bandon.feeding.mode);
console.log('Label:', bandon.feeding.label);
console.log('Depth:', bandon.feeding.depth);
console.log('Countdown:', bandon.feeding.countdownSeconds + 's');
console.log('Retrieve:', bandon.feeding.retrieve);
console.log('Setup:', bandon.feeding.setup);
console.log('Flies:', bandon.feeding.recommendedFlies.join(', '));

// TEST 2: All temperature bands
hr('TEST 2: Six temperature bands');

const bands = [6, 10, 14, 17, 20, 22];
for (const t of bands) {
  const f = inferRiverFeedingMode({ tempC: t, targetSpecies: 'brown' });
  console.log(`${t.toString().padStart(2)}°C → ${f.mode.padEnd(20)} | depth: ${f.depth.padEnd(22)} | countdown: ${f.countdownSeconds}s`);
}

// TEST 3: User thermometer override
hr('TEST 3: User thermometer override');

const withoutOverride = estimateWaterTemp({
  airTempHistory7DayC: [13, 14, 14, 15, 15, 14, 13], month: 5,
});
const withOverride = estimateWaterTemp({
  airTempHistory7DayC: [13, 14, 14, 15, 15, 14, 13], month: 5,
  userThermometerC: 9.8, userThermometerAgeHours: 2,
});
const staleOverride = estimateWaterTemp({
  airTempHistory7DayC: [13, 14, 14, 15, 15, 14, 13], month: 5,
  userThermometerC: 9.8, userThermometerAgeHours: 36,
});

console.log('Without override:', withoutOverride);
console.log('With fresh override (2h old):', withOverride);
console.log('With stale override (36h old, should fall back):', staleOverride);

// TEST 4: Heavy rain spate runoff cooling
hr('TEST 4: Heavy rain cooling effect');

const dry = estimateWaterTemp({ airTempHistory7DayC: [16, 17, 17, 18, 18, 17, 16], month: 6, rainfall24hMm: 0 });
const wet = estimateWaterTemp({ airTempHistory7DayC: [16, 17, 17, 18, 18, 17, 16], month: 6, rainfall24hMm: 35 });
console.log('Dry conditions:', dry.tempC, '°C', '(confidence:', dry.confidence + ')');
console.log('After 35mm rain:', wet.tempC, '°C', '(confidence:', wet.confidence + ')');

// TEST 5: AI context block
hr('TEST 5: AI context block — feeds into the verdict prompt');

console.log(bandon.aiContext);

console.log('\n✓ All river tactics tests complete');
