export async function fetchItems(page, mode, limit = 12) {
  const t0 = performance.now();
  const r = await fetch(`/api/items?page=${page}&limit=${limit}&mode=${mode}`);
  const data = await r.json();
  return { data, ms: performance.now() - t0 };
}
