export default function Header({ view, onBack, onAdd }) {
  const titles = {
    list: '🍻 드링킹 아카이브',
    form: '기록하기',
    editForm: '기록 수정',
    detail: '상세 보기',
  };

  return (
    <header className="app-header">
      {view !== 'list' ? (
        <button type="button" className="header-back" onClick={onBack} aria-label="뒤로가기">
          ←
        </button>
      ) : (
        <span className="header-spacer" />
      )}
      <h1>{titles[view] || '드링킹 아카이브'}</h1>
      {view === 'list' ? (
        <button type="button" className="header-add" onClick={onAdd} aria-label="새 기록 추가">
          +
        </button>
      ) : (
        <span className="header-spacer" />
      )}
    </header>
  );
}
