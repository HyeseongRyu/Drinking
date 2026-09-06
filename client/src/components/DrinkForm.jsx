import { useEffect, useMemo, useRef, useState } from 'react';
import RatingInput from './RatingInput.jsx';

function initialRatingsFor(config, existing) {
  const result = {};
  for (const c of config.criteria) {
    result[c.key] = existing?.[c.key] || 0;
  }
  return result;
}

export default function DrinkForm({ categories, initial, onSubmit, onCancel, submitting, errorMessage }) {
  const isEdit = !!initial;
  const [name, setName] = useState(initial?.name || '');
  const [category, setCategory] = useState(initial?.category || Object.keys(categories)[0]);
  const [memo, setMemo] = useState(initial?.memo || '');
  const [photoFile, setPhotoFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(initial?.photoUrl || null);
  const fileInputRef = useRef(null);

  const config = categories[category];
  const [ratings, setRatings] = useState(() => initialRatingsFor(config, initial?.ratings));

  useEffect(() => {
    // 카테고리가 바뀌면 해당 종류의 항목으로 초기화 (수정 중 카테고리 변경 대비)
    setRatings((prev) => {
      const next = {};
      for (const c of categories[category].criteria) {
        next[c.key] = prev[c.key] || 0;
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  const overallPreview = useMemo(() => {
    const values = config.criteria.map((c) => ratings[c.key] || 0);
    if (values.some((v) => v === 0)) return null;
    return (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1);
  }, [config, ratings]);

  const allRated = config.criteria.every((c) => ratings[c.key] >= 1);
  const canSubmit = name.trim().length > 0 && allRated && !submitting;

  function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit({ name: name.trim(), category, memo, ratings, photoFile });
  }

  return (
    <form className="drink-form" onSubmit={handleSubmit}>
      <div
        className="photo-picker"
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
      >
        {previewUrl ? (
          <img src={previewUrl} alt="미리보기" />
        ) : (
          <div className="photo-picker-placeholder">
            <span className="photo-picker-icon">📷</span>
            <span>사진 추가</span>
          </div>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={handlePhotoChange}
      />

      <label className="field">
        <span className="field-label">술 이름</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="예: 곰표 밀맥주"
          maxLength={80}
          required
        />
      </label>

      <div className="field">
        <span className="field-label">종류</span>
        <div className="category-picker">
          {Object.entries(categories).map(([key, c]) => (
            <button
              type="button"
              key={key}
              className={`chip ${category === key ? 'active' : ''}`}
              onClick={() => setCategory(key)}
            >
              {c.emoji} {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <span className="field-label">평가 항목</span>
        <div className="rating-group">
          {config.criteria.map((c) => (
            <RatingInput
              key={c.key}
              label={c.label}
              value={ratings[c.key] || 0}
              onChange={(v) => setRatings((prev) => ({ ...prev, [c.key]: v }))}
            />
          ))}
        </div>
        <div className="overall-preview">
          총 평점: <strong>{overallPreview ?? '- '}</strong> / 5
        </div>
      </div>

      <label className="field">
        <span className="field-label">시음 메모 (선택)</span>
        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="맛, 향, 함께 먹은 안주 등을 자유롭게 기록해보세요"
          rows={3}
          maxLength={500}
        />
      </label>

      {errorMessage && <p className="form-error">{errorMessage}</p>}

      <div className="form-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          취소
        </button>
        <button type="submit" className="btn btn-primary" disabled={!canSubmit}>
          {submitting ? '저장 중...' : isEdit ? '수정하기' : '기록하기'}
        </button>
      </div>
    </form>
  );
}
