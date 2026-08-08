import React from 'react';
import { Todo } from '../types';

interface TodoListProps {
  todos: Todo[];
  newTodo: string;
  onNewTodoChange: (value: string) => void;
  onAddTodo: (task: string) => void;
  onToggleTodo: (id: string, completed: boolean) => void;
  onDeleteTodo: (id: string) => void;
}

export const TodoList: React.FC<TodoListProps> = ({
  todos,
  newTodo,
  onNewTodoChange,
  onAddTodo,
  onToggleTodo,
  onDeleteTodo,
}) => {
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onAddTodo(newTodo);
    }
  };

  return (
    <div className="bg-gray-700 bg-opacity-50 rounded-xl p-6 shadow-xl border border-gray-600">
      <h2 className="text-2xl font-bold mb-4 text-center text-teal-300">Your To-Do List</h2>
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <input
          type="text"
          className="flex-grow p-3 rounded-lg bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Add a new to-do item..."
          value={newTodo}
          onChange={(e) => onNewTodoChange(e.target.value)}
          onKeyPress={handleKeyPress}
        />
        <button
          onClick={() => { onAddTodo(newTodo); }}
          className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition-transform transform hover:scale-105 active:scale-95 shadow-md"
        >
          Add To-Do
        </button>
      </div>

      {todos.length === 0 ? (
        <p className="text-center text-gray-400 italic">No to-do items yet. Try adding one!</p>
      ) : (
        <ul className="space-y-3">
          {todos.map((todo, index) => (
            <li
              key={todo.id}
              className={`flex items-center justify-between p-4 rounded-lg shadow-md transition-all duration-200 ${
                todo.completed ? 'bg-gray-600 line-through text-gray-400' : 'bg-gray-800 text-white'
              }`}
            >
              <span className="flex-grow text-lg">
                {index + 1}. {todo.task}
              </span>
              <div className="flex space-x-2">
                <button
                  onClick={() => onToggleTodo(todo.id, !todo.completed)}
                  className={`p-2 rounded-full ${
                    todo.completed
                      ? 'bg-yellow-500 hover:bg-yellow-600'
                      : 'bg-indigo-500 hover:bg-indigo-600'
                  } text-white transition-transform transform hover:scale-110 active:scale-90 shadow-sm`}
                  title={todo.completed ? 'Mark as Incomplete' : 'Mark as Complete'}
                >
                  {todo.completed ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-rotate-ccw"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check-circle"><path d="M22 11.08V12a10 10 0 1 11-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>
                  )}
                </button>
                <button
                  onClick={() => onDeleteTodo(todo.id)}
                  className="p-2 rounded-full bg-red-500 hover:bg-red-600 text-white transition-transform transform hover:scale-110 active:scale-90 shadow-sm"
                  title="Delete To-Do"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
