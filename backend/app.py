from flask import Flask, send_from_directory
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import os
from backend.config import logger, DOWNLOAD_DIR
from backend.db import init_db

def create_app():
    app = Flask(__name__)
    CORS(app)
    limiter = Limiter(
        get_remote_address,
        app=app,
        default_limits=["60 per minute"],
        storage_uri="memory://"
    )

    init_db()

    from backend.routes.todo_routes import todo_bp
    from backend.routes.weather_routes import weather_bp
    from backend.routes.news_routes import news_bp
    from backend.routes.wikipedia_routes import wikipedia_bp
    from backend.routes.dictionary_routes import dictionary_bp
    from backend.routes.youtube_routes import youtube_bp
    from backend.routes.email_routes import email_bp
    from backend.routes.maps_routes import maps_bp
    from backend.routes.health import health_bp

    app.register_blueprint(todo_bp)
    app.register_blueprint(weather_bp)
    app.register_blueprint(news_bp)
    app.register_blueprint(wikipedia_bp)
    app.register_blueprint(dictionary_bp)
    app.register_blueprint(youtube_bp)
    app.register_blueprint(email_bp)
    app.register_blueprint(maps_bp)
    app.register_blueprint(health_bp)

    @app.route('/')
    def home():
        return "You are on the right track, Backend is running!"

    @app.route('/downloads/<filename>')
    def serve_downloaded_file(filename):
        return send_from_directory(DOWNLOAD_DIR, filename)

    @app.after_request
    def set_security_headers(response):
        response.headers['Content-Security-Policy'] = "default-src 'self'; connect-src 'self' http://127.0.0.1:5000; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; media-src 'self' https:; frame-src 'self' https://www.youtube.com https://www.google.com;"
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['X-XSS-Protection'] = '1; mode=block'
        response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
        return response

    logger.info("Application factory initialized with all blueprints")
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=os.environ.get('FLASK_DEBUG', 'False').lower() == 'true', port=5000)
