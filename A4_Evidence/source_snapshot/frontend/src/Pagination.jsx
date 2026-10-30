import { useEffect, useState } from 'react';
import { fetchItems } from './api.js';
import { useTracker } from './tracker.js';
import ItemCard from './ItemCard.jsx';

export default function Pagination() {
  const tracker = useTracker('pagination');
  const [page, setPage] = useState(1);
  const [res, setRes] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    setLoading(true);
    fetchItems(page, 'pagination').then(({ data, ms }) => {
      if (!live) return;
      setRes(data); setLoading(false);
      tracker.current?.load(ms);
      window.scrollTo({ top: 0 });
    });
    return () => { live = false; };
  }, [page]);

  const go = (p) => { tracker.current?.event('page_change'); setPage(p); };
  const pages = res ? Math.ceil(res.total / res.limit) : 1;
  const nums = [...new Set([1, page - 1, page, page + 1, pages])].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);

  return (
    <section>
      <div className={'grid' + (loading ? ' dim' : '')}>
        {res?.items.map((it) => (
          <ItemCard key={it.id} item={it} onSeen={(id) => tracker.current?.seen(id)} onClick={(p) => tracker.current?.click(p)} />
        ))}
      </div>
      <nav className="pager" aria-label="Pages">
        <button disabled={page === 1} onClick={() => go(page - 1)}>Previous</button>
        {nums.map((n) => (
          <button key={n} className={n === page ? 'on' : ''} aria-current={n === page} onClick={() => go(n)}>{n}</button>
        ))}
        <button disabled={page === pages} onClick={() => go(page + 1)}>Next</button>
      </nav>
    </section>
  );
}
