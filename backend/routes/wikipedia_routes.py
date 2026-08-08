from flask import Blueprint, jsonify, request
import wikipediaapi
from backend.config import logger

wikipedia_bp = Blueprint('wikipedia', __name__)

@wikipedia_bp.route('/wikipedia', methods=['GET'])
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
        logger.info(f"An error occurred during Wikipedia query: {e}")
        return jsonify({"error": f"An internal server error occurred: {e}"}), 500
