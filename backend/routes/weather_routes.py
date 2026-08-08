from flask import Blueprint, jsonify, request
import requests
from backend.config import logger, OPENWEATHER_API_KEY, BASE_WEATHER_URL

weather_bp = Blueprint('weather', __name__)

@weather_bp.route('/weather', methods=['GET'])
def get_weather():
    city = request.args.get('city')
    if not city:
        return jsonify({"error": "City parameter is required"}), 400

    if not OPENWEATHER_API_KEY or OPENWEATHER_API_KEY == 'YOUR_OPENWEATHER_API_KEY_HERE':
        logger.info("Warning: OpenWeatherMap API key is not set.")
        return jsonify({"error": "Weather API key not configured on the server."}), 500

    params = {
        'q': city,
        'appid': OPENWEATHER_API_KEY,
        'units': 'metric'
    }

    try:
        response = requests.get(BASE_WEATHER_URL, params=params, timeout=30)
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
