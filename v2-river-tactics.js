/* ════════════════════════════════════════════════════════════════
 * v2-river-tactics.js
 * Add-on for Angler's Tactical Report rivers page.
 * Adds: water-temp estimate (from 7-day air mean) when gauge missing,
 *       6-band river feeding mode badge,
 *       dry-fly switch indicator with three-part gate.
 *
 * Install: drop this file in your repo root and add ONE line to
 * rivers.html, immediately before </body>:
 *   <script src="/v2-river-tactics.js"></script>
 *
 * Does NOT modify the existing rivers.html. Reads data from
 * window._cardData (already populated by the existing renderCard).
 * Safe to remove at any time by deleting the script tag.
 * ════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  console.log('%c[v2-river-tactics] loaded', 'color:#7ec868;font-weight:bold');

  // ── CSS injection (one-off) ─────────────────────────────────────
  const css = `
.v2-feed-row{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:10px 0 6px}
@media(max-width:600px){.v2-feed-row{grid-template-columns:1fr}}
.v2-feed-card{background:#111f14;border:1px solid #2a4530;border-radius:3px;padding:8px 10px;border-left:3px solid #3a6048}
.v2-feed-card.cold-bottom{border-left-color:#4290ad}
.v2-feed-card.cool{border-left-color:#3fa8a0}
.v2-feed-card.optimal{border-left-color:#7ec868}
.v2-feed-card.active{border-left-color:#c8a84a}
.v2-feed-card.evening{border-left-color:#c97d18}
.v2-feed-card.stressed{border-left-color:#c45a4a}
.v2-feed-label{font-family:'Share Tech Mono',monospace;font-size:10px;color:#6a9070;text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px}
.v2-feed-name{font-family:'Bebas Neue','Barlow Condensed',sans-serif;font-size:14px;letter-spacing:1px;color:#cce0c0;margin-bottom:2px;line-height:1}
.v2-feed-temp{font-family:'Share Tech Mono',monospace;font-size:10px;color:#6a9070;margin-top:2px}
.v2-feed-temp .est{color:#3fa8a0}
.v2-feed-temp .live{color:#7ec868}
.v2-feed-tactic{font-size:11px;color:#90aa88;line-height:1.45;margin-top:6px}
.v2-feed-tactic b{color:#cce0c0}
.v2-dry-pill{display:inline-block;font-family:'Share Tech Mono',monospace;font-size:10px;padding:3px 8px;border-radius:3px;letter-spacing:.3px;line-height:1.4}
.v2-dry-cold{background:#0a141e;color:#5a90b0;border:1px solid #1a2a40}
.v2-dry-gate{background:#1a1400;color:#c8a84a;border:1px solid #4a3800}
.v2-dry-ready{background:#0a1e0a;color:#7ec868;border:1px solid #205520}
.v2-dry-unknown{background:#111f14;color:#6a9070;border:1px solid #2a4530}
.v2-badge{display:inline-block;background:#0a1208;border:1px solid #254535;color:#7ec868;font-family:'Share Tech Mono',monospace;font-size:9px;padding:2px 6px;border-radius:2px;margin-left:8px;letter-spacing:.5px;vertical-align:middle}
`;
  const styleEl = document.createElement('style');
  styleEl.id = 'v2-river-tactics-css';
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // ── Add a v2 badge to the logo so deploy is verifiable ──────────
  function addV2Badge(){
    const logo = document.querySelector('.logo');
    if(logo && !logo.querySelector('.v2-badge')){
      const badge = document.createElement('span');
      badge.className = 'v2-badge';
      badge.textContent = 'v2 calibrated';
      const small = logo.querySelector('small');
      if(small) logo.insertBefore(badge, small);
      else logo.appendChild(badge);
    }
  }

  // ── v2 LOGIC ────────────────────────────────────────────────────
  const FEEDING_MODES = [
    { key:'cold-bottom', range:[-99,8], name:'COLD BOTTOM', icon:'❄️',
      method:'Heavy weighted nymph or sunk wet, count 6s+',
      tactic:'Deepest pools. Fish move very little — get the fly to them on a long countdown. Stay near the bottom.' },
    { key:'cool', range:[8,13], name:'COOL', icon:'💧',
      method:'Weighted point fly on floater + sink tip, count 4s',
      tactic:'Lower third of the column. The Bandon 13 May pattern (~10-12°C) — weighted Teal Blue & Silver point fly. Slow countdown.' },
    { key:'optimal', range:[13,16], name:'OPTIMAL SUB-SURFACE', icon:'✓',
      method:'Team of three wets, mid-column',
      tactic:'Classic North Country Spider drift. Dry fly gate just opened — switch the moment you see rises during a hatch.' },
    { key:'active', range:[16,19], name:'ACTIVE FULL-COLUMN', icon:'🌿',
      method:'Wets and dries both work',
      tactic:'Switch to dries immediately when a hatch is visible. Surface action probable; fish feed at all depths.' },
    { key:'evening', range:[19,21], name:'EVENING SURFACE', icon:'🌅',
      method:'Dawn and dusk windows, dries dominate',
      tactic:'Avoid midday — fish sulking in cool spots. Best windows: dawn before 09:00 and dusk after sunset −90min.' },
    { key:'stressed', range:[21,99], name:'STRESSED', icon:'⚠️',
      method:'Brief cool windows only',
      tactic:'Conservation concerns. Dawn only. C&R, fight short, revive carefully. Consider not fishing.' },
  ];

  function inferRiverFeedingMode(waterTempC){
    if(waterTempC==null||isNaN(waterTempC)) return null;
    return FEEDING_MODES.find(m=>waterTempC>=m.range[0]&&waterTempC<m.range[1]) || FEEDING_MODES[2];
  }

  // Estimate water temp when gauge missing. Uses current air temp as a
  // 1-point proxy when we don't have a 7-day series available.
  function estimateRiverWaterTemp(airTempNow, month, rainfall24hMm){
    if(airTempNow==null||isNaN(airTempNow)) return null;
    let slope, offset;
    if(month>=3&&month<=5){ slope=0.75; offset=2.5; }
    else if(month>=6&&month<=8){ slope=0.85; offset=1.5; }
    else if(month>=9&&month<=11){ slope=0.80; offset=1.0; }
    else { slope=0.70; offset=2.0; }
    let t = slope*airTempNow + offset;
    if(rainfall24hMm>20) t = t*0.7 + 6.5*0.3;
    else if(rainfall24hMm>10) t = t*0.85 + 7.0*0.15;
    return Math.round(t*10)/10;
  }

  function dryFlySwitchStatus(waterTempC, airTempC){
    let wt = waterTempC;
    if(wt==null||isNaN(wt)){
      if(airTempC==null) return { state:'unknown', label:'No temp data', advice:'Need water temp to evaluate dry-fly gate.' };
      wt = airTempC - 2;
    }
    if(wt<13){
      return { state:'cold', label:`Closed — water ${wt.toFixed(1)}°C`,
        advice:`Under 13°C, trout aren't fully committed to the surface. Stay sub-surface with nymphs or weighted wets, even if a hatch is visible. Wait for the water to warm.` };
    }
    if(wt>=16){
      return { state:'ready', label:`OPEN — water ${wt.toFixed(1)}°C`,
        advice:`Above 16°C the temperature gate is fully open. Switch to dries the moment you see rises — no need to wait for a confirmed hatch.` };
    }
    return { state:'gate', label:`Conditional — water ${wt.toFixed(1)}°C`,
      advice:`13-16°C is the conditional zone. Switch to dries when: (1) a hatch is on AND (2) you see 2-3 rises within casting range. Otherwise stay sub-surface.` };
  }

  // ── Build the panel HTML ────────────────────────────────────────
  function buildPanelHTML(cardData){
    const month = new Date().getMonth()+1;
    const wtGauge = cardData.wt;  // from OPW temp sensor
    const airT = cardData.wx?.airTemp;
    const rain = cardData.wx?.todayPrecip || 0;
    const wtEst = estimateRiverWaterTemp(airT, month, rain);
    const wtEff = (wtGauge!=null && !isNaN(wtGauge)) ? wtGauge : wtEst;
    const mode = inferRiverFeedingMode(wtEff);
    const dryFly = dryFlySwitchStatus(wtEff, airT);

    if(!mode && dryFly.state==='unknown'){
      return `<div class="v2-feed-row" style="grid-template-columns:1fr">
        <div class="v2-feed-card"><div class="v2-feed-label">FEEDING MODE</div>
          <div class="v2-feed-tactic">No water temp or air temp data. Cannot determine feeding mode.</div>
        </div></div>`;
    }

    const isEst = (wtGauge==null || isNaN(wtGauge)) && wtEst!=null;
    const tempLine = wtEff!=null
      ? `water ${wtEff.toFixed(1)}°C ${isEst?'<span class="est">(est. from air temp)</span>':'<span class="live">(live gauge)</span>'}`
      : 'temp unavailable';

    return `<div class="v2-feed-row">
      <div class="v2-feed-card ${mode?mode.key:''}">
        <div class="v2-feed-label">${mode?mode.icon:''} FEEDING MODE</div>
        <div class="v2-feed-name">${mode?mode.name:'UNKNOWN'}</div>
        <div class="v2-feed-temp">${tempLine}</div>
        <div class="v2-feed-tactic">${mode?`<b>${mode.method}.</b> ${mode.tactic}`:'No mode available'}</div>
      </div>
      <div class="v2-feed-card">
        <div class="v2-feed-label">🪰 DRY FLY SWITCH</div>
        <div class="v2-dry-pill v2-dry-${dryFly.state}">${dryFly.label}</div>
        <div class="v2-feed-tactic" style="margin-top:6px">${dryFly.advice}</div>
      </div>
    </div>`;
  }

  // ── Inject panel into each station card ─────────────────────────
  function injectIntoCard(card){
    if(card.dataset.v2Injected) return;
    const cardId = card.id || '';
    if(!cardId.startsWith('card-')) return;
    const uid = cardId.substring(5);
    const cardData = window._cardData?.[uid];
    if(!cardData) return; // not ready yet
    const body = card.querySelector('.card-body');
    if(!body) return;
    // Find insertion point — after the AI verdict slot, before the gauge
    const aiSlot = body.querySelector(`#ai-verdict-${uid}`);
    const panel = document.createElement('div');
    panel.className = 'v2-feed-wrap';
    panel.innerHTML = buildPanelHTML(cardData);
    if(aiSlot && aiSlot.nextSibling){
      body.insertBefore(panel, aiSlot.nextSibling);
    } else {
      body.insertBefore(panel, body.firstChild);
    }
    card.dataset.v2Injected = '1';
  }

  function injectAll(){
    document.querySelectorAll('.station-card').forEach(injectIntoCard);
  }

  // ── Watch for new cards rendered ────────────────────────────────
  function init(){
    addV2Badge();
    injectAll();
    const grid = document.getElementById('stations-grid');
    if(!grid) return;
    const obs = new MutationObserver(()=>{
      // Wait a tick for window._cardData to populate
      setTimeout(injectAll, 50);
    });
    obs.observe(grid, { childList:true, subtree:true });
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
