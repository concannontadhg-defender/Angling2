# Angler's Tactical Report — Lough & River Calibration v2

Drop-in update for `concannontadhg-defender/Angling2` on Vercel at `angling2.vercel.app`.

## What's in this package

```
api/
  loughScoring.js      — recalibrated lough state model with chocolate tier,
                         shelter-bay routing, mayfly temperature gate
  riverTactics.js      — NEW: water-temp → fly-depth advisory for rivers

tests/
  test-loughScoring.mjs — calibration tests (Saturday-Sunday Conn, 7-8 May trip,
                          cold pre-mayfly, forecast clearing, Sheelin sensitivity)
  test-riverTactics.mjs — calibration tests (Bandon 13 May, 6 temp bands,
                          override mechanic, rain cooling)

INTEGRATION.md         — full wiring guide for the API handlers and frontend
README.md              — this file
```

## Deploying

The repo layout assumes:
- `/api/*.js` files are Vercel serverless functions (auto-routed)
- `/tests/*.mjs` files are local-only (not deployed)

### Step 1 — drop the files into your repo

```bash
cd ~/Angling2                                # your local checkout
cp /path/to/this-package/api/loughScoring.js api/
cp /path/to/this-package/api/riverTactics.js api/
mkdir -p tests
cp /path/to/this-package/tests/*.mjs tests/
cp /path/to/this-package/INTEGRATION.md .
```

### Step 2 — verify locally

```bash
node --check api/loughScoring.js
node --check api/riverTactics.js
node tests/test-loughScoring.mjs       # should print 5 scenarios cleanly
node tests/test-riverTactics.mjs       # should print Bandon scenario as 'cool' band
```

If both pass with no errors, you're good to push.

### Step 3 — wire into your existing handlers

You have two options for the loughs side:

**(a) Minimal — just bolt the adjustment onto your existing score**

In whatever handler currently returns the lough score, add:

```javascript
import { applyLoughAdjustments } from './loughScoring.js';

// after computing your existing baseScore:
const result = applyLoughAdjustments(baseScore, {
  lakeKey,
  windHistory,                  // already pulled
  rainHistoryMm,                // already pulled
  surfaceTempC,                 // best available
  surfaceTempHistoryC,          // 7 daily values
  currentWindDirDeg,
  currentWindKt,
  windForecast,                 // from Met Éireann / Open-Meteo
  rainForecastMm,
});

return res.json({
  score: result.adjustedScore,
  headline: result.now.headline,
  bays: result.now.bays.ranking,
  shelterMode: result.now.bays.shelterMode,
  feeding: result.now.feeding,
  forecast: result.forecast,
  aiContext: result.aiContext,       // splice into your Anthropic prompt
});
```

**(b) Full — also add the AI context block to the verdict prompt**

```javascript
const verdictPrompt = `${result.aiContext}

Given the above conditions, write a 100-word verdict for an experienced angler
on whether to fish today, where, and with what setup. Be direct.`;

const verdict = await callAnthropicAPI(verdictPrompt);
```

For the rivers side, similar — see `INTEGRATION.md` for the full handler example
plus the frontend HTML for the thermometer override input.

### Step 4 — push

```bash
git add api/loughScoring.js api/riverTactics.js tests/ INTEGRATION.md README.md
git commit -m "Lough/river v2 calibration — chocolate tier, mayfly gate, river temp"
git push
```

Vercel will auto-deploy. Watch the build log on the first push because the new
imports might fail if your existing handler isn't using ES module syntax —
in that case either add `"type": "module"` to `package.json` or rename your
handler to `.mjs`.

## What changed vs. v1

| Area | v1 | v2 |
|---|---|---|
| Wind threshold | 15 kt | **12 kt** (waves >0.5m + bottom resuspension start here) |
| Colour tiers | clear / tinged / soupy | clear / faintly tinged / tinged / soupy / **chocolate** |
| Decay tracks | tinged clears in 24h | chocolate → soupy 48-72h, soupy → tinged 36-48h, tinged → clear 18-24h |
| Cold-water modifier | none | × 1.5 to all decay tracks when surface <10°C |
| Rain modifier | none | any rain >1mm/h halts decay entirely |
| Mayfly gate | implicit | **explicit — requires 3 consecutive days ≥12°C** |
| Shelter routing | demote bays uniformly | **escalate inflows, narrows, headland-sheltered bays** |
| River water temp | not modelled | derived from 7-day air temp + season + rain cooling, override-able |
| River fly depth | not modelled | 6 bands from cold-bottom to stressed-dawn-dusk |

## Calibration anchors

These are the field observations the model is tuned against:

- **Saturday-Sunday Conn (9-10 May 2026)**: N wind gusting 60 kph for ~36h. South-shore bays went chocolate brown. Model now correctly grades this as 8.0 → 3.6 with shelter mode active.

- **Bandon evening (13 May 2026)**: 3 brown trout + 1 sea trout on Teal Blue & Silver point fly, counted down 3-5 seconds. Water in 10-12°C band. Model grades as 'cool, lower third, count 4s, weighted point' — matches exactly.

## Still needs your eye

- Conn bay names and bearings are my best-guess from lake geometry. Specifically verify Drummin Bay / South End shallows naming and Victoria Bay's headland-sheltered bearings. See INTEGRATION.md for the full audit list.

- Sheelin / Corrib / Melvin bay configs are placeholder. Same audit needed before going live for those lakes.

- The water-temperature estimate uses a single Munster-wide slope/offset. Over a season, log streamside thermometer readings against the estimate to back-fit a per-river coefficient.
