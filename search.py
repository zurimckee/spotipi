#search logic 
import sqlite3
import re


def search_tracks(conn, query, limit=25):
    cleaned = re.sub(r'["*():^-]', ' ', query).strip()
    if not cleaned:
        return []

    fts_query = f'"{cleaned}"*'

    cursor = conn.execute("""
        SELECT tracks.id, tracks.r2_key, tracks.title, tracks.artist,
               tracks.album, tracks.duration
        FROM tracks_fts
        JOIN tracks ON tracks.id = tracks_fts.rowid
        WHERE tracks_fts MATCH ?
        ORDER BY rank
        LIMIT ?
    """, (fts_query, limit))

    return [
        {
            "id": row[0], "r2_key": row[1], "title": row[2],
            "artist": row[3], "album": row[4], "duration": row[5],
        }
        for row in cursor.fetchall()
    ]
