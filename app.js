// ==================== CONFIG ====================
const API_KEY = '2d2caca374aecd4dbd0f66adb29dd554';
const BASE = 'https://api.themoviedb.org/3';
const IMG = 'https://image.tmdb.org/t/p';

// ==================== CACHE ====================
const cache = new Map();

async function fetchTMDB(endpoint) {
    if (cache.has(endpoint)) return cache.get(endpoint);
    try {
        const sep = endpoint.includes('?') ? '&' : '?';
        const res = await fetch(`${BASE}${endpoint}${sep}api_key=${API_KEY}&language=en-US`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        cache.set(endpoint, data);
        return data;
    } catch (e) {
        console.error('API Error:', e);
        return null;
    }
}

function imgUrl(path, size = 'w342') {
    return path ? `${IMG}/${size}${path}` : null;
}

// ==================== TOAST ====================
function toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.remove('hidden');
    clearTimeout(t._timeout);
    t._timeout = setTimeout(() => t.classList.add('hidden'), 2500);
}

// ==================== TRAILER PLAYER ====================
let currentTrailerKey = null;

function playTrailer(youtubeKey, title) {
    currentTrailerKey = youtubeKey;
    const modal = document.getElementById('trailerModal');
    const player = document.getElementById('youtubePlayer');
    
    player.innerHTML = `
        <iframe 
            src="https://www.youtube.com/embed/${youtubeKey}?autoplay=1&rel=0&modestbranding=1"
            allow="autoplay; encrypted-media"
            allowfullscreen
            style="width:100%;height:100%;border:none;"
        ></iframe>
    `;
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    toast(`🎬 Playing: ${title}`);
}

function closeTrailer() {
    document.getElementById('trailerModal').classList.add('hidden');
    document.getElementById('youtubePlayer').innerHTML = '';
    currentTrailerKey = null;
    document.body.style.overflow = '';
}

document.getElementById('trailerClose').addEventListener('click', closeTrailer);
document.getElementById('trailerModal').addEventListener('click', function(e) {
    if (e.target === this) closeTrailer();
});

// ==================== HERO ====================
async function setHero(movie) {
    document.getElementById('heroBg').style.backgroundImage = 
        `url(${imgUrl(movie.backdrop_path, 'original') || imgUrl(movie.poster_path, 'original')})`;
    document.getElementById('heroTitle').textContent = movie.title;
    document.getElementById('heroDesc').textContent = movie.overview || '';
    document.getElementById('heroMeta').innerHTML = `
        ⭐ ${movie.vote_average?.toFixed(1) || 'N/A'} 
        • ${movie.release_date?.split('-')[0] || 'TBA'}
        ${movie.runtime ? '• ' + movie.runtime + ' min' : ''}
    `;
    
    // Get trailer key
    const videos = await fetchTMDB(`/movie/${movie.id}/videos`);
    const trailer = videos?.results?.find(v => v.type === 'Trailer' && v.site === 'YouTube');
    
    document.getElementById('heroPlay').onclick = () => {
        if (trailer) {
            playTrailer(trailer.key, movie.title);
        } else {
            toast('No trailer available for this movie');
        }
    };
    
    document.getElementById('heroInfo').onclick = () => openDetail(movie.id);
    document.getElementById('hero').dataset.movieId = movie.id;
}

// ==================== MOVIE CARD ====================
function makeCard(movie) {
    const card = document.createElement('div');
    card.className = 'movie-card';
    card.title = movie.title;

    if (movie.poster_path) {
        const img = document.createElement('img');
        img.src = imgUrl(movie.poster_path);
        img.alt = movie.title;
        img.loading = 'lazy';
        card.appendChild(img);
    } else {
        const ph = document.createElement('div');
        ph.className = 'card-placeholder';
        ph.textContent = '🎬';
        card.appendChild(ph);
    }

    // Play button
    const playBtn = document.createElement('button');
    playBtn.className = 'card-play-btn';
    playBtn.textContent = '▶';
    playBtn.onclick = async (e) => {
        e.stopPropagation();
        const videos = await fetchTMDB(`/movie/${movie.id}/videos`);
        const trailer = videos?.results?.find(v => v.type === 'Trailer' && v.site === 'YouTube');
        if (trailer) {
            playTrailer(trailer.key, movie.title);
        } else {
            toast('No trailer available');
        }
    };
    card.appendChild(playBtn);

    // Overlay
    const overlay = document.createElement('div');
    overlay.className = 'card-overlay';
    overlay.innerHTML = `
        <div class="card-title">${movie.title}</div>
        <div class="card-rating">⭐ ${movie.vote_average?.toFixed(1) || 'N/A'}</div>
    `;
    card.appendChild(overlay);

    card.addEventListener('click', () => openDetail(movie.id));
    return card;
}

// ==================== GRID SECTION ====================
function makeSection(title, movies, flag = '') {
    const sec = document.createElement('div');
    sec.className = 'section';
    sec.innerHTML = `<h3 class="section-title"><span class="flag">${flag}</span>${title}</h3>`;
    
    const grid = document.createElement('div');
    grid.className = 'movie-grid';
    movies.forEach(m => { if (m.poster_path) grid.appendChild(makeCard(m)); });
    
    sec.appendChild(grid);
    return sec;
}

// ==================== DETAIL MODAL ====================
let currentMovieId = null;

async function openDetail(movieId) {
    currentMovieId = movieId;
    const modal = document.getElementById('detailModal');
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    document.getElementById('modalTitle').textContent = 'Loading...';
    document.getElementById('modalStats').textContent = '';
    document.getElementById('modalOverview').textContent = '';
    document.getElementById('modalGenres').innerHTML = '';
    document.getElementById('modalCast').innerHTML = '';
    document.getElementById('modalSimilar').innerHTML = '';

    const movie = await fetchTMDB(`/movie/${movieId}?append_to_response=credits,similar,videos`);
    if (!movie) { toast('Failed to load details'); return; }

    document.getElementById('modalBg').style.backgroundImage = 
        `url(${imgUrl(movie.backdrop_path, 'original') || imgUrl(movie.poster_path, 'w780')})`;
    document.getElementById('modalTitle').textContent = movie.title;
    document.getElementById('modalStats').innerHTML = `
        ⭐ ${movie.vote_average?.toFixed(1)} 
        • ${movie.release_date?.split('-')[0]} 
        • ${movie.runtime} min
        • ${movie.original_language?.toUpperCase()}
    `;
    document.getElementById('modalOverview').textContent = movie.overview || 'No overview available.';

    // Trailer button
    const trailer = movie.videos?.results?.find(v => v.type === 'Trailer' && v.site === 'YouTube');
    document.getElementById('modalPlay').onclick = () => {
        if (trailer) {
            closeDetail();
            playTrailer(trailer.key, movie.title);
        } else {
            toast('No trailer available');
        }
    };

    // Genres
    if (movie.genres) {
        document.getElementById('modalGenres').innerHTML = movie.genres
            .map(g => `<span class="genre-badge">${g.name}</span>`).join('');
    }

    // Cast
    if (movie.credits?.cast) {
        const castDiv = document.getElementById('modalCast');
        movie.credits.cast.slice(0, 12).forEach(actor => {
            const card = document.createElement('div');
            card.className = 'cast-card';
            card.innerHTML = `
                <img src="${imgUrl(actor.profile_path, 'w185') || 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2250%22 height=%2250%22><rect fill=%22%23333%22 width=%2250%22 height=%2250%22/><text x=%2225%22 y=%2232%22 text-anchor=%22middle%22 fill=%22%23555%22 font-size=%2212%22>?</text></svg>'}" alt="${actor.name}">
                <div class="cast-name">${actor.name.split(' ')[0]}</div>
            `;
            castDiv.appendChild(card);
        });
    }

    // Similar movies
    if (movie.similar?.results?.length) {
        const simDiv = document.getElementById('modalSimilar');
        simDiv.innerHTML = '<h4>Similar Movies</h4><div class="similar-row"></div>';
        const row = simDiv.querySelector('.similar-row');
        movie.similar.results.slice(0, 10).forEach(sim => {
            if (!sim.poster_path) return;
            const card = document.createElement('div');
            card.className = 'similar-card';
            card.innerHTML = `
                <img src="${imgUrl(sim.poster_path, 'w185')}" alt="${sim.title}" loading="lazy">
                <div class="similar-title">${sim.title}</div>
            `;
            card.onclick = () => openDetail(sim.id);
            row.appendChild(card);
        });
    }
}

function closeDetail() {
    document.getElementById('detailModal').classList.add('hidden');
    document.body.style.overflow = '';
    currentMovieId = null;
}

document.getElementById('detailClose').addEventListener('click', closeDetail);
document.getElementById('detailModal').addEventListener('click', function(e) {
    if (e.target === this) closeDetail();
});

// ==================== TABS ====================
const categories = [
    { id: 'korean', name: '🇰🇷 Korean Drama', query: 'korean drama', discover: '&with_original_language=ko&sort_by=popularity.desc' },
    { id: 'indonesian', name: '🇮🇩 Indonesian', query: 'indonesian movie', discover: '&with_original_language=id&sort_by=popularity.desc' },
    { id: 'japanese', name: '🇯🇵 Japanese', query: 'japanese movie', discover: '&with_original_language=ja&sort_by=popularity.desc' },
    { id: 'chinese', name: '🇨🇳 Chinese', query: 'chinese movie', discover: '&with_original_language=zh&sort_by=popularity.desc' },
    { id: 'hollywood', name: '🎬 Hollywood', query: 'hollywood', discover: '&with_original_language=en&sort_by=popularity.desc&vote_count.gte=100' },
];

// Tab switching
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        const tab = this.dataset.tab;
        if (tab === 'home') {
            loadHome();
        } else {
            loadCategory(tab);
        }
        document.getElementById('mainContent').scrollIntoView({ behavior: 'smooth' });
    });
});

// ==================== LOAD HOME ====================
async function loadHome() {
    const main = document.getElementById('mainContent');
    main.innerHTML = '<div class="loader"><div class="spinner"></div><p>Loading Flixora...</p></div>';

    const [trending, popular, topRated] = await Promise.all([
        fetchTMDB('/trending/movie/week'),
        fetchTMDB('/movie/popular'),
        fetchTMDB('/movie/top_rated')
    ]);

    main.innerHTML = '';

    if (trending?.results?.length) {
        main.appendChild(makeSection('🔥 Trending Worldwide', trending.results));
        const heroMovie = await fetchTMDB(`/movie/${trending.results[0].id}`);
        if (heroMovie) setHero(heroMovie);
    }
    if (popular?.results?.length) main.appendChild(makeSection('🎬 Popular Movies', popular.results));
    if (topRated?.results?.length) main.appendChild(makeSection('⭐ Top Rated', topRated.results));
}

// ==================== LOAD CATEGORY ====================
async function loadCategory(catId) {
    const cat = categories.find(c => c.id === catId);
    if (!cat) return;

    const main = document.getElementById('mainContent');
    main.innerHTML = '<div class="loader"><div class="spinner"></div><p>Loading ' + cat.name + '...</p></div>';

    // Fetch by genre + keyword
    const [discResults, searchResults] = await Promise.all([
        fetchTMDB(`/discover/movie?sort_by=popularity.desc&vote_count.gte=10${cat.discover}`),
        fetchTMDB(`/search/movie?query=${encodeURIComponent(cat.query)}`)
    ]);

    main.innerHTML = '';

    const allMovies = [];
    const seen = new Set();

    // Combine results
    [discResults, searchResults].forEach(data => {
        if (data?.results) {
            data.results.forEach(m => {
                if (!seen.has(m.id) && m.poster_path) {
                    seen.add(m.id);
                    allMovies.push(m);
                }
            });
        }
    });

    if (allMovies.length > 0) {
        main.appendChild(makeSection(cat.name + ' Movies', allMovies));
        
        // Set hero
        const heroMovie = await fetchTMDB(`/movie/${allMovies[0].id}`);
        if (heroMovie) setHero(heroMovie);
    } else {
        main.innerHTML = '<div class="loader"><p>No movies found for this category. Try again later.</p></div>';
    }
}

// ==================== SEARCH ====================
let searchTimer;
document.getElementById('searchBox').addEventListener('input', function() {
    clearTimeout(searchTimer);
    const query = this.value.trim();
    
    if (query.length < 2) {
        document.getElementById('searchResults').classList.add('hidden');
        return;
    }

    searchTimer = setTimeout(async () => {
        const data = await fetchTMDB(`/search/movie?query=${encodeURIComponent(query)}`);
        const container = document.getElementById('searchResults');
        container.innerHTML = '';

        if (data?.results?.length) {
            data.results.slice(0, 10).forEach(m => {
                const item = document.createElement('div');
                item.className = 'search-item';
                item.innerHTML = `
                    <img src="${imgUrl(m.poster_path, 'w92') || ''}" alt="">
                    <div>
                        <div class="search-item-title">${m.title}</div>
                        <div class="search-item-meta">
                            <span>⭐ ${m.vote_average?.toFixed(1) || 'N/A'}</span>
                            <span>${m.release_date?.split('-')[0] || 'TBA'}</span>
                        </div>
                    </div>
                `;
                item.addEventListener('click', () => {
                    openDetail(m.id);
                    container.classList.add('hidden');
                    document.getElementById('searchBox').value = '';
                });
                container.appendChild(item);
            });
            container.classList.remove('hidden');
        } else {
            container.innerHTML = '<div style="padding:16px;color:#999;text-align:center;">No results found</div>';
            container.classList.remove('hidden');
        }
    }, 400);
});

document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-results') && e.target.id !== 'searchBox') {
        document.getElementById('searchResults').classList.add('hidden');
    }
});

// ==================== KEYBOARD ====================
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeTrailer();
        closeDetail();
    }
});

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {
    loadHome();
    toast('🎬 Welcome to Flixora!');
});

console.log('🚀 Flixora v2 - Asian & Hollywood Movies Ready!');
