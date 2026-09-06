export default function FilterBar({ categories, filterCategory, onFilterCategory, favoritesOnly, onToggleFavoritesOnly }) {
  return (
    <div className="filter-bar">
      <div className="filter-chips">
        <button
          type="button"
          className={`chip ${filterCategory === 'all' ? 'active' : ''}`}
          onClick={() => onFilterCategory('all')}
        >
          전체
        </button>
        {Object.entries(categories).map(([key, config]) => (
          <button
            key={key}
            type="button"
            className={`chip ${filterCategory === key ? 'active' : ''}`}
            onClick={() => onFilterCategory(key)}
          >
            {config.emoji} {config.label}
          </button>
        ))}
      </div>
      <label className="favorites-toggle">
        <input type="checkbox" checked={favoritesOnly} onChange={(e) => onToggleFavoritesOnly(e.target.checked)} />
        <span>♥ 즐겨찾기만</span>
      </label>
    </div>
  );
}
