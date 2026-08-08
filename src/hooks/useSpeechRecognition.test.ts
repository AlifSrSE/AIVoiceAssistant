import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

describe('useSpeechRecognition', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should return isSupported as false in non-browser environment', () => {
    const { result } = renderHook(() => useSpeechRecognition(() => {}));
    expect(result.current.isSupported).toBe(false);
  });
});
