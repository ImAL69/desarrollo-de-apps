import { useEffect, useMemo, useState } from 'react';

type Episode = {
  id: number;
  name: string;
  air_date: string;
  episode: string;
  characters: string[];
  url: string;
  created: string;
};

type ApiResponse = {
  info: { count: number; pages: number; next: string | null; prev: string | null };
  results: Episode[];
};

type Character = { id: number; name: string; image: string; status: string; species: string };

const API = 'https://rickandmortyapi.com/api';
const seasonOptions = ['Todas', 'Temporada 1', 'Temporada 2', 'Temporada 3', 'Temporada 4', 'Temporada 5', 'Temporada 6', 'Temporada 7'];

const getSeason = (code: string) => Number(code.match(/\d+/)?.[0] ?? 0);

function App() {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEpisodes, setTotalEpisodes] = useState(0);
  const [query, setQuery] = useState('');
  const [season, setSeason] = useState('Todas');
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [reloadToken, setReloadToken] = useState(0);
  const [selected, setSelected] = useState<Episode | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loadingCharacters, setLoadingCharacters] = useState(false);
  const [favorites, setFavorites] = useState<number[]>(() => JSON.parse(localStorage.getItem('rick-favorites') ?? '[]'));
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setStatus('loading');
    setError('');
    fetch(`${API}/episode?page=${page}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('No se pudo conectar con el multiverso.');
        return response.json() as Promise<ApiResponse>;
      })
      .then((data) => {
        setEpisodes(data.results);
        setTotalPages(data.info.pages);
        setTotalEpisodes(data.info.count);
        setStatus('ready');
      })
      .catch((cause: Error) => {
        if (cause.name !== 'AbortError') {
          setError(cause.message);
          setStatus('error');
        }
      });
    return () => controller.abort();
  }, [page, reloadToken]);

  useEffect(() => localStorage.setItem('rick-favorites', JSON.stringify(favorites)), [favorites]);

  const visibleEpisodes = useMemo(() => episodes.filter((episode) => {
    const matchesQuery = `${episode.name} ${episode.episode} ${episode.air_date}`.toLowerCase().includes(query.toLowerCase());
    const matchesSeason = season === 'Todas' || getSeason(episode.episode) === Number(season.split(' ')[1]);
    const matchesFavorites = !onlyFavorites || favorites.includes(episode.id);
    return matchesQuery && matchesSeason && matchesFavorites;
  }), [episodes, favorites, onlyFavorites, query, season]);

  const toggleFavorite = (id: number) => {
    setFavorites((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const openEpisode = async (episode: Episode) => {
    setSelected(episode);
    setCharacters([]);
    setLoadingCharacters(true);
    try {
      const selectedCharacters = await Promise.all(
        episode.characters.slice(0, 8).map((url) => fetch(url).then((response) => response.json() as Promise<Character>)),
      );
      setCharacters(selectedCharacters);
    } catch {
      setCharacters([]);
    } finally {
      setLoadingCharacters(false);
    }
  };

  const retry = () => setReloadToken((current) => current + 1);

  return (
    <div className="app">
      <div className="noise" />
      <header className="topbar">
        <a className="logo" href="#inicio" aria-label="Portal Interdimensional">
          <span className="logo-orb">✦</span>
          <span>PORTAL<span className="logo-accent">.404</span></span>
        </a>
        <nav className="nav">
          <a href="#episodios">Episodios</a>
          <a href="#universo">El universo</a>
          <button className="nav-favorites" onClick={() => setOnlyFavorites((current) => !current)}>
            ★ {favorites.length} favoritos
          </button>
        </nav>
      </header>

      <main id="inicio">
        <section className="hero">
          <div className="hero-copy">
            <p className="kicker"><span className="pulse" /> BASE DE DATOS INTERDIMENSIONAL</p>
            <h1>Wubba<br /><em>Lubba</em><br />Dub-Dub!</h1>
            <p className="hero-text">Explora cada misión, planeta y desastre familiar del multiverso de Rick y Morty.</p>
            <a className="hero-button" href="#episodios">Entrar al archivo <span>↗</span></a>
          </div>
          <div className="hero-visual" aria-hidden="true">
            <div className="planet planet-one" />
            <div className="planet planet-two" />
            <div className="portal-ring"><div className="portal-core">R<br /><small>&amp; M</small></div></div>
            <div className="orbit orbit-one" /><div className="orbit orbit-two" />
            <span className="float-tag tag-top">C-137</span>
            <span className="float-tag tag-bottom">DIMENSIÓN<br />DESCONOCIDA</span>
          </div>
        </section>

        <section className="stats" id="universo">
          <div><strong>{totalEpisodes || '—'}</strong><span>episodios archivados</span></div>
          <div><strong>∞</strong><span>dimensiones posibles</span></div>
          <div><strong>{favorites.length}</strong><span>misiones guardadas</span></div>
          <div><strong>100%</strong><span>ciencia cuestionable</span></div>
        </section>

        <section className="archive" id="episodios">
          <div className="section-heading">
            <div>
              <p className="kicker">ARCHIVO DE AVENTURAS · PÁGINA {page}</p>
              <h2>Episodios del multiverso</h2>
            </div>
            <p className="section-note">Selecciona una tarjeta para ver su ficha completa.</p>
          </div>

          <div className="filters">
            <label className="search-box">
              <span>⌕</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar episodio, código o fecha..." />
            </label>
            <div className="select-wrap">
              <select value={season} onChange={(event) => setSeason(event.target.value)} aria-label="Filtrar por temporada">
                {seasonOptions.map((item) => <option key={item}>{item}</option>)}
              </select>
              <span>⌄</span>
            </div>
            <button className={`filter-button ${onlyFavorites ? 'active' : ''}`} onClick={() => setOnlyFavorites((current) => !current)}>
              ★ Solo favoritos
            </button>
          </div>

          {status === 'loading' && <div className="loading-grid">{[1, 2, 3, 4, 5, 6].map((item) => <div className="skeleton" key={item} />)}</div>}
          {status === 'error' && <div className="message"><span>☄</span><h3>El portal se desestabilizó</h3><p>{error}</p><button onClick={retry}>Reintentar conexión</button></div>}
          {status === 'ready' && visibleEpisodes.length === 0 && <div className="message"><span>∅</span><h3>No encontramos esa aventura</h3><p>Prueba con otra búsqueda o desactiva el filtro de favoritos.</p></div>}
          {status === 'ready' && visibleEpisodes.length > 0 && (
            <div className="episode-grid">
              {visibleEpisodes.map((episode, index) => (
                <article className="episode-card" key={episode.id} style={{ '--delay': `${index * 50}ms` } as React.CSSProperties} onClick={() => openEpisode(episode)}>
                  <div className="card-top"><span className="episode-code">{episode.episode}</span><button className={`favorite ${favorites.includes(episode.id) ? 'saved' : ''}`} onClick={(event) => { event.stopPropagation(); toggleFavorite(episode.id); }} aria-label="Guardar episodio">{favorites.includes(episode.id) ? '★' : '☆'}</button></div>
                  <div className="card-art"><span>{String(episode.id).padStart(2, '0')}</span><i /></div>
                  <div className="card-content"><p className="air-date">{episode.air_date}</p><h3>{episode.name}</h3><span className="details-link">Ver detalles <b>↗</b></span></div>
                </article>
              ))}
            </div>
          )}

          <div className="pagination">
            <button disabled={page === 1 || status === 'loading'} onClick={() => setPage((current) => current - 1)}>← Anterior</button>
            <span><b>{String(page).padStart(2, '0')}</b> / {String(totalPages).padStart(2, '0')}</span>
            <button disabled={page === totalPages || status === 'loading'} onClick={() => setPage((current) => current + 1)}>Siguiente →</button>
          </div>
        </section>
      </main>

      <footer><span>PORTAL<span className="logo-accent">.404</span></span><p>Una exploración no oficial del multiverso · Datos vía Rick and Morty API</p><span>© 2026</span></footer>

      {selected && <div className="modal-backdrop" onClick={() => setSelected(null)}>
        <section className="episode-modal" onClick={(event) => event.stopPropagation()}>
          <button className="modal-close" onClick={() => setSelected(null)} aria-label="Cerrar">×</button>
          <div className="modal-label">{selected.episode} · REGISTRO #{selected.id}</div>
          <h2>{selected.name}</h2>
          <div className="modal-meta"><span>◷ {selected.air_date}</span><span>◉ {selected.characters.length} personajes registrados</span></div>
          <p className="modal-description">Una aventura clasificada en el archivo de la temporada {getSeason(selected.episode)}. Accede a la tripulación detectada en esta misión y guarda el episodio si quieres volver a visitarlo.</p>
          <h3>Personajes detectados</h3>
          {loadingCharacters ? <div className="character-loading">Escaneando señales biológicas...</div> : <div className="characters">{characters.map((character) => <div className="character" key={character.id}><img src={character.image} alt={character.name} /><div><strong>{character.name}</strong><span>{character.species} · {character.status}</span></div></div>)}</div>}
          <button className={`modal-save ${favorites.includes(selected.id) ? 'saved' : ''}`} onClick={() => toggleFavorite(selected.id)}>{favorites.includes(selected.id) ? '★ Guardado en tus misiones' : '☆ Guardar en misiones'}</button>
        </section>
      </div>}
    </div>
  );
}

export default App;
