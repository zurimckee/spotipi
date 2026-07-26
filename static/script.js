let now_player = document.querySelector(".now-playing")
let track_art = document.querySelector(".track-art")
let track_name = document.querySelector(".track-name")
let track_artist = document.querySelector(".track-artist")

let playpause_btn = document.querySelector(".playpause-track")
let next_btn = document.querySelector(".next-track")
let prev_btn = document.querySelector(".prev-track")

let seek_slider = document.querySelector(".seek-slider")
let volume_slider = document.querySelector(".volume-slider")
let curr_time = document.querySelector(".current-time")
let total_duration = document.querySelector(".total-duration")

let search_input = document.querySelector(".search-input");
let search_results_view = document.querySelector(".search-results");
let results_list = document.querySelector(".results-list");
let player_view = document.querySelector(".player");
let sidebar_list = document.querySelector(".sidebar-list");

let isShuffled = false;
let shuffle_order = [];      // array of indices into track_list, in shuffled order
let shuffle_position = 0;    // where we are within shuffle_order

let shuffle_btn = document.querySelector(".shuffle-track");


let track_index = 0;
let isPlaying = false;
let updateTimer;

let curr_track = document.createElement('audio')

let track_list = [];

const STORAGE_KEY = "tuneup_state";


function savePlayerState() {
    const state = {
        track_index: track_index,
        volume: curr_track.volume,
        currentTime: curr_track.currentTime,
        isShuffled: isShuffled,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadPlayerState() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    try {
        return JSON.parse(raw);
    } catch (e) {
        console.warn("Corrupt player state in localStorage, ignoring:", e);
        return null;
    }
}

function toggleSidebar() {
    document.querySelector(".sidebar").classList.toggle("open");
}

function renderSidebar() {
    sidebar_list.innerHTML = "";

    const folders = {};
    track_list.forEach((track, i) => {
        // r2_key looks like "Ctrl/Anything - SZA.mp3" — grab everything before the last "/"
        const parts = track.r2_key.split("/");
        const folderName = parts.length > 1 ? parts[0] : "Uncategorized";

        if (!folders[folderName]) folders[folderName] = [];
        folders[folderName].push({ ...track, originalIndex: i });
    });

    Object.keys(folders).sort().forEach(folderName => {
        const folderTracks = folders[folderName];

        const folderHeader = document.createElement("li");
        folderHeader.className = "sidebar-album-header";
        folderHeader.innerHTML = `<span class="album-arrow">▶</span> ${folderName} <span class="album-count">(${folderTracks.length})</span>`;

        // Outer grid wrapper — this is what animates open/closed
        const folderGroup = document.createElement("li");
        folderGroup.className = "sidebar-album-tracks collapsed";

        // Inner wrapper — required for the grid-row trick to work;
        // this is what actually gets clipped via overflow: hidden
        const innerWrapper = document.createElement("ul");
        innerWrapper.className = "sidebar-album-tracks-inner";

        folderTracks.forEach(track => {
            const li = document.createElement("li");
            li.className = "sidebar-item";
            li.innerHTML = `<span class="sidebar-title">${track.title}</span><span class="sidebar-artist">${track.artist}</span>`;
            li.onclick = () => {
                track_index = track.originalIndex;
                loadTrack(track_index);
                playTrack();
            };
            innerWrapper.appendChild(li);
        });

        folderGroup.appendChild(innerWrapper);

        folderHeader.onclick = () => {
            folderGroup.classList.toggle("collapsed");
            const arrow = folderHeader.querySelector(".album-arrow");
            arrow.textContent = folderGroup.classList.contains("collapsed") ? "▶" : "▼";
        };

        sidebar_list.appendChild(folderHeader);
        sidebar_list.appendChild(folderGroup);
    });
}

search_input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        const query = search_input.value.trim();
        if (query) searchLibrary(query);
    }
});

async function searchLibrary(query) {
    const res = await fetch(`/library?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    const results = data.results;

    results_list.innerHTML = "";

    if (results.length === 0) {
        results_list.innerHTML = `<li class="no-results">no results for "${query}"</li>`;
    } else {
        results.forEach((track, i) => {
            const li = document.createElement("li");
            li.className = "result-item";
            li.innerHTML = `<span class="result-title">${track.title}</span> — <span class="result-artist">${track.artist}</span>`;
            li.onclick = () => playFromResults(results, i);
            results_list.appendChild(li);
        });
    }

    showSearchResults();
}

function playFromResults(results, index) {
    track_list = results;
    track_index = index;
    loadTrack(track_index);
    playTrack();
    closeSearchResults();
}

function showSearchResults() {
    search_results_view.style.display = "block";
    player_view.style.display = "none";
}

function closeSearchResults() {
    search_results_view.style.display = "none";
    player_view.style.display = "block";
}

async function fetchLibrary() {
    const res = await fetch("/library?limit=500");
    const data = await res.json();
    track_list = data.results;

    if (track_list.length > 0) {
        const saved = loadPlayerState();

        if (saved && saved.track_index < track_list.length) {
            track_index = saved.track_index;
            isShuffled = saved.isShuffled || false;
            shuffle_btn.classList.toggle("active", isShuffled);
        }

        loadTrack(track_index);
        renderSidebar();

        if (saved) {
            // Restore volume and seek position once metadata is available
            curr_track.addEventListener("loadedmetadata", () => {
                if (saved.volume !== undefined) {
                    curr_track.volume = saved.volume;
                    volume_slider.value = saved.volume * 100;
                }
                if (saved.currentTime) {
                    curr_track.currentTime = saved.currentTime;
                    seek_slider.value = Math.floor(saved.currentTime);
                    curr_time.textContent = formatTime(saved.currentTime);
                }
            }, { once: true });
        } else {
            // No saved state — still respect a sensible default volume
            curr_track.volume = 0.99;
        }
    }
}

function loadTrack(track_index){
    clearInterval(updateTimer);
    resetValues();

    const track = track_list[track_index]
    if (!track) return;

    curr_track.src = `/stream/${track.id}`;
    curr_track.load()

    track_art.style.backgroundImage = `url('/art/${track.id}')`;

    track_name.textContent = track.title;
    track_artist.textContent = track.artist;
    now_player.textContent = `playing ${track_index + 1} of ${track_list.length}`;

    updateTimer = setInterval(seekUpdate, 1000);

    curr_track.addEventListener("loadedmetadata", () => {
        total_duration.textContent = formatTime(curr_track.duration);
        seek_slider.max = Math.floor(curr_track.duration)
    });

    curr_track.addEventListener("ended", nextTrack);
}

function toggleShuffle() {
    isShuffled = !isShuffled;
    shuffle_btn.classList.toggle("active", isShuffled);

    if (isShuffled) {
        buildShuffleOrder();
    }
    savePlayerState();
}

function buildShuffleOrder() {
    // Fisher-Yates shuffle of all indices in track_list
    shuffle_order = track_list.map((_, i) => i);
    for (let i = shuffle_order.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffle_order[i], shuffle_order[j]] = [shuffle_order[j], shuffle_order[i]];
    }

    // Put the currently-playing track first, so toggling shuffle
    // mid-song doesn't jump you somewhere else immediately
    const currentPos = shuffle_order.indexOf(track_index);
    if (currentPos > -1) {
        shuffle_order.splice(currentPos, 1);
        shuffle_order.unshift(track_index);
    }

    shuffle_position = 0;
}

function nextTrack() {
    if (isShuffled) {
        shuffle_position++;
        if (shuffle_position >= shuffle_order.length) {
            // Reached the end of this shuffled pass — generate a fresh one
            buildShuffleOrder();
        } else {
            track_index = shuffle_order[shuffle_position];
        }
    } else {
        track_index = (track_index + 1) % track_list.length;
    }
    loadTrack(track_index);
    playTrack();
    savePlayerState();
}

function prevTrack() {
    if (isShuffled) {
        shuffle_position = (shuffle_position - 1 + shuffle_order.length) % shuffle_order.length;
        track_index = shuffle_order[shuffle_position];
    } else {
        track_index = (track_index - 1 + track_list.length) % track_list.length;
    }
    loadTrack(track_index);
    playTrack();
}

function resetValues() {
    curr_time.textContent = "00:00";
    total_duration.textContent = "00:00";
    seek_slider.value = 0;
}

function playpauseTrack() {
    isPlaying ? pauseTrack() : playTrack();
}

function playTrack() {
    curr_track.play();
    isPlaying = true;
    playpause_btn.innerHTML = '<i class="fa fa-pause-circle fa-5x"></i>';
}

function pauseTrack() {
    curr_track.pause();
    isPlaying = false;
    playpause_btn.innerHTML = '<i class="fa fa-play-circle fa-5x"></i>';
}

function seekTo() {
    curr_track.currentTime = seek_slider.value;
    savePlayerState();
}

function seekUpdate() {
    seek_slider.value = Math.floor(curr_track.currentTime);
    curr_time.textContent = formatTime(curr_track.currentTime);
    savePlayerState();
}

function setVolume() {
    curr_track.volume = volume_slider.value / 100;
    savePlayerState();
}

function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// Kick things off once the page loads
document.addEventListener("DOMContentLoaded", fetchLibrary);