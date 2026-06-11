/**
 * Shared utilities – native fetch only (Node 18+, built-in on Vercel).
 * Zero npm dependencies.
 */
const IS_CLOUD = !!(
  process.env.VERCEL || process.env.RAILWAY_ENVIRONMENT ||
  process.env.RENDER || process.env.FLY_APP_NAME || process.env.DISABLE_TLS_BYPASS
);
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

async function fetchRetry(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, {
        signal:  AbortSignal.timeout(12000),
        headers: { 'User-Agent': UA }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res;
    } catch (err) {
      if (i === tries - 1) throw err;
      await new Promise(r => setTimeout(r, 500 * (i + 1)));
    }
  }
}

async function fetchJSON(url, tries = 3) {
  return (await fetchRetry(url, tries)).json();
}

async function fetchText(url, tries = 3) {
  return (await fetchRetry(url, tries)).text();
}

// ── Harmonic tide constants ───────────────────────────────────────
const DEG   = Math.PI / 180;
const EPOCH = Date.UTC(2000, 0, 1, 0, 0, 0);
const PORTS = {
  kinsale: { Z0:2.00, c:[[28.9841042,1.720,154.0,136.5],[30.0,0.590,178.0,0],[28.4397295,0.340,131.0,8.1],[15.0410686,0.078,320.0,190.0],[13.9430356,0.050,294.0,306.6],[30.0821373,0.160,181.0,0]] },
  cork:    { Z0:2.10, c:[[28.9841042,1.823,156.2,136.5],[30.0,0.626,180.6,0],[28.4397295,0.361,133.9,8.1],[15.0410686,0.082,322.0,190.0],[13.9430356,0.054,296.0,306.6],[30.0821373,0.169,183.7,0]] },
  youghal: { Z0:2.05, c:[[28.9841042,1.750,155.0,136.5],[30.0,0.600,179.0,0],[28.4397295,0.350,132.0,8.1],[15.0410686,0.080,321.0,190.0],[13.9430356,0.052,295.0,306.6],[30.0821373,0.163,182.0,0]] }
};

function tideAt(k, ms) {
  const p = PORTS[k]; if (!p) return 0;
  const tH = (ms - EPOCH) / 3600000; let h = p.Z0;
  for (const [sp,H,g,V0] of p.c) { const ph=((V0+sp*tH-g)%360+360)%360; h+=H*Math.cos(ph*DEG); }
  return h;
}

function tideEvents(k, startMs, hours = 56) {
  const step=5*60000, end=startMs+hours*3600000, ev=[];
  let prev=tideAt(k,startMs-step), curr=tideAt(k,startMs);
  for (let t=startMs; t<=end; t+=step) {
    const next=tideAt(k,t+step);
    if (curr>prev&&curr>next) ev.push({type:'high',time:new Date(t).toISOString(),height:Math.round(curr*100)/100});
    else if (curr<prev&&curr<next) ev.push({type:'low',time:new Date(t).toISOString(),height:Math.round(curr*100)/100});
    prev=curr; curr=next;
  }
  return ev;
}

export { fetchJSON, fetchText, IS_CLOUD, PORTS, tideAt, tideEvents };