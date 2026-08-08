import { useEffect, useState, useRef, useCallback } from 'react';

export function useSpeechSynthesis() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [speaking, setSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const queueRef = useRef<string[]>([]);
  const isSpeakingRef = useRef(false);

  useEffect(() => {
    if (!window.speechSynthesis) return;

    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const processQueue = useCallback(() => {
    if (isSpeakingRef.current || queueRef.current.length === 0) return;

    const text = queueRef.current.shift()!;
    isSpeakingRef.current = true;
    setSpeaking(true);

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;

    utterance.onstart = () => {
      setSpeaking(true);
    };

    utterance.onend = () => {
      isSpeakingRef.current = false;
      setSpeaking(false);
      processQueue();
    };

    utterance.onerror = (event: Event) => {
      console.error('SpeechSynthesisUtterance.onerror', event);
      isSpeakingRef.current = false;
      setSpeaking(false);
      processQueue();
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, []);

  const speak = useCallback((text: string, voiceName?: string) => {
    if (!window.speechSynthesis) return;

    window.speechSynthesis.cancel();

    queueRef.current.push(text);
    processQueue();

    // Set voice for next utterance
    if (voiceName && voices.length > 0) {
      const selectedVoice = voices.find(voice => voice.name === voiceName);
      if (selectedVoice && utteranceRef.current) {
        utteranceRef.current.voice = selectedVoice;
      }
    }
  }, [voices, processQueue]);

  const cancel = useCallback(() => {
    window.speechSynthesis?.cancel();
    queueRef.current = [];
    isSpeakingRef.current = false;
    setSpeaking(false);
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && window.speechSynthesis) {
        window.speechSynthesis.pause();
      } else if (!document.hidden && window.speechSynthesis) {
        window.speechSynthesis.resume();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return { speak, cancel, speaking, voices };
}
