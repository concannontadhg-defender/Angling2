'use strict';
import { fetchJSON } from './_shared.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { lat, lon } = req.query;
  if (!lat || !lon) return res.status(400).json({ error: 'lat/lon required' });

  try {
    const url = 'https://api.open-meteo.com/v1/forecast'
      + `?latitude=${lat}&longitude=${lon}`
      + '&hourly=pressure_msl,wind_speed_10m,wind_gusts_10m,wind_direction_10m,precipitation,temperature_2m,cloud_cover'
      + '&daily=sunrise,sunset,precipitation_sum,wind_speed_10m_max,wind_gusts_10m_max,temperature_2m_max,temperature_2m_min,weathercode'
      + '&timezone=Europe%2FDublin&wind_speed_unit=kmh&precipitation_unit=mm&past_days=1&forecast_days=10';
    const data = await fetchJSON(url);
    if (!data?.hourly || !data?.daily) throw new Error('incomplete');
    return res.json({ source: 'open-meteo', data });
  } catch (e) { console.error('[WX] Open-Meteo:', e.message); }

  try {
    const data = await fetchJSON(`https://wttr.in/?lat=${lat}&lon=${lon}&format=j1`);
    if (!data?.current_condition) throw new Error('bad wttr');
    return res.json({ source: 'wttr', data });
  } catch (e) { console.error('[WX] wttr.in:', e.message); }

  return res.status(502).json({ error: 'All weather sources failed' });
};
