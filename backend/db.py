import sqlite3
import uuid
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'todos.db')

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS todos (
            id TEXT PRIMARY KEY,
            task TEXT NOT NULL,
            completed BOOLEAN DEFAULT 0,
            created_at TEXT NOT NULL
        )
    ''')
    conn.commit()
    conn.close()

def get_all_todos():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute('SELECT id, task, completed, created_at FROM todos ORDER BY created_at ASC')
    rows = cursor.fetchall()
    conn.close()

    todos = []
    for row in rows:
        todos.append({
            "id": row["id"],
            "task": row["task"],
            "completed": bool(row["completed"]),
            "createdAt": row["created_at"]
        })
    return todos

def create_todo(task):
    todo_id = str(uuid.uuid4())
    created_at = datetime.utcnow().isoformat() + 'Z'
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('INSERT INTO todos (id, task, completed, created_at) VALUES (?, ?, ?, ?)',
                   (todo_id, task.strip(), 0, created_at))
    conn.commit()
    conn.close()
    return {
        "id": todo_id,
        "task": task.strip(),
        "completed": False,
        "createdAt": created_at
    }

def update_todo(todo_id, task=None, completed=None):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute('SELECT id FROM todos WHERE id = ?', (todo_id,))
    if not cursor.fetchone():
        conn.close()
        return None

    if task is not None:
        cursor.execute('UPDATE todos SET task = ? WHERE id = ?', (task.strip(), todo_id))
    if completed is not None:
        cursor.execute('UPDATE todos SET completed = ? WHERE id = ?', (1 if completed else 0, todo_id))

    conn.commit()
    conn.close()
    return {"message": "Todo updated successfully"}

def delete_todo(todo_id):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('SELECT id FROM todos WHERE id = ?', (todo_id,))
    if not cursor.fetchone():
        conn.close()
        return False

    cursor.execute('DELETE FROM todos WHERE id = ?', (todo_id,))
    conn.commit()
    conn.close()
    return True
