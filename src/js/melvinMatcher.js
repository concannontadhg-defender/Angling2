/**
 * melvinMatcher.js  -  "Ghillie in my pocket" drift matcher for Lough Melvin
 * Angler's Tactical Report
 *
 * Reads: window.MELVIN_DRIFTS, window.LOUGHS, live weather from _wxMapCache,
 *        and getSolunar()/compassDir() already defined in loughs.html.
 * Outputs: a ranked start-here call with rod, line, depth, cast and retrieve,
 *          plus a three-tap on-the-water re-rank.
 *
 * HONESTY RULES BAKED IN:
 *  - Drifts with confidence:'low' are penalised and labelled, never top-billed silently.
 *  - Drifts with no aspect score NEUTRAL on wind direction and say so. They do not
 *    get credit for a fit that has not been established.
 *  - Every score shows its reasons. If you disagree with the call, you can see why
 *    it made it and overrule it.
 *
 * This is a model, not measured data. Treat the ranking as a strong opening
 * opinion from someone who has read everything - not as fact.
 */
(function () {
  'use strict';

  var D = window.MELVIN_DRIFTS;
  if (!D) return;

  var LOUGH_ID = 'melvin';

  // ── Observations: the three taps before the first cast ──────────────
  var OBS = { swallows: null, surface: null, rises: null };

  var OBS_OPTS = {
    swallows: [['low', 'Low & tight'], ['mid', 'Mid height'], ['high', 'High / none']],
    surface:  [['glass', 'Glass'], ['ripple', 'Ripple'], ['wave', 'Good wave']],
    rises:    [['none', 'Nothing'], ['sipping', 'Sipping'], ['slashing', 'Slashing']]
  };

  // ── Read the conditions into something scoreable ────────────────────
  function readConditions() {
    var wx = (window._wxMapCache || {})[LOUGH_ID] || null;
    var now = new Date();
    var lough = (window.LOUGHS || []).filter(function (l) { return l.id === LOUGH_ID; })[0];
    var sol = (lough && window.getSolunar) ? window.getSolunar(lough.lon, now) : null;

    var windSpeed = wx && wx.windSpeed != null ? wx.windSpeed : null;
    var cloud = wx && wx.cloudCover != null ? wx.cloudCover : null;

    // Observation overrides the forecast - what you can see beats what was predicted
    var waveState;
    if (OBS.surface) waveState = OBS.surface;
    else if (windSpeed == null) waveState = null;
    else if (windSpeed < 6) waveState = 'glass';
    else if (windSpeed < 14) waveState = 'ripple';
    else waveState = 'wave';

    var lightState;
    if (cloud == null) lightState = null;
    else if (cloud < 30) lightState = 'bright';
    else if (cloud < 75) lightState = 'mixed';
    else lightState = 'dull';

    return {
      wx: wx,
      month: now.getMonth() + 1,
      hour: now.getHours() + now.getMinutes() / 60,
      windDir: wx && wx.windDir != null ? wx.windDir : null,
      windCompass: (wx && wx.windDir != null && window.compassDir) ? window.compassDir(wx.windDir) : null,
      windSpeed: windSpeed,
      windGust: wx && wx.windGust != null ? wx.windGust : null,
      wave: waveState,
      light: lightState,
      cloud: cloud,
      pressure: wx ? wx.pressure : null,
      trend: wx ? wx.trend : null,
      temp: wx && wx.airTemp != null ? wx.airTemp : null,
      solunar: sol,
      lateSummer: (now.getMonth() + 1) === 8 || (now.getMonth() + 1) === 9
    };
  }

  // ── Score one drift ─────────────────────────────────────────────────
  function scoreDrift(dr, c) {
    var s = 5, why = [], flags = [];

    // Season
    var months = { Jan:1, Feb:2, Mar:3, Apr:4, May:5, Jun:6, Jul:7, Aug:8, Sep:9, Oct:10, Nov:11, Dec:12 };
    var inSeason = (dr.seasonBest || []).some(function (m) { return months[m] === c.month; });
    if ((dr.seasonBest || []).length === 0) { flags.push('No season data'); }
    else if (inSeason) { s += 1.5; why.push('In season now'); }
    else { s -= 3; why.push('Out of its best months'); }

    var sp = dr.species || [];
    var isGillaroo = sp.indexOf('gillaroo') > -1;
    var isSonaghan = sp.indexOf('sonaghan') > -1;

    // Wave gate - the gillaroo rule, with the late-summer exception
    if (isGillaroo && dr.waveGate) {
      if (c.wave === 'wave') { s += 1.5; why.push('Good wave - gillaroo gate open'); }
      else if (c.wave === 'ripple') { s += 0.3; }
      else if (c.wave === 'glass') {
        if (c.lateSummer) { s -= 0.5; why.push('Flat calm, but late summer softens the wave gate'); }
        else { s -= 2.5; why.push('Flat calm - gillaroo gate shut'); }
      }
    }

    // Light - sonaghan prefer low light. High sun drives them DOWN, which makes
    // the deep count-down band better, not worse. Getting this backwards is what
    // cost the whole fleet four days in June.
    var isDeep = dr.id === 'sidewall-dropoffs' || dr.id === 'main-basin-deep';
    if (isSonaghan) {
      if (c.light === 'dull') {
        if (isDeep) { s -= 0.3; } else { s += 1.2; why.push('Dull light - sonaghan will be up'); }
      } else if (c.light === 'bright') {
        if (isDeep) { s += 1.4; why.push('Bright sun pushes sonaghan down - fish the band'); }
        else { s -= 1.2; why.push('Bright - they will not be on top here'); }
      }
    }
    if (isDeep && c.wave === 'glass') { s += 1.0; why.push('Flat calm - the deep band is the answer'); }
    if (isGillaroo && c.light === 'dull' && c.wave === 'wave') { s += 0.6; why.push('Dull and wavy over the rocks'); }

    // Wind direction - degrades gracefully when aspect is unknown
    if (c.windCompass && dr.windGood && dr.windGood.length) {
      if (dr.windGood.indexOf(c.windCompass) > -1) { s += 1.8; why.push(c.windCompass + ' wind blows into this shore'); }
      else if ((dr.windDead || []).indexOf(c.windCompass) > -1) { s -= 2; why.push(c.windCompass + ' is off this shore - dead'); }
    } else {
      flags.push('Wind fit unknown - no aspect recorded');
    }

    // Wind strength via the lough's own rose
    var lough = (window.LOUGHS || []).filter(function (l) { return l.id === LOUGH_ID; })[0];
    if (lough && c.windSpeed != null && window.windScoreForLough) {
      var ws = window.windScoreForLough(c.windSpeed, c.windDir, c.windGust || 0, lough);
      s += (ws - 5) * 0.22;
      if (c.windGust && c.windGust > 40) { s -= 2; flags.push('Gusting ' + Math.round(c.windGust) + ' km/h - safety first'); }
    }

    // Pressure
    if (c.trend === 'Falling' && c.pressure && c.pressure < 1008) { s -= 0.8; why.push('Pressure falling sharply'); }
    if (c.trend === 'Rising') { s += 0.4; }

    // Observations
    if (OBS.rises === 'slashing') { if (isGillaroo || sp.indexOf('brown trout') > -1) { s += 1.2; why.push('Slashing rises - surface food event'); } }
    if (OBS.rises === 'none' && isDeep) { s += 1.4; why.push('Nothing showing - go down and find them'); }
    if (OBS.swallows === 'low') { s += 0.8; why.push('Swallows low and tight - fly is on the water'); }
    if (OBS.swallows === 'high' && isDeep) { s += 0.6; why.push('Swallows high - nothing hatching, go deep'); }

    // Honesty penalties
    var conf = dr.confidence || 'low';
    if (conf === 'high') s += 0.5;
    else if (conf === 'low') { s -= 0.9; flags.push('Low confidence - geometry inferred, not surveyed'); }

    if (dr.jurisdiction === 'NI') flags.push('NI waters - Garrison permit + NI licence');
    if (dr.inZone === 'rossinver-bay-fly-only') flags.push('Fly only');
    if (dr.hazard) flags.push('HAZARD: ' + (dr.hazardNote || 'submerged obstruction'));

    return { drift: dr, score: Math.max(0, Math.min(10, s)), why: why, flags: flags };
  }

  // ── Turn a drift + conditions into an actual cast ────────────────────
  function tactics(dr, c) {
    var sp = dr.species || [];
    var isGillaroo = sp.indexOf('gillaroo') > -1;
    var isSonaghan = sp.indexOf('sonaghan') > -1;
    var deep = dr.id === 'sidewall-dropoffs' || dr.id === 'main-basin-deep';

    // Fly style from pressure + light (the June spec)
    var sparse = (c.light === 'bright') || (c.pressure && c.pressure > 1020 && c.trend === 'Rising');
    var style = sparse ? 'Smaller, darker, sparser, fished deeper' : 'Bigger, bushier, worked higher';

    var t = { style: style };

    if (isGillaroo && c.lateSummer && (c.wave !== 'glass' || OBS.rises === 'slashing')) {
      t.rod = '5wt';
      t.line = 'Floating';
      t.depth = 'Surface';
      t.cast = ['Single dry: Green Peter Dry sz 10', 'or Dry Daddy sz 10'];
      t.retrieve = 'Static or the smallest twitch. Wait for the fish to turn down before lifting.';
      t.note = 'Late-summer exception: gillaroo come up to feed. Few boats will be fishing dry.';
    } else if (isGillaroo) {
      t.rod = '7wt Sage';
      t.line = 'Floating';
      t.depth = '0-4 m, on the shoulder not the crown';
      t.cast = ['Bob: Green Peter sz 10', 'Mid: Claret Dabbler sz 10', 'Point: Fiery Brown sz 10'];
      t.retrieve = 'Cast to the edge of the shallow and draw the flies off it into deeper water. Dibble the bob hard.';
    } else if (deep || (isSonaghan && c.light === 'bright')) {
      t.rod = '7wt Sage';
      t.line = 'Fast sink';
      t.depth = 'Count-down - ladder in fives. Late Aug the band sits deeper and sharper.';
      t.cast = ['Point: Booby orange/claret or green/green', 'Above: Claret Bumble sz 10'];
      t.retrieve = 'Two pulls, 3-7 second pause, then long slow pulls. Takes come ON THE PAUSE.';
      t.note = 'Below the thermocline there is no oxygen and no fish. Past 30 and nothing means you have gone too deep.';
    } else {
      t.rod = '7wt Sage';
      t.line = 'Floating';
      t.depth = 'Top 2-4 ft over deep water';
      t.cast = ['Bob: Green Peter sz 10', 'Mid: Claret Dabbler sz 10', 'Point: Bibio or Invicta sz 10'];
      t.retrieve = 'Short snappy casts, beam-on drift, hard dibble on the bob.';
    }

    // Switch signal
    if (t.line === 'Fast sink') t.sw = 'If fish start showing on top, go back to the floater and the three-fly team.';
    else if (t.rod === '5wt') t.sw = 'If the surface goes dead, back to the 7wt and the wet team.';
    else t.sw = 'Nothing in an hour on top - switch to the fast sink and ladder the count-down.';

    return t;
  }

  function run() {
    var c = readConditions();
    var ranked = D.drifts.map(function (d) { return scoreDrift(d, c); })
                         .sort(function (a, b) { return b.score - a.score; });
    return { cond: c, ranked: ranked };
  }

  window.MelvinMatcher = { run: run, tactics: tactics, obs: OBS, readConditions: readConditions };
})();
