from flask import Blueprint, jsonify, request
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from backend.config import logger, SENDER_EMAIL, SENDER_PASSWORD, SMTP_SERVER, SMTP_PORT
from backend.utils.auth import require_api_key
from flask_limiter import limiter

email_bp = Blueprint('email', __name__)

@email_bp.route('/send-email', methods=['POST'])
@limiter.limit("10 per minute")
@require_api_key
def send_email():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Invalid JSON"}), 400

    recipient_email = data.get('recipient_email')
    subject = data.get('subject')
    body = data.get('body')

    if not all([recipient_email, subject, body]):
        return jsonify({"error": "Missing recipient_email, subject, or body"}), 400

    if not SENDER_EMAIL or SENDER_EMAIL == 'your_sender_email@example.com' or \
       not SENDER_PASSWORD or SENDER_PASSWORD == 'your_email_app_password':
        logger.info("Warning: Email sender credentials are not set.")
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

        logger.info(f"Email sent successfully to {recipient_email}")
        return jsonify({"message": "Email sent successfully!"}), 200

    except smtplib.SMTPAuthenticationError as e:
        logger.info(f"SMTP Authentication Error: {e}")
        return jsonify({"error": "Failed to authenticate with email server. Check sender credentials."}), 500
    except smtplib.SMTPConnectError as e:
        logger.info(f"SMTP Connection Error: {e}")
        return jsonify({"error": "Failed to connect to email server. Check SMTP server/port or network."}), 500
    except smtplib.SMTPException as e:
        logger.info(f"SMTP Error: {e}")
        return jsonify({"error": f"An SMTP error occurred: {e}"}), 500
    except Exception as e:
        logger.info(f"An unexpected error occurred during email sending: {e}")
        return jsonify({"error": f"An unknown server error occurred: {e}"}), 500
