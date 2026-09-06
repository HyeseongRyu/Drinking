import { useEffect, useState } from 'react';
import Header from './components/Header.jsx';
import FilterBar from './components/FilterBar.jsx';
import DrinkCard from './components/DrinkCard.jsx';
import DrinkForm from './components/DrinkForm.jsx';
import DrinkDetail from './components/DrinkDetail.jsx';
import {
  fetchCategories,
  fetchDrinks,
  fetchDrink,
  createDrink,
  updateDrink,
  toggleFavorite,
  deleteDrink,
} from './api.js';

export default function App() {
  const [categories, setCategories] = useState(null);
  const [drinks, setDrinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [filterCategory, setFilterCategory] = useState('all');
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  const [view, setView] = useState('list'); // list | form | editForm | detail
  const [selectedDrink, setSelectedDrink] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    fetchCategories()
      .then(setCategories)
      .catch((err) => setLoadError(err.message));
  }, []);

  useEffect(() => {
    if (!categories) return;
    reloadDrinks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories, filterCategory, favoritesOnly]);

  // 화면 전환 시 이전 화면의 스크롤 위치가 남아 상세/폼이 잘려 보이는 것 방지
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);

  function reloadDrinks() {
    setLoading(true);
    fetchDrinks({ category: filterCategory, favoritesOnly })
      .then((data) => {
        setDrinks(data);
        setLoadError(null);
      })
      .catch((err) => setLoadError(err.message))
      .finally(() => setLoading(false));
  }

  async function handleToggleFavorite(id) {
    try {
      const updated = await toggleFavorite(id);
      setDrinks((prev) => prev.map((d) => (d.id === id ? updated : d)));
      setSelectedDrink((prev) => (prev && prev.id === id ? updated : prev));
    } catch (err) {
      alert(err.message);
    }
  }

  function openAddForm() {
    setFormError(null);
    setSelectedDrink(null);
    setView('form');
  }

  function openEditForm(drink) {
    setFormError(null);
    setSelectedDrink(drink);
    setView('editForm');
  }

  async function openDetail(id) {
    try {
      const drink = await fetchDrink(id);
      setSelectedDrink(drink);
      setView('detail');
    } catch (err) {
      alert(err.message);
    }
  }

  function backToList() {
    setSelectedDrink(null);
    setView('list');
    reloadDrinks();
  }

  async function handleCreate(payload) {
    setSubmitting(true);
    setFormError(null);
    try {
      await createDrink(payload);
      backToList();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate(payload) {
    setSubmitting(true);
    setFormError(null);
    try {
      const updated = await updateDrink(selectedDrink.id, payload);
      setSelectedDrink(updated);
      setView('detail');
      reloadDrinks();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    try {
      await deleteDrink(id);
      backToList();
    } catch (err) {
      alert(err.message);
    }
  }

  if (loadError && !categories) {
    return (
      <div className="app-shell">
        <div className="error-screen">
          <p>서버에 연결할 수 없어요 🥲</p>
          <p className="error-detail">{loadError}</p>
        </div>
      </div>
    );
  }

  if (!categories) {
    return (
      <div className="app-shell">
        <div className="loading-screen">불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Header
        view={view}
        onBack={view === 'detail' ? backToList : () => setView(view === 'editForm' ? 'detail' : 'list')}
        onAdd={openAddForm}
      />

      <main className="app-main">
        {view === 'list' && (
          <>
            <FilterBar
              categories={categories}
              filterCategory={filterCategory}
              onFilterCategory={setFilterCategory}
              favoritesOnly={favoritesOnly}
              onToggleFavoritesOnly={setFavoritesOnly}
            />

            {loading ? (
              <div className="loading-screen">불러오는 중...</div>
            ) : drinks.length === 0 ? (
              <div className="empty-state">
                <p className="empty-emoji">🍻</p>
                <p>아직 기록이 없어요.</p>
                <p>오늘 마신 술을 기록해보세요!</p>
              </div>
            ) : (
              <div className="drink-grid">
                {drinks.map((drink) => (
                  <DrinkCard
                    key={drink.id}
                    drink={drink}
                    categoryConfig={categories[drink.category]}
                    onOpen={openDetail}
                    onToggleFavorite={handleToggleFavorite}
                  />
                ))}
              </div>
            )}

            <button type="button" className="fab" onClick={openAddForm} aria-label="새 기록 추가">
              +
            </button>
          </>
        )}

        {view === 'form' && (
          <DrinkForm
            categories={categories}
            onSubmit={handleCreate}
            onCancel={() => setView('list')}
            submitting={submitting}
            errorMessage={formError}
          />
        )}

        {view === 'editForm' && selectedDrink && (
          <DrinkForm
            categories={categories}
            initial={selectedDrink}
            onSubmit={handleUpdate}
            onCancel={() => setView('detail')}
            submitting={submitting}
            errorMessage={formError}
          />
        )}

        {view === 'detail' && selectedDrink && (
          <DrinkDetail
            drink={selectedDrink}
            categoryConfig={categories[selectedDrink.category]}
            onBack={backToList}
            onEdit={openEditForm}
            onDelete={handleDelete}
            onToggleFavorite={handleToggleFavorite}
          />
        )}
      </main>
    </div>
  );
}
