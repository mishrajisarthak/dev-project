const WATCHMODE_API_KEY = 'qAFiHpsBa3S1CoSChcaKHOgFSneiy9h1WPBhWX1G';
const TMDB_API_KEY = '9ea084449e41dde6c3654b214242255f';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const IMG_BASE_URL = 'https://image.tmdb.org/t/p/original';
const WATCHMODE_BASE_URL = 'https://api.watchmode.com/v1';

let myList = JSON.parse(localStorage.getItem('myList')) || [];

async function fetchTrendingMovies() {
    try {
        const response = await fetch(
            `${TMDB_BASE_URL}/trending/movie/week?api_key=${TMDB_API_KEY}`
        );
        const data = await response.json();
        return data.results || [];
    } catch (error) {
        console.error('Error fetching trending movies:', error);
        return [];
    }
}

async function searchMovies(query) {
    try {
        const response = await fetch(
            `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${query}`
        );
        const data = await response.json();
        return data.results || [];
    } catch (error) {
        console.error('Error searching movies:', error);
        return [];
    }
}

function displayMovies(movies = [], containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';

    if (!Array.isArray(movies) || movies.length === 0) {
        container.innerHTML = '<p class="text-gray-500">No movies found</p>';
        return;
    }

    movies.forEach(movie => {
        if (!movie?.poster_path) return;

        const movieCard = document.createElement('div');
        movieCard.className = 'movie-card cursor-pointer';
        movieCard.innerHTML = `
      <img src="${IMG_BASE_URL}${movie.poster_path}" alt="${movie.title || 'Movie poster'}">
      <div class="overlay">
        <h3 class="text-lg font-bold">${movie.title || 'Untitled'}</h3>
      </div>
    `;
        movieCard.addEventListener('click', () => openMovieModal(movie));
        container.appendChild(movieCard);
    });
}

async function openMovieModal(movie) {
    if (!movie) return;

    const modal = document.getElementById('movieModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalContent = document.getElementById('modalContent');

    if (!modal || !modalTitle || !modalContent) return;

    modalTitle.textContent = movie.title || 'Untitled';

    const watchmodeData = await getWatchmodeData(movie.title);
    const streamingSources = watchmodeData ? await getStreamingSources(watchmodeData.id) : null;

    modalContent.innerHTML = `
    <div class="space-y-4">
      ${movie.backdrop_path ?
        `<img src="${IMG_BASE_URL}${movie.backdrop_path}" class="w-full h-[300px] object-cover rounded" alt="${movie.title}">` :
        ''
    }
      <p class="text-gray-300">${movie.overview || 'No description available.'}</p>
      <div class="flex flex-col gap-4">
        <div class="flex gap-4">
          ${streamingSources && streamingSources.length > 0 ? `
            <button class="play-button bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded font-bold transition-colors">
              Play
            </button>
          ` : `
            <p class="text-gray-400">No streaming sources available</p>
          `}
          <button class="toggle-list-button border border-white hover:bg-white/10 px-8 py-3 rounded font-bold transition-colors">
            ${myList.some(m => m.id === movie.id) ? 'Remove from My List' : 'Add to My List'}
          </button>
        </div>
        ${streamingSources && streamingSources.length > 0 ? `
          <div class="mt-4">
            <h3 class="text-lg font-bold mb-2">Available on:</h3>
            <div class="flex flex-wrap gap-2">
              ${streamingSources.map(source => `
                <a href="${source.web_url}" target="_blank" 
                   class="bg-white/10 hover:bg-white/20 px-4 py-2 rounded transition-colors">
                  ${source.name}
                </a>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    </div>
  `;

    const playButton = modalContent.querySelector('.play-button');
    const toggleListButton = modalContent.querySelector('.toggle-list-button');

    if (playButton && streamingSources && streamingSources.length > 0) {
        playButton.addEventListener('click', () => {
            playMovie(streamingSources[0].web_url);
        });
    }

    if (toggleListButton) {
        toggleListButton.addEventListener('click', () => {
            toggleMyList(movie);
            toggleListButton.textContent = myList.some(m => m.id === movie.id)
                ? 'Remove from My List'
                : 'Add to My List';
        });
    }

    modal.classList.remove('hidden');
}

async function getWatchmodeData(title) {
    if (!title) return null;

    try {
        const response = await fetch(
            `${WATCHMODE_BASE_URL}/search/?apiKey=${WATCHMODE_API_KEY}&search_field=name&search_value=${encodeURIComponent(title)}`
        );
        const data = await response.json();
        return data.title_results?.[0] || null;
    } catch (error) {
        console.error('Error fetching Watchmode data:', error);
        return null;
    }
}

async function getStreamingSources(watchmodeId) {
    if (!watchmodeId) return null;

    try {
        const response = await fetch(
            `${WATCHMODE_BASE_URL}/title/${watchmodeId}/sources/?apiKey=${WATCHMODE_API_KEY}`
        );
        const sources = await response.json();
        return sources.filter(source => source.type === 'sub' || source.type === 'free');
    } catch (error) {
        console.error('Error fetching streaming sources:', error);
        return null;
    }
}

function toggleMyList(movie) {
    if (!movie?.id) return;

    const index = myList.findIndex(m => m.id === movie.id);
    if (index === -1) {
        myList.push(movie);
    } else {
        myList.splice(index, 1);
    }
    localStorage.setItem('myList', JSON.stringify(myList));
    displayMovies(myList, 'myList');
}

function playMovie(streamingUrl) {
    if (streamingUrl && streamingUrl !== '#') {
        window.open(streamingUrl, '_blank');
    }
}

function setupVoiceSearch() {
    const voiceButton = document.getElementById('voiceSearch');
    const searchInput = document.getElementById('search');

    if (!voiceButton || !searchInput) return;

    if ('webkitSpeechRecognition' in window) {
        const recognition = new webkitSpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            searchInput.value = transcript;
            searchMovies(transcript).then(movies => displayMovies(movies, 'trendingMovies'));
        };

        voiceButton.addEventListener('click', () => {
            recognition.start();
        });
    }
}

document.getElementById('closeModal')?.addEventListener('click', () => {
    const modal = document.getElementById('movieModal');
    if (modal) modal.classList.add('hidden');
});

document.getElementById('search')?.addEventListener('input', (e) => {
    if (e.target.value) {
        searchMovies(e.target.value).then(movies => displayMovies(movies, 'trendingMovies'));
    } else {
        fetchTrendingMovies().then(movies => displayMovies(movies, 'trendingMovies'));
    }
});

async function init() {
    setupVoiceSearch();

    try {
        const trendingMovies = await fetchTrendingMovies();
        displayMovies(trendingMovies, 'trendingMovies');
        displayMovies(myList, 'myList');

        if (trendingMovies.length > 0) {
            const hero = document.getElementById('hero');
            const heroTitle = document.getElementById('heroTitle');
            const heroOverview = document.getElementById('heroOverview');

            if (hero && heroTitle && heroOverview) {
                const featuredMovie = trendingMovies[0];
                if (featuredMovie?.backdrop_path) {
                    hero.style.backgroundImage = `url(${IMG_BASE_URL}${featuredMovie.backdrop_path})`;
                }
                heroTitle.textContent = featuredMovie?.title || '';
                heroOverview.textContent = featuredMovie?.overview || '';
            }
        }
    } catch (error) {
        console.error('Error initializing app:', error);
    }
}

init();
