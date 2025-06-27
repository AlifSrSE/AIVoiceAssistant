from flask import Flask, jsonify, request
from flask_cors import CORS
import requests
import os

app = Flask(__name__)
CORS(app)
OPENWEATHER_API_KEY = os.environ.get('OPENWEATHER_API_KEY', '581700de40ae65b7d2af7fc58ef9ffb4')
BASE_WEATHER_URL = "http://api.openweathermap.org/data/2.5/weather"

# --- API Endpoints ---

@app.route('/')
def home():
    return "AI Voice Assistant Backend is running!"

@app.route('/weather', methods=['GET'])
def get_weather():
    city = request.args.get('city')
    if not city:
        return jsonify({"error": "City parameter is required"}), 400

    if not OPENWEATHER_API_KEY or OPENWEATHER_API_KEY == '581700de40ae65b7d2af7fc58ef9ffb4':
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
    
if __name__ == '__main__':
    app.run(debug=True, port=5000)