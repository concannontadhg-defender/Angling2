'use strict';
import { fetchJSON, fetchText, IS_CLOUD } from './_shared.js';
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const s = { server:'running', time:new Date().toISOString(), cloud:IS_CLOUD, node:process.version };
  try { await fetchJSON('https://api.open-meteo.com/v1/forecast?latitude=51.74&longitude=-8.73&hourly=pressure_msl&timezone=Europe%2FDublin&past_days=0&forecast_days=1'); s.openMeteo='OK'; }
  catch(e) { s.openMeteo=`FAIL: ${e.message}`; }
  try { await fetchText('https://waterlevel.ie/data/day/20001_0001.csv'); s.opw='OK'; }
  catch(e) { s.opw=`FAIL: ${e.message}`; }
  return res.json(s);
};
