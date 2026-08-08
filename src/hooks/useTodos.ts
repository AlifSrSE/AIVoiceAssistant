import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { Todo } from '../types';

export function useTodos() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTodos = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getTodos();
      setTodos(data);
    } catch (error) {
      console.error('Error fetching todos:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const addTodo = useCallback(async (task: string) => {
    try {
      const newTodo = await api.createTodo(task);
      setTodos(prev => [...prev, newTodo]);
      return newTodo;
    } catch (error) {
      console.error('Error adding todo:', error);
      throw error;
    }
  }, []);

  const toggleTodo = useCallback(async (id: string, completed: boolean) => {
    try {
      const updated = await api.updateTodo(id, { completed });
      setTodos(prev => prev.map(todo => todo.id === id ? { ...todo, completed } : todo));
      return updated;
    } catch (error) {
      console.error('Error updating todo:', error);
      throw error;
    }
  }, []);

  const deleteTodo = useCallback(async (id: string) => {
    try {
      await api.deleteTodo(id);
      setTodos(prev => prev.filter(todo => todo.id !== id));
    } catch (error) {
      console.error('Error deleting todo:', error);
      throw error;
    }
  }, []);

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  return { todos, loading, fetchTodos, addTodo, toggleTodo, deleteTodo };
}
