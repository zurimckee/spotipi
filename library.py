from dotenv import load_dotenv
load_dotenv()

import os
import sqlite3
import boto3
from mutagen.mp3 import MP3
from datetime import datetime, timezone
import tempfile

R2_BUCKET = os.environ["R2_BUCKET"]
INDEX_KEY = "library_index.db"
# LOCAL_DB_PATH = "/tmp/library_index.db" //uncomment after deploying to railway
LOCAL_DB_PATH = os.path.join(tempfile.gettempdir(), "library_index.db") #local testing

s3 = boto3.client(
    "s3",
    endpoint_url=os.environ["R2_ENDPOINT_URL"],
    aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
    aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
    region_name="auto",
)


def load_index():
    try:
        s3.download_file(R2_BUCKET, INDEX_KEY, LOCAL_DB_PATH)
        print("Loaded existing index from R2.")
    except s3.exceptions.ClientError:
        print("No index found in R2 — building one now.")
        rebuild_index()

    return sqlite3.connect(LOCAL_DB_PATH, check_same_thread=False)


def rebuild_index():
    """Scans the whole bucket, extracts tags with mutagen, writes a fresh
    SQLite file, and uploads it back to R2. Only call this on first run
    or when you explicitly want to re-scan (e.g. after adding new music)."""
    if os.path.exists(LOCAL_DB_PATH):
        os.remove(LOCAL_DB_PATH)

    conn = sqlite3.connect(LOCAL_DB_PATH)
    conn.execute("""
        CREATE TABLE tracks (
            id INTEGER PRIMARY KEY,
            r2_key TEXT UNIQUE NOT NULL,
            title TEXT,
            artist TEXT,
            album TEXT,
            track_number INTEGER,
            duration REAL,
            filesize INTEGER,
            date_added TEXT
        )
    """)
    #for fuzzy searching
    conn.execute("""
    CREATE VIRTUAL TABLE tracks_fts USING fts5(
        title, artist, album,
        content='tracks',
        content_rowid='id'
    )
""")
    
    # Keep FTS in sync whenever tracks changes
    conn.execute("""
        CREATE TRIGGER tracks_ai AFTER INSERT ON tracks BEGIN
            INSERT INTO tracks_fts(rowid, title, artist, album)
            VALUES (new.id, new.title, new.artist, new.album);
        END
    """)
    conn.execute("""
        CREATE TRIGGER tracks_ad AFTER DELETE ON tracks BEGIN
            INSERT INTO tracks_fts(tracks_fts, rowid, title, artist, album)
            VALUES ('delete', old.id, old.title, old.artist, old.album);
        END
    """)
    conn.execute("""
        CREATE TRIGGER tracks_au AFTER UPDATE ON tracks BEGIN
            INSERT INTO tracks_fts(tracks_fts, rowid, title, artist, album)
            VALUES ('delete', old.id, old.title, old.artist, old.album);
            INSERT INTO tracks_fts(rowid, title, artist, album)
            VALUES (new.id, new.title, new.artist, new.album);
        END
    """)



    conn.execute("CREATE INDEX idx_artist ON tracks(artist)")
    conn.execute("CREATE INDEX idx_album ON tracks(album)")

    paginator = s3.get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=R2_BUCKET):
        for obj in page.get("Contents", []):
            key = obj["Key"]
            if not key.lower().endswith(".mp3"):
                continue
            _index_track(conn, key, obj["Size"])

    conn.commit()
    conn.close()

    s3.upload_file(LOCAL_DB_PATH, R2_BUCKET, INDEX_KEY)
    print("Index rebuilt and uploaded to R2.")


def _index_track(conn, key, filesize):
    """Downloads a single file to /tmp just long enough to read its tags,
    then discards it. We only need metadata, not the audio itself."""
    tmp_path = os.path.join(tempfile.gettempdir(), "_tag_scan.mp3")
    s3.download_file(R2_BUCKET, key, tmp_path)

    try:
        audio = MP3(tmp_path)
        tags = audio.tags or {}
        title = str(tags.get("TIT2", key.split("/")[-1]))
        artist = str(tags.get("TPE1", "Unknown Artist"))
        album = str(tags.get("TALB", "Unknown Album"))
        track_number = str(tags.get("TRCK", "0")).split("/")[0]
        duration = audio.info.length
    except Exception as e:
        print(f"Failed to read tags for {key}: {e}")
        title, artist, album, track_number, duration = key, "Unknown", "Unknown", 0, 0

    conn.execute(
        """INSERT OR REPLACE INTO tracks
           (r2_key, title, artist, album, track_number, duration, filesize, date_added)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (key, title, artist, album, int(track_number or 0), duration, filesize,
         datetime.now(timezone.utc).isoformat())
    )

    os.remove(tmp_path)