from flask import Blueprint, jsonify, request
import requests
from spellchecker import SpellChecker
from backend.config import logger

spell = SpellChecker()

dictionary_bp = Blueprint('dictionary', __name__)

@dictionary_bp.route('/dictionary', methods=['GET'])
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

    try:
        response = requests.get(f"https://api.dictionaryapi.dev/api/v2/entries/en/{word_to_define}", timeout=10)
        response.raise_for_status()
        entries = response.json()

        formatted_definitions = []
        for entry in entries:
            for meaning in entry.get('meanings', []):
                part_of_speech = meaning.get('partOfSpeech', '')
                definitions = [d.get('definition', '') for d in meaning.get('definitions', []) if d.get('definition')]
                if definitions:
                    formatted_definitions.append({
                        "part_of_speech": part_of_speech,
                        "meanings": definitions
                    })

        if formatted_definitions:
            return jsonify({
                "original_word": word_query,
                "corrected_word": corrected_word if is_misspelled else None,
                "definitions": formatted_definitions
            }), 200
        else:
            return jsonify({"error": f"Could not find definitions for '{word_query}'."}), 404

    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 404:
            return jsonify({"error": f"Could not find definitions for '{word_query}'."}), 404
        return jsonify({"error": f"Dictionary API error: {e.response.status_code}"}), e.response.status_code
    except requests.exceptions.ConnectionError:
        return jsonify({"error": "Network connection error. Please try again later."}), 503
    except requests.exceptions.Timeout:
        return jsonify({"error": "Dictionary request timed out. Please try again."}), 504
    except Exception as e:
        logger.info(f"Error fetching dictionary definition for {word_to_define}: {e}")
        return jsonify({"error": "An internal server error occurred."}), 500
