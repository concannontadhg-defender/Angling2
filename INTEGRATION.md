# Angler's Tactical Report — v2 Calibration Update

**What this delivers**

Two pure-function ES modules to wire into the existing API on `angling2.vercel.app` (repo: `concannontadhg-defender/Angling2`):

- `api/loughScoring.js` — recalibrated lough state model based on the weekend Conn observation. New `chocolate` tier, tightened thresholds, longer decay tracks, mayfly temperature gating, and shelter-bay routing when windward shores are unfishable.
- `api/riverTactics.js` — water-temperature → fly-depth advisory for rivers, calibrated against the 13 May Bandon sea trout session.

Both are stateless, return both numeric adjustments (to plug into existing scoring) and AI-context blocks (to splice into the Anthropic verdict prompt).

---

## Calibration changes vs. v1

| Scenario | v1 multiplier | v2 multiplier | Why |
|---|---|---|---|
| 36h N wind 25 kt avg on Conn (Sat-Sun) | ~0.65 (graded soupy) | **0.45** (graded chocolate, shelter mode) | New chocolate tier above soupy; shallow south-shore bays now in model |
| Light W wind, 12°C surface, mayfly building | 0.95 (mayfly assumed) | **0.95** (mayfly emergence triggered after 3 days ≥12°C) | Explicit mayfly gate |
| Cold pre-mayfly 9°C surface | 0.85 (buzzers, slight penalty) | **0.60** (buzzers, mayfly capped) | Mayfly score capped until ≥12°C × 3 days |
| Chocolate event with clearing forecast | "tinged in 24h" | **"soupy at +36h, clear at +72h"** | Decay tracks lengthened to match field reality |

### Key threshold changes

- Stir energy threshold lowered from 15 kt to **12 kt** (waves >0.5m and bottom resuspension on shallow loughs start there).
- Colour bands recalibrated: clear / faintlyTinged / tinged / soupy / **chocolate** (new).
- Decay times: chocolate → soupy 48–72h (was n/a), soupy → tinged 36–48h (was ~24h), tinged → clear 18–24h.
- Cold water (<10°C) multiplies all decay tracks by 1.5×.
- Any rain >1 mm/h halts decay entirely.
- Mayfly gate: requires 3 consecutive days surface temp ≥12°C before mayfly score uncaps.
- Per-bay depth multiplier: 2.5m bay colours ~1.6× faster than 4m bay; 8m channel colours 0.5× as fast.

---

## Integration — Loughs

```javascript
// api/loughs/score.js (example handler)
import { applyLoughAdjustments } from '../loughScoring.js';
import { getOpenMeteoHistory, getOpenMeteoForecast } from '../weather.js';

export default async function handler(req, res) {
  const { lakeKey } = req.query;   // 'conn' | 'corrib' | 'sheelin' | 'melvin'

  // 1. Pull 36h wind + rain history from Open-Meteo (you already do this)
  const history = await getOpenMeteoHistory(lakeKey, { hours: 48 });
  const forecast = await getOpenMeteoForecast(lakeKey, { hours: 72 });

  // 2. Compute base score with existing scoring engine
  const baseScore = computeBaseLakeScore(lakeKey, history);

  // 3. Apply v2 adjustments
  const result = applyLoughAdjustments(baseScore, {
    lakeKey,
    windHistory: history.wind,       // [{ timestamp, speedKt, directionDeg }]
    rainHistoryMm: history.rain24h,
    surfaceTempC: history.surfaceTemp,           // best estimate
    surfaceTempHistoryC: history.surfaceTemp7d,  // 7 daily values
    currentWindDirDeg: history.wind.at(-1).directionDeg,
    currentWindKt: history.wind.at(-1).speedKt,
    windForecast: forecast.wind,     // [{ hoursFromNow, speedKt, directionDeg }]
    rainForecastMm: forecast.rain24h,
    dayOfYear: getDayOfYear(),
  });

  // 4. Splice the AI context block into your verdict prompt
  const aiPrompt = `${result.aiContext}\n\nGenerate a fishing verdict...`;
  const verdict = await callAnthropicAPI(aiPrompt);

  return res.json({
    score: result.adjustedScore,
    baseScore: result.baseScore,
    headline: result.now.headline,
    colour: result.now.colour,
    feeding: result.now.feeding,
    bays: result.now.bays,
    forecast: result.forecast,
    verdict,
  });
}
```

### Frontend changes for loughs

The result includes everything the UI needs without extra calls:

```javascript
// In loughs.html render code
fetch(`/api/loughs/score?lakeKey=conn`)
  .then(r => r.json())
  .then(d => {
    // 1. Headline shows shelter mode prominently when active
    if (d.bays.shelterMode) {
      headlineEl.innerHTML = `⚠️ Shelter mode — ${d.headline}`;
      headlineEl.classList.add('warning');
    }

    // 2. Bay ranking with per-bay colour badges
    d.bays.ranking.forEach(bay => {
      renderBayCard(bay.bay, bay.score, bay.colour, bay.reason);
    });

    // 3. Forecast timeline — show when windward shores come back
    if (d.forecast.switchPoint) {
      forecastEl.innerHTML = `Windward shores back from +${d.forecast.switchPoint.hoursFromNow}h`;
    } else {
      forecastEl.innerHTML = d.forecast.narrative;
    }

    // 4. Feeding mode badge with mayfly readiness indicator
    feedingEl.innerHTML = `${d.feeding.label}<br>` +
      `Flies: ${d.feeding.recommendedFlies.slice(0, 3).join(', ')}`;
    if (d.feeding.mayflyReadiness < 1) {
      feedingEl.innerHTML += `<br><small>Mayfly: ${d.feeding.consecutiveDaysAtThreshold}/3 days at threshold</small>`;
    }
  });
```

---

## Integration — Rivers

```javascript
// api/rivers/tactics.js
import { recommendRiverTactics } from '../riverTactics.js';

export default async function handler(req, res) {
  const { riverKey, userThermometer } = req.query;

  const air = await getOpenMeteo7DayAir(riverKey);
  const rain = await getOpenMeteoRain24h(riverKey);

  const tactics = recommendRiverTactics({
    riverKey,
    riverName: RIVERS[riverKey].name,
    airTempHistory7DayC: air.dailyMeanC,
    rainfall24hMm: rain,
    userThermometerC: userThermometer ? parseFloat(userThermometer) : null,
    userThermometerAgeHours: userThermometer ? getOverrideAge(riverKey) : 0,
    month: new Date().getMonth() + 1,
    targetSpecies: 'brown',         // or 'salmon' / 'seatrout' from query
  });

  return res.json(tactics);
}
```

### Frontend: add thermometer input to each river card

```html
<!-- In rivers.html, inside each river card -->
<div class="thermometer-input">
  <label>Streamside reading (°C):</label>
  <input type="number" step="0.1" min="0" max="25" id="thermo-bandon">
  <button onclick="saveThermometer('bandon')">Save</button>
</div>

<div class="tactics-block" id="tactics-bandon">
  <!-- Populated from API -->
</div>

<script>
function saveThermometer(riverKey) {
  const v = document.getElementById(`thermo-${riverKey}`).value;
  localStorage.setItem(`thermo-${riverKey}`, JSON.stringify({
    value: parseFloat(v),
    timestamp: Date.now(),
  }));
  refreshRiver(riverKey);
}

function refreshRiver(riverKey) {
  const stored = JSON.parse(localStorage.getItem(`thermo-${riverKey}`) || 'null');
  const url = stored && (Date.now() - stored.timestamp) < 24 * 3600 * 1000
    ? `/api/rivers/tactics?riverKey=${riverKey}&userThermometer=${stored.value}`
    : `/api/rivers/tactics?riverKey=${riverKey}`;

  fetch(url).then(r => r.json()).then(t => {
    document.getElementById(`tactics-${riverKey}`).innerHTML = `
      <div class="headline">${t.headline}</div>
      <div class="setup"><strong>Setup:</strong> ${t.feeding.setup}</div>
      <div class="retrieve"><strong>Retrieve:</strong> ${t.feeding.retrieve}</div>
      <div class="flies"><strong>Flies:</strong> ${t.feeding.recommendedFlies.join(' · ')}</div>
      <div class="temp-source"><small>${t.temp.note}</small></div>
    `;
  });
}
</script>
```

---

## Field calibration that's still needed

1. **Conn bay bearings** — I've set sensible defaults based on lake geometry but the bay names and exposure bearings need ground-truth from your local knowledge. Specifically:
   - Verify Drummin Bay / South End shallows are actually the bays that went chocolate Saturday
   - Confirm Brackwansha is the right north-shore reference (or replace with the bay you'd actually fish in a S wind)
   - Confirm Victoria Bay's headland-sheltered bearings
   - Replace Addergoole inflow with the correct inflow names if I've got them wrong

2. **Sheelin / Corrib / Melvin** — placeholders only. Each lake needs a similar bay-bearing audit. Sheelin in particular is shallow enough (5m mean) that it colours faster than Conn and the current model captures that, but the specific bay names need your eye.

3. **Temperature override telemetry** — track how often the derived water temp differs from streamside readings, and per-river. Over a season we can back-fit the slope/offset per river instead of using a single Munster-wide formula.

4. **Mayfly trigger detection** — the model uses "3 consecutive days surface temp ≥12°C" as the trigger. Once you've observed mayfly hatching on Conn this season, pass that as `mayflyTriggerDay` to anchor the days-since-trigger countdown rather than re-estimating it from temp history.

---

## Files in this delivery

- `api/loughScoring.js` — 750 lines, ES module
- `api/riverTactics.js` — 250 lines, ES module
- `api/test-loughScoring.mjs` — calibration tests including the Saturday-Sunday Conn event
- `api/test-riverTactics.mjs` — calibration tests including the 13 May Bandon session
- `INTEGRATION.md` — this guide
