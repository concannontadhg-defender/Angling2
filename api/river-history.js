'use strict';
const { fetchText } = require('./_shared');
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { id, sensor } = req.query;
  if (!id || !sensor) return res.status(400).json({ error: 'id and sensor required' });
  try {
    const text = await fetchText(`https://waterlevel.ie/data/week/${id}_${sensor}.csv`);
    res.setHeader('Content-Type', 'text/plain');
    return res.send(text);
  } catch (e) { return res.status(502).json({ error: e.message }); }
};
