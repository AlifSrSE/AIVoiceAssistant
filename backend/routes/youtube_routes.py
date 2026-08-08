from flask import Blueprint, jsonify, request
import requests
import subprocess
import uuid
import os
from backend.config import logger, YOUTUBE_API_KEY, BASE_YOUTUBE_SEARCH_URL, DOWNLOAD_DIR
from backend.utils.auth import require_api_key
from flask_limiter import limiter

youtube_bp = Blueprint('youtube', __name__)

@youtube_bp.route('/youtube/search', methods=['GET'])
def youtube_search():
    query = request.args.get('query')
    if not query:
        return jsonify({"error": "Query parameter is required"}), 400

    if not YOUTUBE_API_KEY or YOUTUBE_API_KEY == 'YOUR_YOUTUBE_API_KEY_HERE':
        logger.info("Warning: YouTube API key is not set.")
        return jsonify({"error": "YouTube API key not configured on the server."}), 500

    params = {
        'part': 'snippet',
        'type': 'video',
        'q': query,
        'maxResults': 5,
        'key': YOUTUBE_API_KEY
    }

    try:
        response = requests.get(BASE_YOUTUBE_SEARCH_URL, params=params, timeout=30)
        response.raise_for_status()
        youtube_data = response.json()

        videos = []
        if youtube_data and youtube_data.get('items'):
            for item in youtube_data['items']:
                video_id = item['id']['videoId']
                title = item['snippet']['title']
                description = item['snippet']['description']
                thumbnail_url = item['snippet']['thumbnails']['default']['url']

                videos.append({
                    "id": video_id,
                    "title": title,
                    "description": description,
                    "thumbnail": thumbnail_url,
                    "url": f"https://www.youtube.com/watch?v={video_id}"
                })
        return jsonify({"videos": videos}), 200

    except requests.exceptions.HTTPError as e:
        logger.info(f"HTTP error occurred during YouTube search: {e}")
        return jsonify({"error": f"YouTube API Error: {e.response.status_code} - {e.response.text}"}), e.response.status_code
    except requests.exceptions.ConnectionError as e:
        logger.info(f"Connection error occurred during YouTube search: {e}")
        return jsonify({"error": "Network connection error to YouTube API. Please try again later."}), 503
    except requests.exceptions.Timeout as e:
        logger.info(f"Timeout error occurred during YouTube search: {e}")
        return jsonify({"error": "YouTube API request timed out. Please try again."}), 504
    except requests.exceptions.RequestException as e:
        logger.info(f"An unexpected request error occurred during YouTube search: {e}")
        return jsonify({"error": f"An unexpected request error occurred: {e}"}), 500
    except Exception as e:
        logger.info(f"An unknown error occurred during YouTube search: {e}")
        return jsonify({"error": f"An unknown server error occurred: {e}"}), 500

@youtube_bp.route('/youtube/download', methods=['POST'])
@limiter.limit("10 per minute")
@require_api_key
def youtube_download():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Invalid JSON"}), 400

    video_url = data.get('url')

    if not video_url:
        return jsonify({"error": "YouTube video URL is required"}), 400

    if not ("youtube.com/watch?v=" in video_url or "youtu.be/" in video_url):
        return jsonify({"error": "Invalid YouTube URL provided."}), 400

    try:
        output_filename = f"{uuid.uuid4().hex}.mp4"
        output_path = os.path.join(DOWNLOAD_DIR, output_filename)

        command = [
            "yt-dlp",
            "-f", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/mp4",
            "--merge-output-format", "mp4",
            "-o", output_path,
            video_url
        ]
        result = subprocess.run(command, capture_output=True, text=True, check=True, timeout=300)
        download_link = f"/downloads/{output_filename}"

        return jsonify({
            "message": "Video downloaded successfully!",
            "download_link": download_link,
            "filename": output_filename,
            "yt_dlp_stdout": result.stdout,
            "yt_dlp_stderr": result.stderr
        }), 200

    except subprocess.CalledProcessError as e:
        logger.info(f"yt-dlp command failed: {e}")
        logger.info(f"STDOUT: {e.stdout}")
        logger.info(f"STDERR: {e.stderr}")
        return jsonify({"error": f"Failed to download video: {e.stderr}"}), 500
    except FileNotFoundError:
        return jsonify({"error": "yt-dlp not found. Please ensure it's installed and in your system's PATH."}), 500
    except Exception as e:
        logger.info(f"An unexpected error occurred during YouTube download: {e}")
        return jsonify({"error": f"An unknown server error occurred during download: {e}"}), 500
