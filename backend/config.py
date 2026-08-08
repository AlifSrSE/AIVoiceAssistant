import os
import logging
from datetime import datetime

def setup_logging():
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    return logging.getLogger(__name__)

logger = setup_logging()

OPENWEATHER_API_KEY = os.environ.get('OPENWEATHER_API_KEY', 'YOUR_OPENWEATHER_API_KEY_HERE')
NEWS_API_KEY = os.environ.get('NEWS_API_KEY', 'YOUR_NEWS_API_KEY_HERE')
YOUTUBE_API_KEY = os.environ.get('YOUTUBE_API_KEY', 'YOUR_YOUTUBE_API_KEY_HERE')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'your_sender_email@example.com')
SENDER_PASSWORD = os.environ.get('SENDER_PASSWORD', 'your_email_app_password')
SMTP_SERVER = os.environ.get('SMTP_SERVER', 'smtp.gmail.com')
SMTP_PORT = int(os.environ.get('SMTP_PORT', 587))
GOOGLE_MAPS_API_KEY = os.environ.get('GOOGLE_MAPS_API_KEY', 'YOUR_GOOGLE_MAPS_API_KEY_HERE')
AUTH_API_KEY = os.environ.get('AUTH_API_KEY', '')

BASE_WEATHER_URL = "http://api.openweathermap.org/data/2.5/weather"
BASE_NEWS_URL = "https://newsapi.org/v2/top-headlines"
BASE_YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search"
BASE_PLACES_TEXT_SEARCH_URL = "https://maps.googleapis.com/maps/api/place/textsearch/json"
BASE_GEOCODING_URL = "https://maps.googleapis.com/maps/api/geocode/json"

DOWNLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'downloads')
os.makedirs(DOWNLOAD_DIR, exist_ok=True)
