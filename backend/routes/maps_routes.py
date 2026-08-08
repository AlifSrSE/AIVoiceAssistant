from flask import Blueprint, jsonify, request
import requests
from backend.config import logger, GOOGLE_MAPS_API_KEY, BASE_PLACES_TEXT_SEARCH_URL

maps_bp = Blueprint('maps', __name__)

@maps_bp.route('/maps/search', methods=['GET'])
def maps_search():
    query = request.args.get('query')
    if not query:
        return jsonify({"error": "Query parameter is required"}), 400

    if not GOOGLE_MAPS_API_KEY or GOOGLE_MAPS_API_KEY == 'YOUR_GOOGLE_MAPS_API_KEY_HERE':
        logger.info("Warning: Google Maps API key is not set.")
        return jsonify({"error": "Google Maps API key not configured on the server."}), 500

    params = {
        'query': query,
        'key': GOOGLE_MAPS_API_KEY
    }

    try:
        response = requests.get(BASE_PLACES_TEXT_SEARCH_URL, params=params, timeout=30)
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
        logger.info(f"HTTP error occurred during Maps search: {e}")
        return jsonify({"error": f"Google Maps API Error: {e.response.status_code} - {e.response.text}"}), e.response.status_code
    except requests.exceptions.ConnectionError as e:
        logger.info(f"Connection error occurred during Maps search: {e}")
        return jsonify({"error": "Network connection error to Google Maps API. Please try again later."}), 503
    except requests.exceptions.Timeout as e:
        logger.info(f"Timeout error occurred during Maps search: {e}")
        return jsonify({"error": "Google Maps API request timed out. Please try again."}), 504
    except requests.exceptions.RequestException as e:
        logger.info(f"An unexpected request error occurred during Maps search: {e}")
        return jsonify({"error": f"An unexpected request error occurred: {e}"}), 500
    except Exception as e:
        logger.info(f"An unknown error occurred during Maps search: {e}")
        return jsonify({"error": f"An unknown server error occurred: {e}"}), 500
