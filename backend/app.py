from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import requests
import os
import wikipediaapi
from PyDictionary import PyDictionary
from spellchecker import SpellChecker
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import subprocess
import uuid 

app = Flask(__name__)
CORS(app)
dictionary = PyDictionary()
spell = SpellChecker()

OPENWEATHER_API_KEY = os.environ.get('OPENWEATHER_API_KEY', 'YOUR_OPENWEATHER_API_KEY_HERE')
BASE_WEATHER_URL = "http://api.openweathermap.org/data/2.5/weather"

NEWS_API_KEY = os.environ.get('NEWS_API_KEY', 'YOUR_NEWS_API_KEY_HERE')
BASE_NEWS_URL = "https://newsapi.org/v2/top-headlines"

YOUTUBE_API_KEY = os.environ.get('YOUTUBE_API_KEY', 'YOUR_YOUTUBE_API_KEY_HERE')
BASE_YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search"

SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'your_sender_email@example.com')
SENDER_PASSWORD = os.environ.get('SENDER_PASSWORD', 'your_email_app_password')
SMTP_SERVER = os.environ.get('SMTP_SERVER', 'smtp.gmail.com') # For Gmail
SMTP_PORT = int(os.environ.get('SMTP_PORT', 587)) # 587 for TLS, 465 for SSL

GOOGLE_MAPS_API_KEY = os.environ.get('GOOGLE_MAPS_API_KEY', 'YOUR_GOOGLE_MAPS_API_KEY_HERE')
BASE_PLACES_TEXT_SEARCH_URL = "https://maps.googleapis.com/maps/api/place/textsearch/json"
BASE_GEOCODING_URL = "https://maps.googleapis.com/maps/api/geocode/json"

DOWNLOADS_DIR = os.path.join(os.getcwd(), 'downloads')
if not os.path.exists(DOWNLOADS_DIR):
    os.makedirs(DOWNLOADS_DIR)

# --- API Endpoints ---

@app.route('/')
def home():
    return "You are on the right track, Backend is running!"

@app.route('/weather', methods=['GET'])
def get_weather():
    city = request.args.get('city')
    if not city:
        return jsonify({"error": "City parameter is required"}), 400

    if not OPENWEATHER_API_KEY or OPENWEATHER_API_KEY == 'YOUR_OPENWEATHER_API_KEY_HERE':
        print("Warning: OpenWeatherMap API key is not set. Weather data will not be available.")
        return jsonify({"error": "Weather API key not configured on the server."}), 500

    params = {
        'q': city,
        'appid': OPENWEATHER_API_KEY,
        'units': 'metric'
    }

    try:
        response = requests.get(BASE_WEATHER_URL, params=params)
        response.raise_for_status()
        weather_data = response.json()

        if weather_data.get('cod') == 200:
            main = weather_data['main']
            weather = weather_data['weather'][0]
            wind = weather_data['wind']

            weather_report = {
                "city": weather_data['name'],
                "country": weather_data['sys']['country'],
                "temperature": main['temp'],
                "feels_like": main['feels_like'],
                "humidity": main['humidity'],
                "description": weather['description'],
                "wind_speed": wind['speed'],
                "icon": weather['icon']
            }
            return jsonify(weather_report), 200
        else:
            return jsonify({"error": weather_data.get('message', 'Could not retrieve weather data')}), response.status_code

    except requests.exceptions.HTTPError as e:
        print(f"HTTP error occurred: {e}")
        return jsonify({"error": f"HTTP Error: {e.response.status_code} - {e.response.text}"}), e.response.status_code
    except requests.exceptions.ConnectionError as e:
        print(f"Connection error occurred: {e}")
        return jsonify({"error": "Network connection error. Please try again later."}), 503
    except requests.exceptions.Timeout as e:
        print(f"Timeout error occurred: {e}")
        return jsonify({"error": "Request timed out. Please try again."}), 504
    except requests.exceptions.RequestException as e:
        print(f"An unexpected error occurred: {e}")
        return jsonify({"error": f"An unexpected error occurred: {e}"}), 500
    except Exception as e:
        print(f"An unknown error occurred: {e}")
        return jsonify({"error": f"An unknown server error occurred: {e}"}), 500

@app.route('/news', methods=['GET'])
def get_news():
    query = request.args.get('query', '')
    country = request.args.get('country', 'us')

    if not NEWS_API_KEY or NEWS_API_KEY == 'YOUR_NEWS_API_KEY_HERE':
        print("Warning: NewsAPI.org API key is not set. News data will not be available.")
        return jsonify({"error": "News API key not configured on the server."}), 500

    params = {
        'apiKey': NEWS_API_KEY,
        'pageSize': 5,
    }

    if query:
        params['q'] = query
        url_to_fetch = "https://newsapi.org/v2/everything"
    else:
        params['country'] = country
        url_to_fetch = BASE_NEWS_URL


    try:
        response = requests.get(url_to_fetch, params=params)
        response.raise_for_status()
        news_data = response.json()

        if news_data.get('status') == 'ok' and news_data.get('articles'):
            articles = []
            for article in news_data['articles']:
                articles.append({
                    "title": article.get('title'),
                    "description": article.get('description'),
                    "url": article.get('url'),
                    "source": article.get('source', {}).get('name')
                })
            return jsonify({"articles": articles}), 200
        else:
            return jsonify({"error": news_data.get('message', 'Could not retrieve news data')}), response.status_code

    except requests.exceptions.HTTPError as e:
        print(f"HTTP error occurred: {e}")
        return jsonify({"error": f"HTTP Error: {e.response.status_code} - {e.response.text}"}), e.response.status_code
    except requests.exceptions.ConnectionError as e:
        print(f"Connection error occurred: {e}")
        return jsonify({"error": "Network connection error. Please try again later."}), 503
    except requests.exceptions.Timeout as e:
        print(f"Timeout error occurred: {e}")
        return jsonify({"error": "Request timed out. Please try again."}), 504
    except requests.exceptions.RequestException as e:
        print(f"An unexpected error occurred: {e}")
        return jsonify({"error": f"An unexpected error occurred: {e}"}), 500
    except Exception as e:
        print(f"An unknown error occurred: {e}")
        return jsonify({"error": f"An unknown server error occurred: {e}"}), 500

@app.route('/wikipedia', methods=['GET'])
def get_wikipedia_summary():
    query = request.args.get('query')
    if not query:
        return jsonify({"error": "Query parameter is required"}), 400

    try:
        wiki_wiki = wikipediaapi.Wikipedia('en', user_agent="AIVoiceAssistant/1.0 (your_email@example.com)")
        page_py = wiki_wiki.page(query)

        if page_py.exists():
            summary_text = page_py.summary.split('.')
            if len(summary_text) > 2:
                summary_to_send = '.'.join(summary_text[:2]) + '.'
            else:
                summary_to_send = page_py.summary
            if len(summary_to_send) > 500:
                summary_to_send = summary_to_send[:500] + "..."
            return jsonify({
                "title": page_py.title,
                "summary": summary_to_send,
                "full_url": page_py.fullurl
            }), 200
        else:
            search_results = wiki_wiki.opensearch(query, results=1)
            if search_results:
                first_result_title = search_results[0][0]
                page_py_search = wiki_wiki.page(first_result_title)
                if page_py_search.exists():
                     summary_text = page_py_search.summary.split('.')
                     if len(summary_text) > 2:
                        summary_to_send = '.'.join(summary_text[:2]) + '.'
                     else:
                        summary_to_send = page_py_search.summary

                     if len(summary_to_send) > 500:
                        summary_to_send = summary_to_send[:500] + "..."

                     return jsonify({
                        "title": page_py_search.title,
                        "summary": summary_to_send,
                        "full_url": page_py_search.fullurl
                    }), 200
                else:
                    return jsonify({"error": f"No detailed Wikipedia page found for '{query}' after search."}), 404
            else:
                return jsonify({"error": f"No Wikipedia page found for '{query}'."}), 404

    except Exception as e:
        print(f"An error occurred during Wikipedia query: {e}")
        return jsonify({"error": f"An internal server error occurred: {e}"}), 500
    
    
@app.route('/dictionary', methods=['GET'])
def get_word_definition():
    word_query = request.args.get('word')
    if not word_query:
        return jsonify({"error": "Word parameter is required"}), 400

    corrected_word = spell.correction(word_query)
    is_misspelled = False
    if corrected_word and corrected_word.lower() != word_query.lower():
        is_misspelled = True
        word_to_define = corrected_word
    else:
        word_to_define = word_query

    definitions = None
    try:
        definitions = dictionary.meaning(word_to_define)
    except Exception as e:
        print(f"Error fetching definition for {word_to_define}: {e}")
        definitions = None

    if definitions:
        formatted_definitions = []
        for part_of_speech, def_list in definitions.items():
            formatted_definitions.append({
                "part_of_speech": part_of_speech,
                "meanings": def_list
            })
        return jsonify({
            "original_word": word_query,
            "corrected_word": corrected_word if is_misspelled else None,
            "definitions": formatted_definitions
        }), 200
    else:
        if is_misspelled:
            return jsonify({"error": f"Could not find definitions for '{word_query}'. Did you mean '{corrected_word}'?", "suggestion": corrected_word}), 404
        else:
            return jsonify({"error": f"Could not find definitions for '{word_query}'."}), 404

@app.route('/youtube/search', methods=['GET'])
def youtube_search():
    query = request.args.get('query')
    if not query:
        return jsonify({"error": "Query parameter is required"}), 400

    if not YOUTUBE_API_KEY or YOUTUBE_API_KEY == 'YOUR_YOUTUBE_API_KEY_HERE':
        print("Warning: YouTube API key is not set. YouTube search will not be available.")
        return jsonify({"error": "YouTube API key not configured on the server."}), 500

    params = {
        'part': 'snippet',
        'type': 'video',
        'q': query,
        'maxResults': 5,
        'key': YOUTUBE_API_KEY
    }

    try:
        response = requests.get(BASE_YOUTUBE_SEARCH_URL, params=params)
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
        print(f"HTTP error occurred during YouTube search: {e}")
        return jsonify({"error": f"YouTube API Error: {e.response.status_code} - {e.response.text}"}), e.response.status_code
    except requests.exceptions.ConnectionError as e:
        print(f"Connection error occurred during YouTube search: {e}")
        return jsonify({"error": "Network connection error to YouTube API. Please try again later."}), 503
    except requests.exceptions.Timeout as e:
        print(f"Timeout error occurred during YouTube search: {e}")
        return jsonify({"error": "YouTube API request timed out. Please try again."}), 504
    except requests.exceptions.RequestException as e:
        print(f"An unexpected request error occurred during YouTube search: {e}")
        return jsonify({"error": f"An unexpected request error occurred: {e}"}), 500
    except Exception as e:
        print(f"An unknown error occurred during YouTube search: {e}")
        return jsonify({"error": f"An unknown server error occurred: {e}"}), 500

@app.route('/youtube/download', methods=['POST'])
def youtube_download():
    data = request.get_json()
    video_url = data.get('url')

    if not video_url:
        return jsonify({"error": "YouTube video URL is required"}), 400

    if not ("youtube.com/watch?v=" in video_url or "youtu.be/" in video_url):
        return jsonify({"error": "Invalid YouTube URL provided."}), 400

    try:
        output_filename = f"{uuid.uuid4().hex}.mp4"
        output_path = os.path.join(DOWNLOADS_DIR, output_filename)

        command = [
            "yt-dlp",
            "-f", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/mp4",
            "--merge-output-format", "mp4",
            "-o", output_path,
            video_url
        ]
        result = subprocess.run(command, capture_output=True, text=True, check=True)
        download_link = f"/downloads/{output_filename}"

        return jsonify({
            "message": "Video downloaded successfully!",
            "download_link": download_link,
            "filename": output_filename,
            "yt_dlp_stdout": result.stdout,
            "yt_dlp_stderr": result.stderr
        }), 200

    except subprocess.CalledProcessError as e:
        print(f"yt-dlp command failed: {e}")
        print(f"STDOUT: {e.stdout}")
        print(f"STDERR: {e.stderr}")
        return jsonify({"error": f"Failed to download video: {e.stderr}"}), 500
    except FileNotFoundError:
        return jsonify({"error": "yt-dlp not found. Please ensure it's installed and in your system's PATH."}), 500
    except Exception as e:
        print(f"An unexpected error occurred during YouTube download: {e}")
        return jsonify({"error": f"An unknown server error occurred during download: {e}"}), 500
    
@app.route('/send-email', methods=['POST'])
def send_email():
    data = request.get_json()
    recipient_email = data.get('recipient_email')
    subject = data.get('subject')
    body = data.get('body')

    if not all([recipient_email, subject, body]):
        return jsonify({"error": "Missing recipient_email, subject, or body"}), 400

    if not SENDER_EMAIL or SENDER_EMAIL == 'your_sender_email@example.com' or \
       not SENDER_PASSWORD or SENDER_PASSWORD == 'your_email_app_password':
        print("Warning: Email sender credentials are not set. Cannot send email.")
        return jsonify({"error": "Email sender credentials not configured on the server."}), 500

    msg = MIMEMultipart()
    msg['From'] = SENDER_EMAIL
    msg['To'] = recipient_email
    msg['Subject'] = subject
    msg.attach(MIMEText(body, 'plain'))

    try:
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SENDER_EMAIL, SENDER_PASSWORD)
        text = msg.as_string()
        server.sendmail(SENDER_EMAIL, recipient_email, text)
        server.quit()

        print(f"Email sent successfully to {recipient_email}")
        return jsonify({"message": "Email sent successfully!"}), 200

    except smtplib.SMTPAuthenticationError as e:
        print(f"SMTP Authentication Error: {e}")
        return jsonify({"error": "Failed to authenticate with email server. Check sender credentials."}), 500
    except smtplib.SMTPConnectError as e:
        print(f"SMTP Connection Error: {e}")
        return jsonify({"error": "Failed to connect to email server. Check SMTP server/port or network."}), 500
    except smtplib.SMTPException as e:
        print(f"SMTP Error: {e}")
        return jsonify({"error": f"An SMTP error occurred: {e}"}), 500
    except Exception as e:
        print(f"An unexpected error occurred during email sending: {e}")
        return jsonify({"error": f"An unknown server error occurred: {e}"}), 500

@app.route('/maps/search', methods=['GET'])
def maps_search():
    query = request.args.get('query')
    if not query:
        return jsonify({"error": "Query parameter is required"}), 400

    if not GOOGLE_MAPS_API_KEY or GOOGLE_MAPS_API_KEY == 'YOUR_GOOGLE_MAPS_API_KEY_HERE':
        print("Warning: Google Maps API key is not set. Map search will not be available.")
        return jsonify({"error": "Google Maps API key not configured on the server."}), 500

    params = {
        'query': query,
        'key': GOOGLE_MAPS_API_KEY
    }

    try:
        response = requests.get(BASE_PLACES_TEXT_SEARCH_URL, params=params)
        response.raise_for_status()
        places_data = response.json()

        if places_data.get('status') == 'OK' and places_data.get('results'):
            results = []
            for place in places_data['results'][:5]:
                place_id = place.get('place_id')
                name = place.get('name')
                address = place.get('formatted_address')
                rating = place.get('rating')
                user_ratings_total = place.get('user_ratings_total')

                map_url = f"https://www.google.com/maps/search/?api=1&query={requests.utils.quote(name)}&query_place_id={place_id}"

                results.append({
                    "name": name,
                    "address": address,
                    "rating": rating,
                    "user_ratings_total": user_ratings_total,
                    "map_url": map_url
                })
            return jsonify({"results": results}), 200
        elif places_data.get('status') == 'ZERO_RESULTS':
            return jsonify({"error": f"No results found for '{query}'."}), 404
        else:
            return jsonify({"error": places_data.get('error_message', 'Could not retrieve map data')}), response.status_code

    except requests.exceptions.HTTPError as e:
        print(f"HTTP error occurred during Maps search: {e}")
        return jsonify({"error": f"Google Maps API Error: {e.response.status_code} - {e.response.text}"}), e.response.status_code
    except requests.exceptions.ConnectionError as e:
        print(f"Connection error occurred during Maps search: {e}")
        return jsonify({"error": "Network connection error to Google Maps API. Please try again later."}), 503
    except requests.exceptions.Timeout as e:
        print(f"Timeout error occurred during Maps search: {e}")
        return jsonify({"error": "Google Maps API request timed out. Please try again."}), 504
    except requests.exceptions.RequestException as e:
        print(f"An unexpected request error occurred during Maps search: {e}")
        return jsonify({"error": f"An unexpected request error occurred: {e}"}), 500
    except Exception as e:
        print(f"An unknown error occurred during Maps search: {e}")
        return jsonify({"error": f"An unknown server error occurred: {e}"}), 500

@app.route('/downloads/<filename>')
def serve_downloaded_file(filename):
    """
    Serves a file from the 'downloads' directory.
    """
    return send_from_directory(DOWNLOADS_DIR, filename)

if __name__ == '__main__':
    app.run(debug=True, port=5000)