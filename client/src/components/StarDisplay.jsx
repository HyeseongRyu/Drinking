export default function StarDisplay({ value, max = 5, size = 'md' }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <span className={`star-display star-display-${size}`} aria-label={`${value.toFixed(1)} / ${max}`}>
      <span className="star-display-bg">{'★'.repeat(max)}</span>
      <span className="star-display-fg" style={{ width: `${pct}%` }}>
        {'★'.repeat(max)}
      </span>
    </span>
  );
}
