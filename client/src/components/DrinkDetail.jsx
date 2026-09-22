import { useState } from 'react';
import StarDisplay from './StarDisplay.jsx';

export default function DrinkDetail({ drink, categoryConfig, onBack, onEdit, onDelete, onToggleFavorite }) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const date = new Date(drink.createdAt).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="drink-detail">
      <div className="drink-detail-photo">
        {drink.photoUrl ? (
          <img src={drink.photoUrl} alt={drink.name} />
        ) : (
          <span className="drink-detail-emoji">{categoryConfig?.emoji}</span>
        )}
        <button
          type="button"
          className={`favorite-btn large ${drink.isFavorite ? 'active' : ''}`}
          aria-label={drink.isFavorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
          onClick={() => onToggleFavorite(drink.id)}
        >
          {drink.isFavorite ? '♥' : '♡'}
        </button>
      </div>

      <div className="drink-detail-body">
        <span className="drink-card-category">
          {categoryConfig?.emoji} {categoryConfig?.label}
        </span>
        <h2 className="drink-detail-name">{drink.name}</h2>
        <p className="drink-detail-date">{date} 기록</p>

        <div className="overall-score-block">
          <StarDisplay value={drink.overallScore} size="lg" />
          <span className="overall-score-num">{drink.overallScore.toFixed(1)}</span>
        </div>

        <div className="criteria-list">
          {categoryConfig.criteria.map((c) => (
            <div key={c.key} className="criteria-row">
              <span className="criteria-label">{c.label}</span>
              <StarDisplay value={drink.ratings[c.key] || 0} size="sm" />
            </div>
          ))}
        </div>

        {drink.description && (
          <div className="drink-memo">
            <span className="field-label">설명</span>
            <p>{drink.description}</p>
          </div>
        )}

        {drink.memo && (
          <div className="drink-memo">
            <span className="field-label">시음 메모</span>
            <p>{drink.memo}</p>
          </div>
        )}

        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onBack}>
            목록으로
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => onEdit(drink)}>
            수정
          </button>
          {confirmingDelete ? (
            <button type="button" className="btn btn-danger" onClick={() => onDelete(drink.id)}>
              정말 삭제할까요?
            </button>
          ) : (
            <button type="button" className="btn btn-danger-outline" onClick={() => setConfirmingDelete(true)}>
              삭제
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
