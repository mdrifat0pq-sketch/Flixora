// API Config
const API_KEY = '2d2caca374aecd4dbd0f66adb29dd554';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_URL = 'https://image.tmdb.org/t/p';

// Cache
const cache = {};

// Fetch from TMDB
async function fetchAPI(endpoint) {
    if (cache[endpoint]) return cache[endpoint];
    
    try {
        const sep = endpoint.includes('?') ? '&' : '?';
        const url = `${BASE_URL}${endpoint}${sep}api_key=${API_KEY}&language=en-US`;
        const res = await fetch(url);
        const data = await res.json();
        cache[endpoint] = data;
        return data;
    } catch (e) {
        console.error('API Error:', e);
        return null;
    }
}

// Get image
function getImage(path, size = 'w342') {
    return path ? `${IMAGE_URL}/${size}${path}` : null;
}

// Create card
function makeCard(movie) {
    const card = document.createElement('div');
    card.className = 'movie-card';
    card.onclick = () => openModal(movie.id);

    if (movie.poster_path) {
        const img = document.createElement('img');
        img.src = getImage(movie.poster_path);
        img.alt = movie.title;
        img.loading = 'lazy';
        card.appendChild(img);
    } else {
        const ph = document.createElement('div');
        ph.className = 'card-placeholder';
        ph.textContent = '🎬';
        card.appendChild(ph);
    }

    const label = document.createElement('div');
    label.className = 'card-label';
    label.textContent = movie.title;
    card.appendChild(label);

    if (movie.vote_average) {
        const rating = document.createElement('div');
        rating.className = 'card-rating';
        rating.textContent = '⭐ ' + movie.vote_average.toFixed(1);
        card.appendChild(rating);
    }

    return card;
}

// Make section
function makeSection(title, movies) {
    const sec = document.createElement('div');
    sec.className = 'section';
    
    const h3 = document.createElement('h3');
    h3.className = 'section-title';
    h3.textContent = title;
    sec.appendChild(h3);
    
    const row = document.createElement('div');
    row.className = 'movie-row';
    movies.slice(0, 12).forEach(m => {
        if (m.poster_path) row.appendChild(makeCard(m));
    });
    sec.appendChild(row);
    
    return sec;
}

// Update hero
function setHero(movie) {
    document.getElementById('heroBg').style.backgroundImage = 
        `url(${getImage(movie.backdrop_path, 'original') || getImage(movie.poster_path, 'original')})`;
    document.getElementById('heroTitle').textContent = movie.title;
    document.getElementById('heroDesc').textContent = movie.overview || '';
    document.getElementById('heroMeta').textContent = 
        `⭐ ${movie.vote_average?.toFixed(1) || 'N/A'} • ${movie.release_date?.split('-')[0] || 'TBA'}`;
    
    document.getElementById('hero').dataset.movieId = movie.id;
    document.getElementById('heroInfo').onclick = () => openModal(movie.id);
}

// Open modal
async function openModal(id) {
    const modal = document.getElementById('modalOverlay');
    modal.classList.remove('hidden');
    
    document.getElementById('modalTitle').textContent = 'Loading...';
    document.getElementById('modalStats').textContent = '';
    document.getElementById('modalOverview').textContent = '';
    document.getElementById('modalGenres').innerHTML = '';
    document.getElementById('modalCast').innerHTML = '';
    
    const movie = await fetchAPI(`/movie/${id}?append_to_response=credits`);
    if (!movie) return;
    
    document.getElementById('modalBg').style.backgroundImage = 
        `url(${getImage(movie.backdrop_path, 'original') || getImage(movie.poster_path, 'w780')})`;
    document.getElementById('modalTitle').textContent = movie.title;
    document.getElementById('modalStats').textContent = 
        `⭐ ${movie.vote_average?.toFixed(1)} • ${movie.release_date?.split('-')[0]} • ${movie.runtime} min`;
    document.getElementById('modalOverview').textContent = movie.overview || 'No overview';
    
    if (movie.genres) {
        document.getElementById('modalGenres').innerHTML = movie.genres
            .map(g => `<span class="genre-badge">${g.name}</span>`).join('');
    }
    
    if (movie.credits?.cast) {
        const castDiv = document.getElementById('modalCast');
        movie.credits.cast.slice(0, 10).forEach(actor => {
            const c = document.createElement('div');
            c.className = 'cast-card';
            c.innerHTML = `
                <img src="${getImage(actor.profile_path, 'w185') || 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2250%22 height=%2250%22><rect fill=%22%23333%22 width=%2250%22 height=%2250%22/><text x=%2225%22 y=%2230%22 text-anchor=%22middle%22 fill=%22%23555%22>?</text></svg>'}" alt="">
                <div class="cast-name">${actor.name.split(' ')[0]}</div>
            `;
            castDiv.appendChild(c);
        });
    }
}

// Close modal
function closeModal() {
    document.getElementById('modalOverlay').classList.add('hidden');
}
document.getElementById('modalClose').onclick = closeModal;
document.getElementById('modalOverlay').onclick = (e) => {
    if (e.target === e.currentTarget) closeModal();
};

// Toast
function toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.remove('hidden');
    setTimeout(() => t.classList.add('hidden'), 2500);
}

// Search
let timer;
document.getElementById('searchBox').addEventListener('input', function() {
    clearTimeout(timer);
    const q = this.value.trim();
    if (q.length < 2) {
        document.getElementById('searchResults').classList.add('hidden');
        return;
    }
    timer = setTimeout(async () => {
        const data = await fetchAPI(`/search/movie?query=${encodeURIComponent(q)}`);
        const container = document.getElementById('searchResults');
        container.innerHTML = '';
        if (data?.results?.length) {
            data.results.slice(0, 8).forEach(m => {
                const item = document.createElement('div');
                item.className = 'search-item';
                item.innerHTML = `
                    <img src="${getImage(m.poster_path, 'w92') || ''}" alt="">
                    <div>
                        <div class="search-item-title">${m.title}</div>
                        <div class="search-item-year">${m.release_date || 'TBA'} • ⭐ ${m.vote_average || 'N/A'}</div>
                    </div>
                `;
                item.onclick = () => {
                    openModal(m.id);
                    container.classList.add('hidden');
                    document.getElementById('searchBox').value = '';
                };
                container.appendChild(item);
            });
            container.classList.remove('hidden');
        }
    }, 400);
});

document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-results') && e.target.id !== 'searchBox') {
        document.getElementById('searchResults').classList.add('hidden');
    }
});

// Load app
async function init() {
    const [trending, popular, topRated, upcoming, nowPlaying] = await Promise.all([
        fetchAPI('/trending/movie/week'),
        fetchAPI('/movie/popular'),
        fetchAPI('/movie/top_rated'),
        fetchAPI('/movie/upcoming'),
        fetchAPI('/movie/now_playing')
    ]);
    
    const main = document.getElementById('mainContent');
    main.innerHTML = '';
    
    if (trending?.results?.length) {
        main.appendChild(makeSection('🔥 Trending Now', trending.results));
        const heroMovie = await fetchAPI(`/movie/${trending.results[0].id}`);
        if (heroMovie) setHero(heroMovie);
    }
    if (popular?.results?.length) main.appendChild(makeSection('🎬 Popular', popular.results));
    if (topRated?.results?.length) main.appendChild(makeSection('⭐ Top Rated', topRated.results));
    if (upcoming?.results?.length) main.appendChild(makeSection('📅 Upcoming', upcoming.results));
    if (nowPlaying?.results?.length) main.appendChild(makeSection('🎭 Now Playing', nowPlaying.results));
    
    document.getElementById('loader').style.display = 'none';
}

document.addEventListener('DOMContentLoaded', init);

// Keyboard close
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
});
