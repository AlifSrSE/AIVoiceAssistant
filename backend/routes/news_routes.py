from flask import Blueprint, jsonify, request
import requests
from backend.config import logger, NEWS_API_KEY, BASE_NEWS_URL

news_bp = Blueprint('news', __name__)

@news_bp.route('/news', methods=['GET'])
def get_news():
    query = request.args.get('query', '')
    country = request.args.get('country', 'us')

    if not NEWS_API_KEY or NEWS_API_KEY == 'YOUR_NEWS_API_KEY_HERE':
        logger.info("Warning: NewsAPI.org API key is not set.")
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
        response = requests.get(url_to_fetch, params=params, timeout=30)
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
        logger.info(f"HTTP error occurred: {e}")
        return jsonify({"error": f"HTTP Error: {e.response.status_code} - {e.response.text}"}), e.response.status_code
    except requests.exceptions.ConnectionError as e:
        logger.info(f"Connection error occurred: {e}")
        return jsonify({"error": "Network connection error. Please try again later."}), 503
    except requests.exceptions.Timeout as e:
        logger.info(f"Timeout error occurred: {e}")
        return jsonify({"error": "Request timed out. Please try again."}), 504
    except requests.exceptions.RequestException as e:
        logger.info(f"An unexpected error occurred: {e}")
        return jsonify({"error": f"An unexpected error occurred: {e}"}), 500
    except Exception as e:
        logger.info(f"An unknown error occurred: {e}")
        return jsonify({"error": f"An unknown server error occurred: {e}"}), 500
