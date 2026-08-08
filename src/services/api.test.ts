import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '../services/api';

describe('api service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should call the correct endpoint for getTodos', async () => {
    const mockData = [{ id: '1', task: 'Test', completed: false, createdAt: '2024-01-01' }];
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve(mockData),
    } as Response;
    (globalThis as unknown as { fetch: typeof fetch }).fetch = vi.fn(() => Promise.resolve(mockResponse));

    const result = await api.getTodos();
    expect(result).toEqual(mockData);
    expect((globalThis as unknown as { fetch: typeof fetch }).fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/todos'),
      expect.any(Object)
    );
  });

  it('should throw an error for failed requests', async () => {
    const mockResponse = {
      ok: false,
      json: () => Promise.resolve({ error: 'Not found' }),
    } as Response;
    (globalThis as unknown as { fetch: typeof fetch }).fetch = vi.fn(() => Promise.resolve(mockResponse));

    await expect(api.getTodos()).rejects.toThrow('Not found');
  });

  it('should create a todo with correct payload', async () => {
    const mockData = { id: '1', task: 'New Todo', completed: false, createdAt: '2024-01-01' };
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve(mockData),
    } as Response;
    (globalThis as unknown as { fetch: typeof fetch }).fetch = vi.fn(() => Promise.resolve(mockResponse));

    const result = await api.createTodo('New Todo');
    expect(result).toEqual(mockData);
    expect((globalThis as unknown as { fetch: typeof fetch }).fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/todos'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ task: 'New Todo' }),
      })
    );
  });
});
