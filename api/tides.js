'use strict';
const { PORTS, tideEvents } = require('./_shared');
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const loc = (req.query.loc || '').toLowerCase();
  if (!PORTS[loc]) return res.status(404).json({ error: `Unknown port: ${loc}` });
  const midnight = new Date(); midnight.setHours(0,0,0,0);
  const events   = tideEvents(loc, midnight.getTime());
  const upcoming = events.filter(e => new Date(e.time).getTime() >= Date.now()-20*60000).slice(0,12);
  const todayStr = new Date().toDateString(), tomStr = new Date(Date.now()+86400000).toDateString();
  const grouped  = {};
  for (const ev of events) {
    const d = new Date(ev.time);
    let lbl = d.toDateString();
    if (lbl===todayStr) lbl='Today';
    else if (lbl===tomStr) lbl='Tomorrow';
    else lbl = d.toLocaleDateString('en-IE',{weekday:'short',month:'short',day:'numeric'});
    if (!grouped[lbl]) grouped[lbl]=[];
    grouped[lbl].push(ev);
  }
  return res.json({ port:loc, source:'harmonic (Admiralty)', grouped, upcoming });
};
