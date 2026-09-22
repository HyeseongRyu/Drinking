async function handleJson(res) {
  if (!res.ok) {
    let message = '요청 처리 중 오류가 발생했습니다.';
    try {
      const data = await res.json();
      message = data.error || message;
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }
  return res.json();
}

export async function fetchCategories() {
  const res = await fetch('/api/categories');
  return handleJson(res);
}

export async function fetchDrinks({ category, favoritesOnly } = {}) {
  const params = new URLSearchParams();
  if (category && category !== 'all') params.set('category', category);
  if (favoritesOnly) params.set('favorite', 'true');
  const res = await fetch(`/api/drinks?${params.toString()}`);
  return handleJson(res);
}

export async function fetchDrink(id) {
  const res = await fetch(`/api/drinks/${id}`);
  return handleJson(res);
}

function buildFormData({ name, category, memo, description, ratings, photoFile }) {
  const fd = new FormData();
  if (name !== undefined) fd.set('name', name);
  if (category !== undefined) fd.set('category', category);
  if (memo !== undefined) fd.set('memo', memo);
  if (description !== undefined) fd.set('description', description);
  if (ratings !== undefined) fd.set('ratings', JSON.stringify(ratings));
  if (photoFile) fd.set('photo', photoFile);
  return fd;
}

export async function fetchAnalyzeStatus() {
  const res = await fetch('/api/analyze/status');
  return handleJson(res);
}

export async function analyzePhoto(photoFile, hint) {
  const fd = new FormData();
  fd.set('photo', photoFile);
  if (hint) fd.set('hint', hint);
  const res = await fetch('/api/analyze', { method: 'POST', body: fd });
  return handleJson(res);
}

export async function createDrink(payload) {
  const res = await fetch('/api/drinks', { method: 'POST', body: buildFormData(payload) });
  return handleJson(res);
}

export async function updateDrink(id, payload) {
  const res = await fetch(`/api/drinks/${id}`, { method: 'PATCH', body: buildFormData(payload) });
  return handleJson(res);
}

export async function toggleFavorite(id) {
  const res = await fetch(`/api/drinks/${id}/favorite`, { method: 'PATCH' });
  return handleJson(res);
}

export async function deleteDrink(id) {
  const res = await fetch(`/api/drinks/${id}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 204) {
    throw new Error('삭제 중 오류가 발생했습니다.');
  }
}
