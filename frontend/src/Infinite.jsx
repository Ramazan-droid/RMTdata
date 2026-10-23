import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchItems } from './api.js';
import { useTracker } from './tracker.js';
import ItemCard from './ItemCard.jsx';

export default function Infinite() {
  const tracker = useTracker('infinite');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [more, setMore] = useState(true);
  const page = useRef(1);
  const busy = useRef(false);
  const sentinel = useRef(null);

  const loadNext = useCallback(async () => {
    if (busy.current) return;
    busy.current = true; setLoading(true);
    const p = page.current;
    const { data, ms } = await fetchItems(p, 'infinite');
    tracker.current?.load(ms);
    if (p > 1) tracker.current?.event('load_more');
    page.current = p + 1;
    setItems((prev) => [...prev, ...data.items]);
    setMore(data.hasMore);
    setLoading(false); busy.current = false;
  }, []);

  // re-observe after every append so a still-visible sentinel keeps loading
  useEffect(() => {
    if (!more || !sentinel.current) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && loadNext(), { rootMargin: '300px' });
    io.observe(sentinel.current);
    return () => io.disconnect();
  }, [items.length, more, loadNext]);

  return (
    <section>
      <div className="grid">
        {items.map((it) => (
          <ItemCard key={it.id} item={it} onSeen={(id) => tracker.current?.seen(id)} onClick={(p) => tracker.current?.click(p)} />
        ))}
      </div>
      <div ref={sentinel} className="end">
        {loading ? 'Loading more missions…' : more ? '' : `You have reached the end of the archive (${items.length} missions).`}
      </div>
    </section>
  );
}
