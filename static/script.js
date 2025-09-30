let now_player = document.querySelector(".now-playing")
let track_art = document.querySelector("track-art")
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

function loadTrack(track_index){
    clearInterval(updateTimer);
    resetValues();
}