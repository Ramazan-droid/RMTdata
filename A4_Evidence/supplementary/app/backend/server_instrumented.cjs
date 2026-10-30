let a4seed=1;let a4logs=[];let a4run='pilot';Math.random=()=>{a4seed=(Math.imul(a4seed,1664525)+1013904223)>>>0;return a4seed/4294967296;};
const express = require('express');
const client = require('prom-client');

const app = express();
app.use(express.json());
client.collectDefaultMetrics();

const MODES = ['pagination', 'infinite'];
const modeOf = (v) => (MODES.includes(v) ? v : 'unknown');
const L = ['mode'];

// ---------- dataset: 500 imaginary space missions ----------
const A = ['Silent', 'Amber', 'Distant', 'Cobalt', 'Hollow', 'Rising', 'Frozen', 'Quiet', 'Burning', 'Lost'];
const N = ['Horizon', 'Lantern', 'Meridian', 'Voyager', 'Harbor', 'Comet', 'Anchor', 'Signal', 'Orchard', 'Beacon'];
const T = ['Lunar', 'Mars', 'Asteroid', 'Deep space', 'Orbital', 'Venus'];
const ITEMS = Array.from({ length: 500 }, (_, i) => ({
  id: i + 1,
  name: `${A[i % 10]} ${N[Math.floor(i / 10) % 10]}`,
  target: T[i % T.length],
  year: 1965 + (i * 7) % 62,
  crew: (i * 3) % 8,
  summary: `Mission ${i + 1} of the archive: a ${T[i % T.length].toLowerCase()} expedition with a crew of ${(i * 3) % 8}.`,
}));

// ---------- backend metrics ----------
const httpDur = new client.Histogram({ name: 'http_request_duration_seconds', help: 'HTTP latency', labelNames: ['method', 'route', 'status','mode'], buckets: [.01, .05, .1, .2, .3, .5, 1] });
const itemReqs = new client.Counter({ name: 'items_requests_total', help: 'Item list requests', labelNames: L });
const itemsServed = new client.Counter({ name: 'items_served_total', help: 'Items sent to clients', labelNames: L });
const bytesServed = new client.Counter({ name: 'items_response_bytes_total', help: 'Payload bytes of item responses', labelNames: L });

// ---------- UX metrics (reported by the browser) ----------
const events = new client.Counter({ name: 'ux_events_total', help: 'UX events', labelNames: ['mode', 'type'] });
const active = new client.Gauge({ name: 'ux_active_sessions', help: 'Open sessions', labelNames: L });
const loadLat = new client.Histogram({ name: 'ux_load_latency_seconds', help: 'Client-measured time to load a chunk of items', labelNames: L, buckets: [.05, .1, .2, .3, .5, 1, 2] });
const clickPos = new client.Histogram({ name: 'ux_click_position', help: 'Index (0-based) of the clicked item in the full list', labelNames: L, buckets: [5, 12, 24, 48, 96, 192, 384, 500] });
const firstClick = new client.Histogram({ name: 'ux_time_to_first_click_seconds', help: 'Seconds from page open to first item click', labelNames: L, buckets: [2, 5, 10, 20, 40, 80, 160] });
const sesDur = new client.Histogram({ name: 'ux_session_duration_seconds', help: 'Session length', labelNames: L, buckets: [5, 15, 30, 60, 120, 300, 600] });
const sesSeen = new client.Histogram({ name: 'ux_items_seen_per_session', help: 'Unique items that were >=50% visible', labelNames: L, buckets: [6, 12, 24, 48, 96, 192, 384, 500] });
const sesClicks = new client.Histogram({ name: 'ux_clicks_per_session', help: 'Item clicks per session', labelNames: L, buckets: [0, 1, 2, 3, 5, 8, 13] });
const sesLoads = new client.Histogram({ name: 'ux_loads_per_session', help: 'Data loads (pages / chunks) per session', labelNames: L, buckets: [1, 2, 3, 5, 8, 13, 21, 42] });
const EVENT_TYPES = ['session_start', 'load', 'item_click', 'first_click', 'session_end', 'page_change', 'load_more'];

app.use((req, res, next) => {
  const end = httpDur.startTimer();
  res.on('finish', () => end({ method: req.method, route: req.route?.path || req.path, status: res.statusCode,mode: modeOf(req.query.mode || req.body?.mode) }));
  next();
});


app.post('/a4/reset',(req,res)=>{a4seed=(Number(req.body.seed)||1)>>>0;a4run=String(req.body.run_id);a4logs=[];client.register.resetMetrics();res.json({run_id:a4run,seed:a4seed});});
app.get('/a4/logs',(_req,res)=>res.json(a4logs));
app.use((req,res,next)=>{const start=process.hrtime.bigint();if(req.path==='/api/items'){res.on('finish',()=>a4logs.push({run_id:a4run,mode:req.query.mode,page:Number(req.query.page),limit:Number(req.query.limit),status:res.statusCode,duration_ms:Number(process.hrtime.bigint()-start)/1e6}));}next();});

app.get('/api/items', (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 12));
  const mode = modeOf(req.query.mode);
  const delay = 50 + Math.random() * 200; // simulated DB latency
  setTimeout(() => {
    const items = ITEMS.slice((page - 1) * limit, page * limit);
    const body = JSON.stringify({ items, page, limit, total: ITEMS.length, hasMore: page * limit < ITEMS.length });
    itemReqs.inc({ mode });
    itemsServed.inc({ mode }, items.length);
    bytesServed.inc({ mode }, Buffer.byteLength(body));
    res.type('json').send(body);
  }, delay);
});

app.post('/api/events', (req, res) => {
  const { type, value = 0, seen = 0, clicks = 0, loads = 0 } = req.body || {};
  const mode = modeOf(req.body?.mode);
  const v = Number(value) || 0;
  if (mode === 'unknown' || !EVENT_TYPES.includes(type)) return res.sendStatus(400);
  events.inc({ mode, type });
  if (type === 'session_start') active.inc({ mode });
  if (type === 'load') loadLat.observe({ mode }, v);
  if (type === 'item_click') clickPos.observe({ mode }, v);
  if (type === 'first_click') firstClick.observe({ mode }, v);
  if (type === 'session_end') {
    active.dec({ mode });
    sesDur.observe({ mode }, v);
    sesSeen.observe({ mode }, Number(seen) || 0);
    sesClicks.observe({ mode }, Number(clicks) || 0);
    sesLoads.observe({ mode }, Number(loads) || 0);
  }
  res.sendStatus(204);
});

app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

app.listen(3001, () => console.log('backend on :3001'));
