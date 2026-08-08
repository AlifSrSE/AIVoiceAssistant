from flask import Blueprint, jsonify, request
import sqlite3
from backend.db import get_all_todos, create_todo, update_todo, delete_todo
from backend.config import logger

todo_bp = Blueprint('todos', __name__)

@todo_bp.route('/api/todos', methods=['GET'])
def get_todos():
    try:
        todos = get_all_todos()
        return jsonify(todos), 200
    except Exception as e:
        logger.info(f"Error fetching todos: {e}")
        return jsonify({"error": "Failed to fetch todos"}), 500

@todo_bp.route('/api/todos', methods=['POST'])
def create_todo():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Invalid JSON"}), 400

    task = data.get('task')
    if not task or not task.strip():
        return jsonify({"error": "Task is required"}), 400

    try:
        todo = create_todo(task)
        return jsonify(todo), 201
    except Exception as e:
        logger.info(f"Error creating todo: {e}")
        return jsonify({"error": "Failed to create todo"}), 500

@todo_bp.route('/api/todos/<todo_id>', methods=['PUT'])
def update_todo(todo_id):
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Invalid JSON"}), 400

    task = data.get('task')
    completed = data.get('completed')

    try:
        result = update_todo(todo_id, task=task, completed=completed)
        if result is None:
            return jsonify({"error": "Todo not found"}), 404
        return jsonify(result), 200
    except Exception as e:
        logger.info(f"Error updating todo: {e}")
        return jsonify({"error": "Failed to update todo"}), 500

@todo_bp.route('/api/todos/<todo_id>', methods=['DELETE'])
def delete_todo(todo_id):
    try:
        success = delete_todo(todo_id)
        if not success:
            return jsonify({"error": "Todo not found"}), 404
        return jsonify({"message": "Todo deleted successfully"}), 200
    except Exception as e:
        logger.info(f"Error deleting todo: {e}")
        return jsonify({"error": "Failed to delete todo"}), 500
