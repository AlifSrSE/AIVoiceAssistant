from flask import Flask, jsonify, request
from flask_cors import CORS
import requests
import os
import wikipediaapi
from PyDictionary import PyDictionary
from spellchecker import SpellChecker

app = Flask(__name__)
CORS(app)
dictionary = PyDictionary()
spell = SpellChecker()

OPENWEATHER_API_KEY = os.environ.get('OPENWEATHER_API_KEY', 'YOUR_OPENWEATHER_API_KEY_HERE')
BASE_WEATHER_URL = "http://api.openweathermap.org/data/2.5/weather"

NEWS_API_KEY = os.environ.get('NEWS_API_KEY', 'YOUR_NEWS_API_KEY_HERE')
BASE_NEWS_URL = "https://newsapi.org/v2/top-headlines"

# --- API Endpoints ---

@app.route('/')
def home():
    return "AI Voice Assistant Backend is running!"

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

if __name__ == '__main__':
    app.run(debug=True, port=5000)