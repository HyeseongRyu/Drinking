import StarDisplay from './StarDisplay.jsx';

export default function DrinkCard({ drink, categoryConfig, onOpen, onToggleFavorite }) {
  return (
    <div className="drink-card" onClick={() => onOpen(drink.id)}>
      <div className="drink-card-photo">
        {drink.photoUrl ? (
          <img src={drink.photoUrl} alt={drink.name} loading="lazy" />
        ) : (
          <span className="drink-card-emoji">{categoryConfig?.emoji || '🍶'}</span>
        )}
        <button
          type="button"
          className={`favorite-btn ${drink.isFavorite ? 'active' : ''}`}
          aria-label={drink.isFavorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(drink.id);
          }}
        >
          {drink.isFavorite ? '♥' : '♡'}
        </button>
      </div>
      <div className="drink-card-body">
        <div className="drink-card-title-row">
          <span className="drink-card-category">
            {categoryConfig?.emoji} {categoryConfig?.label}
          </span>
        </div>
        <h3 className="drink-card-name">{drink.name}</h3>
        <div className="drink-card-score">
          <StarDisplay value={drink.overallScore} size="sm" />
          <span className="drink-card-score-num">{drink.overallScore.toFixed(1)}</span>
        </div>
      </div>
    </div>
  );
}
