import { useEffect, useRef } from 'react';

// Sends behaviour events to the backend, which turns them into Prometheus metrics.
function createTracker(mode) {
  const start = performance.now();
  const s = { seen: new Set(), clicks: 0, loads: 0, firstClick: false, ended: false };
  const send = (type, value = 0, extra = {}) =>
    navigator.sendBeacon('/api/events', new Blob([JSON.stringify({ mode, type, value, ...extra })], { type: 'application/json' }));
  send('session_start');
  return {
    seen: (id) => s.seen.add(id),
    load: (ms) => { s.loads++; send('load', ms / 1000); },
    event: (type) => send(type),
    click: (position) => {
      s.clicks++;
      send('item_click', position);
      if (!s.firstClick) { s.firstClick = true; send('first_click', (performance.now() - start) / 1000); }
    },
    end: () => {
      if (s.ended) return;
      s.ended = true;
      send('session_end', (performance.now() - start) / 1000, { seen: s.seen.size, clicks: s.clicks, loads: s.loads });
    },
  };
}

export function useTracker(mode) {
  const ref = useRef(null);
  useEffect(() => {
    const t = createTracker(mode);
    ref.current = t;
    window.addEventListener('pagehide', t.end);
    return () => { window.removeEventListener('pagehide', t.end); t.end(); };
  }, [mode]);
  return ref;
}
