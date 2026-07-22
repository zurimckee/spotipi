from dotenv import load_dotenv
load_dotenv()

from library import rebuild_index, load_index

rebuild_index()

conn = load_index()
cursor = conn.execute("SELECT title, artist, album, duration FROM tracks")
for row in cursor.fetchall():
    print(row)


conn.close()