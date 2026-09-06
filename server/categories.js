// 술 종류별 평가 항목 정의. 각 항목은 1~5점으로 평가하며,
// 총 평점(overallScore)은 해당 술 종류의 모든 항목 평균으로 계산한다.
export const CATEGORIES = {
  beer: {
    label: '맥주',
    emoji: '🍺',
    criteria: [
      { key: 'aroma', label: '향' },
      { key: 'carbonation', label: '탄산감' },
      { key: 'bitterness', label: '쓴맛' },
      { key: 'finish', label: '목넘김' },
    ],
  },
  makgeolli: {
    label: '막걸리',
    emoji: '🥛',
    criteria: [
      { key: 'sweetness', label: '단맛' },
      { key: 'acidity', label: '산미' },
      { key: 'carbonation', label: '탄산감' },
      { key: 'finish', label: '목넘김' },
    ],
  },
  wine: {
    label: '와인',
    emoji: '🍷',
    criteria: [
      { key: 'aroma', label: '향' },
      { key: 'acidity', label: '산미' },
      { key: 'body', label: '바디감' },
      { key: 'finish', label: '여운' },
    ],
  },
  whiskey: {
    label: '위스키',
    emoji: '🥃',
    criteria: [
      { key: 'aroma', label: '향' },
      { key: 'smokiness', label: '스모키함' },
      { key: 'warmth', label: '도수감' },
      { key: 'finish', label: '피니시' },
    ],
  },
  soju: {
    label: '소주',
    emoji: '🍶',
    criteria: [
      { key: 'smoothness', label: '부드러움' },
      { key: 'sweetness', label: '단맛' },
      { key: 'burn', label: '알코올감' },
      { key: 'finish', label: '목넘김' },
    ],
  },
  other: {
    label: '기타',
    emoji: '🍹',
    criteria: [
      { key: 'aroma', label: '향' },
      { key: 'taste', label: '맛' },
      { key: 'texture', label: '질감' },
      { key: 'finish', label: '여운' },
    ],
  },
};

export function isValidCategory(category) {
  return Object.prototype.hasOwnProperty.call(CATEGORIES, category);
}

export function computeOverallScore(category, ratings) {
  const config = CATEGORIES[category];
  const sum = config.criteria.reduce((acc, c) => acc + ratings[c.key], 0);
  return Math.round((sum / config.criteria.length) * 10) / 10;
}

export function validateRatings(category, ratings) {
  const config = CATEGORIES[category];
  if (!ratings || typeof ratings !== 'object') return '평점 정보가 없습니다.';
  for (const c of config.criteria) {
    const v = ratings[c.key];
    if (!Number.isInteger(v) || v < 1 || v > 5) {
      return `${c.label} 항목은 1~5점 사이의 정수여야 합니다.`;
    }
  }
  return null;
}
