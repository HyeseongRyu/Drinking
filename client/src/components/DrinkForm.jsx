import { useEffect, useMemo, useRef, useState } from 'react';
import RatingInput from './RatingInput.jsx';
import { analyzePhoto, fetchAnalyzeStatus } from '../api.js';

function composeDescription(r) {
  const lines = [];
  if (r.type) lines.push(`종류: ${r.type}`);
  if (r.abv) lines.push(`도수: ${r.abv}`);
  if (r.origin) lines.push(`원산지: ${r.origin}`);
  if (r.priceRange) lines.push(`가격대: ${r.priceRange}`);
  if (r.history) lines.push(r.history);
  if (r.note) lines.push(`(${r.note})`);
  return lines.join('\n');
}

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
  const [description, setDescription] = useState(initial?.description || '');
  const [photoFile, setPhotoFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(initial?.photoUrl || null);
  const fileInputRef = useRef(null);

  const [aiAvailable, setAiAvailable] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  // 사용자가 직접 쓴 설명은 덮어쓰지 않기 위해 출처를 기억해둔다.
  const [descriptionFromAi, setDescriptionFromAi] = useState(false);
  // 기존 기록을 수정할 때는 이미 고른 분류를 AI가 바꾸지 않게 한다.
  const categoryPickedRef = useRef(isEdit);

  useEffect(() => {
    let cancelled = false;
    fetchAnalyzeStatus()
      .then((s) => { if (!cancelled) setAiAvailable(!!s.available); })
      .catch(() => { if (!cancelled) setAiAvailable(false); });
    return () => { cancelled = true; };
  }, []);

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
    setAiResult(null);
    setAiError(null);
    if (aiAvailable) runAnalysis(file);
  }

  async function runAnalysis(file) {
    const target = file || photoFile;
    if (!target) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const result = await analyzePhoto(target, name.trim());
      setAiResult(result);
      if (result.category && !categoryPickedRef.current) setCategory(result.category);
      const desc = composeDescription(result);
      setDescription((prev) => (desc && (!prev || descriptionFromAi) ? desc : prev));
      if (desc) setDescriptionFromAi(true);
    } catch (err) {
      setAiError(err.message);
    } finally {
      setAiLoading(false);
    }
  }

  function pickCandidate(candidate) {
    setName(candidate);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit({ name: name.trim(), category, memo, description, ratings, photoFile });
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
              onClick={() => { categoryPickedRef.current = true; setCategory(key); }}
            >
              {c.emoji} {c.label}
            </button>
          ))}
        </div>
      </div>


      {aiAvailable && (
        <div className="ai-panel">
          {aiLoading && <p className="ai-status">✨ 사진으로 어떤 술인지 찾고 있어요...</p>}

          {!aiLoading && aiError && (
            <>
              <p className="ai-status ai-error">{aiError}</p>
              <button type="button" className="btn ghost small" onClick={() => runAnalysis()}>
                다시 시도
              </button>
            </>
          )}

          {!aiLoading && !aiError && aiResult && (
            <>
              {aiResult.candidates.length > 0 ? (
                <div className="cand-block">
                  <span className="ai-label">이름 후보 <em>맞는 걸 눌러주세요</em></span>
                  <div className="cand-chips">
                    {aiResult.candidates.map((c, i) => (
                      <button
                        type="button"
                        key={c}
                        className={`cand-chip ${name.trim() === c ? 'active' : ''}`}
                        onClick={() => pickCandidate(c)}
                      >
                        <span>{c}</span>
                        {name.trim() === c ? <em>선택됨</em> : i === 0 ? <em>유력</em> : null}
                      </button>
                    ))}
                  </div>
                  <p className="ai-note">맞는 게 없으면 위 ‘술 이름’에 직접 적어주세요.</p>
                </div>
              ) : (
                <p className="ai-status">이름 후보를 찾지 못했어요. ‘술 이름’에 직접 적어주세요.</p>
              )}

              <dl className="ai-fields">
                {aiResult.type && <div><dt>종류</dt><dd>{aiResult.type}</dd></div>}
                {aiResult.abv && <div><dt>도수</dt><dd>{aiResult.abv}</dd></div>}
                {aiResult.origin && <div><dt>원산지</dt><dd>{aiResult.origin}</dd></div>}
                {aiResult.priceRange && <div><dt>가격대</dt><dd>{aiResult.priceRange}</dd></div>}
              </dl>
              {aiResult.history && <p className="ai-history">{aiResult.history}</p>}
              {aiResult.note && <p className="ai-note">{aiResult.note}</p>}
              <p className="ai-note">AI가 추정한 정보라 실제와 다를 수 있어요.</p>
              <button type="button" className="btn ghost small" onClick={() => runAnalysis()}>
                다시 찾기
              </button>
            </>
          )}

          {!aiLoading && !aiError && !aiResult && (
            <p className="ai-status">
              {photoFile ? '사진으로 이름을 찾아볼 수 있어요.' : '✨ 사진을 넣으면 이름 후보와 정보를 자동으로 찾아드려요.'}
              {photoFile && (
                <button type="button" className="btn ghost small" onClick={() => runAnalysis()}>
                  사진으로 찾기
                </button>
              )}
            </p>
          )}
        </div>
      )}

      <label className="field">
        <span className="field-label">
          설명 {aiAvailable && <em>(사진을 넣으면 AI가 자동으로 채워요)</em>}
        </span>
        <textarea
          value={description}
          onChange={(e) => { setDescription(e.target.value); setDescriptionFromAi(false); }}
          placeholder="종류, 도수, 원산지, 역사 등"
          rows={4}
          maxLength={600}
        />
      </label>

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
