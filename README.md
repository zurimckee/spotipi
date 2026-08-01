# 🎵 spotipi
a python cli application that lets you search for songs, albums, and artists using the spotify api, then returns a direct link to the result on spotify.

## features
- search for any **song**, **album**, or **artist** by name
- pulls live data from the spotify api
- returns a direct spotify link to the matching result
---

## tech stack
 
| layer | technology |
|---|---|
| backend | python, flask |
| api | spotify web api |



## Getting Started
 
### Prerequisites
 
- python 3.7+
- a [spotify developer account](https://developer.spotify.com/dashboard) with an app created to get your api credentials
### installation
 
1. clone the repository:
   ```bash
   git clone https://github.com/zurimckee/spotipi.git
   cd spotipi
   ```
 
2. install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
 
3. add your spotify api credentials to the `.env` file:
   ```
   SPOTIPY_CLIENT_ID=your_client_id
   SPOTIPY_CLIENT_SECRET=your_client_secret
   ```
 
4. run the app:
   ```bash
   python app.py
   ```
 
5. open your browser and go to `http://localhost:5000`
---






