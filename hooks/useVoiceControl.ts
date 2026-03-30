'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { publishMedia } from '@/utils/mediaEvents';

interface UseVoiceControlReturn {
  isSupported: boolean;
  isListening: boolean;
  lastCommand: string | null;
  startListening: () => void;
  stopListening: () => void;
}

function isVoiceSupported(): boolean {
  return typeof window !== 'undefined' && 'webkitSpeechRecognition' in window;
}

type MediaTarget = 'youtube' | 'spotify' | 'all';
type MediaCommand = 'play' | 'pause' | 'next' | 'previous';

interface ParsedCommand {
  target: MediaTarget;
  command: MediaCommand;
  label: string;
}

function parseCommand(transcript: string): ParsedCommand | null {
  const lower = transcript.toLowerCase().trim();

  const commands: Array<{
    patterns: RegExp[];
    target: MediaTarget;
    command: MediaCommand;
    label: string;
  }> = [
    // Stop/pause everything
    { patterns: [/\b(stop|pause)\s+(all|everything)\b/, /\bstop\s+it\b/, /\bmute\s+(all|everything)\b/],
      target: 'all', command: 'pause', label: 'Pause all' },
    // Play everything
    { patterns: [/\b(play|resume|start)\s+(all|everything)\b/],
      target: 'all', command: 'play', label: 'Play all' },
    // YouTube specific
    { patterns: [/\b(play|resume|start)\s+(youtube|video)\b/],
      target: 'youtube', command: 'play', label: 'Play video' },
    { patterns: [/\b(pause|stop|mute)\s+(youtube|video)\b/],
      target: 'youtube', command: 'pause', label: 'Pause video' },
    { patterns: [/\bnext\s+video\b/],
      target: 'youtube', command: 'next', label: 'Next video' },
    { patterns: [/\b(previous|prev|back)\s+video\b/],
      target: 'youtube', command: 'previous', label: 'Previous video' },
    // Spotify specific
    { patterns: [/\b(play|resume|start)\s+(spotify|music|song|track)\b/],
      target: 'spotify', command: 'play', label: 'Play music' },
    { patterns: [/\b(pause|stop|mute)\s+(spotify|music|song|track)\b/],
      target: 'spotify', command: 'pause', label: 'Pause music' },
    // Next/skip — YouTube playlist
    { patterns: [/\bnext\s+(song|track|music)\b/, /\bskip\b/],
      target: 'youtube', command: 'next', label: 'Next video' },
    { patterns: [/\b(previous|prev|back)\s+(song|track|music)\b/],
      target: 'youtube', command: 'previous', label: 'Previous video' },
    // Simple commands — control both
    { patterns: [/\bpause\b/, /\bstop\b/],
      target: 'all', command: 'pause', label: 'Pause' },
    { patterns: [/\bplay\b/, /\bresume\b/],
      target: 'all', command: 'play', label: 'Play' },
    { patterns: [/\bnext\b/],
      target: 'youtube', command: 'next', label: 'Next' },
    { patterns: [/\b(previous|prev|back)\b/],
      target: 'youtube', command: 'previous', label: 'Previous' },
  ];

  for (const cmd of commands) {
    for (const pattern of cmd.patterns) {
      if (pattern.test(lower)) {
        return { target: cmd.target, command: cmd.command, label: cmd.label };
      }
    }
  }

  return null;
}

export function useVoiceControl(): UseVoiceControlReturn {
  const [isListening, setIsListening] = useState(false);
  const [lastCommand, setLastCommand] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const shouldListenRef = useRef(false);
  const supported = isVoiceSupported();

  const clearLastCommand = useCallback(() => {
    const timer = setTimeout(() => setLastCommand(null), 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleResult = useCallback(
    (event: SpeechRecognitionEvent) => {
      const result = event.results[event.resultIndex];
      if (!result?.[0]) return;
      const transcript = result[0].transcript;
      const parsed = parseCommand(transcript);
      if (parsed) {
        publishMedia(parsed.target, parsed.command);
        setLastCommand(parsed.label);
        clearLastCommand();
      }
    },
    [clearLastCommand]
  );

  const startListening = useCallback(() => {
    if (!supported) return;
    shouldListenRef.current = true;

    if (!recognitionRef.current) {
      const recognition = new webkitSpeechRecognition!();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      recognitionRef.current = recognition;
    }

    const recognition = recognitionRef.current;
    recognition.onresult = handleResult;
    recognition.onend = () => {
      if (shouldListenRef.current) {
        try {
          recognition.start();
        } catch {
          // Already started
        }
      } else {
        setIsListening(false);
      }
    };
    recognition.onerror = () => {
      if (!shouldListenRef.current) {
        setIsListening(false);
      }
    };

    try {
      recognition.start();
      setIsListening(true);
    } catch {
      // Already started
    }
  }, [supported, handleResult]);

  const stopListening = useCallback(() => {
    shouldListenRef.current = false;
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  }, []);

  useEffect(() => {
    return () => {
      shouldListenRef.current = false;
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
    };
  }, []);

  return {
    isSupported: supported,
    isListening,
    lastCommand,
    startListening,
    stopListening,
  };
}
