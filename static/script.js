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

let track_index = 0;
let isPlaying = false;
let updateTimer;

let curr_track = document.createElement('audio')

let track_list = [];


async function fetchLibrary() {
    const res = await fetch("/library?limit=500");
    const data = await res.json();
    track_list = data.results;

    if (track_list.length > 0) {
        loadTrack(track_index);
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

function nextTrack() {
    track_index = (track_index + 1) % track_list.length;
    loadTrack(track_index);
    playTrack();
}

function prevTrack() {
    track_index = (track_index - 1 + track_list.length) % track_list.length;
    loadTrack(track_index);
    playTrack();
}

function seekTo() {
    curr_track.currentTime = seek_slider.value;
}

function seekUpdate() {
    seek_slider.value = Math.floor(curr_track.currentTime);
    curr_time.textContent = formatTime(curr_track.currentTime);
}

function setVolume() {
    curr_track.volume = volume_slider.value / 100;
}

function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// Kick things off once the page loads
document.addEventListener("DOMContentLoaded", fetchLibrary);