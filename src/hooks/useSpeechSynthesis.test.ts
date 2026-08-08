import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';

describe('useSpeechSynthesis', () => {
  it('should initialize with empty voices', () => {
    const { result } = renderHook(() => useSpeechSynthesis());
    expect(result.current.voices).toEqual([]);
    expect(result.current.speaking).toBe(false);
  });

  it('should not throw when speaking without voices', () => {
    const { result } = renderHook(() => useSpeechSynthesis());
    expect(() => result.current.speak('Hello')).not.toThrow();
  });
});
