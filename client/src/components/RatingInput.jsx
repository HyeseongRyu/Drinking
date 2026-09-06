export default function RatingInput({ label, value, onChange }) {
  return (
    <div className="rating-input">
      <span className="rating-input-label">{label}</span>
      <div className="rating-input-stars" role="radiogroup" aria-label={label}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n}점`}
            className={`star-btn ${value >= n ? 'filled' : ''}`}
            onClick={() => onChange(n)}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  );
}
