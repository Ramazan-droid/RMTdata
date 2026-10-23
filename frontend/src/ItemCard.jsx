import { useEffect, useRef } from 'react';

export default function ItemCard({ item, onSeen, onClick }) {
  const el = useRef(null);
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { onSeen(item.id); io.disconnect(); }
    }, { threshold: 0.5 });
    io.observe(el.current);
    return () => io.disconnect();
  }, [item.id]);
  return (
    <button ref={el} className="card" onClick={() => onClick(item.id - 1)}>
      <span className="idx">#{item.id}</span>
      <strong>{item.name}</strong>
      <span>{item.target} · {item.year}</span>
      <small>{item.summary}</small>
    </button>
  );
}
