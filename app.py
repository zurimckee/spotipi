from flask import Flask, request, jsonify, Response, stream_with_context
import os
from dotenv import load_dotenv
load_dotenv()
from library import load_index, s3, R2_BUCKET
from search import search_tracks

app = Flask(__name__)
db_conn = load_index()

@app.route("/library")
def library():
    """Returns tracks. If a `q` query param is present, does a search.
    Otherwise returns the full library (paginated)."""
    query = request.args.get("q", "").strip()
    limit = int(request.args.get("limit", 50))
    offset = int(request.args.get("offset", 0))

    if query:
        results = search_tracks(db_conn, query, limit=limit)
        return jsonify({"results": results, "query": query})

    cursor = db_conn.execute(
        "SELECT id, r2_key, title, artist, album, duration FROM tracks "
        "ORDER BY artist, album, track_number LIMIT ? OFFSET ?",
        (limit, offset)
    )
    tracks = [
        {"id": r[0], "r2_key": r[1], "title": r[2], "artist": r[3],
         "album": r[4], "duration": r[5]}
        for r in cursor.fetchall()
    ]
    return jsonify({"results": tracks, "query": None})


@app.route("/stream/<int:track_id>")
def stream(track_id):
    """Streams audio from R2 with Range support for seeking."""
    row = db_conn.execute(
        "SELECT r2_key, filesize FROM tracks WHERE id = ?", (track_id,)
    ).fetchone()

    if row is None:
        return jsonify({"error": "Track not found"}), 404

    r2_key, filesize = row
    range_header = request.headers.get("Range")

    if range_header:
        # Parse "bytes=START-END"
        byte_range = range_header.replace("bytes=", "").split("-")
        start = int(byte_range[0]) if byte_range[0] else 0
        end = int(byte_range[1]) if len(byte_range) > 1 and byte_range[1] else filesize - 1
        end = min(end, filesize - 1)

        obj = s3.get_object(
            Bucket=R2_BUCKET, Key=r2_key,
            Range=f"bytes={start}-{end}"
        )

        resp = Response(
            stream_with_context(obj["Body"].iter_chunks(chunk_size=8192)),
            status=206,
            mimetype="audio/mpeg",
            direct_passthrough=True,
        )
        resp.headers["Content-Range"] = f"bytes {start}-{end}/{filesize}"
        resp.headers["Accept-Ranges"] = "bytes"
        resp.headers["Content-Length"] = str(end - start + 1)
        return resp

    # No Range header — send whole file (some clients do this on first request)
    obj = s3.get_object(Bucket=R2_BUCKET, Key=r2_key)
    resp = Response(
        stream_with_context(obj["Body"].iter_chunks(chunk_size=8192)),
        mimetype="audio/mpeg",
        direct_passthrough=True,
    )
    resp.headers["Content-Length"] = str(filesize)
    resp.headers["Accept-Ranges"] = "bytes"
    return resp


if __name__ == "__main__":
    app.run(debug=True, port=5000)