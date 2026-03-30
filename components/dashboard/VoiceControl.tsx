'use client';

import { useState, useEffect, useRef } from 'react';
import { useVoiceControl } from '@/hooks/useVoiceControl';

interface VoiceControlProps {
  className?: string;
}

export function VoiceControl({ className }: VoiceControlProps) {
  const { isSupported, isListening, lastCommand, startListening, stopListening } =
    useVoiceControl();
  const [mounted, setMounted] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const helpRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (lastCommand) {
      setShowTooltip(true);
      if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
      tooltipTimer.current = setTimeout(() => setShowTooltip(false), 2000);
    }
    return () => {
      if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    };
  }, [lastCommand]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (helpRef.current && !helpRef.current.contains(e.target as Node)) {
        setShowHelp(false);
      }
    }
    if (showHelp) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showHelp]);

  const toggle = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
      setShowHelp(true);
    }
  };

  if (!mounted || !isSupported) {
    return (
      <button
        className={`w-10 h-10 flex items-center justify-center rounded-full text-on-surface-variant/30 cursor-not-allowed ${className ?? ''}`}
        aria-label="Voice input not supported"
        title="Voice input not supported in this browser"
        disabled
      >
        <span className="material-symbols-outlined">mic_off</span>
      </button>
    );
  }

  return (
    <div ref={helpRef} className={`relative ${className ?? ''}`}>
      <button
        onClick={toggle}
        className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors cursor-pointer ${
          isListening
            ? 'bg-green-500/20 text-green-500'
            : 'hover:bg-surface-container-low dark:hover:bg-white/10 text-on-surface-variant'
        }`}
        aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
        title={isListening ? 'Listening...' : 'Voice control'}
      >
        <span className="material-symbols-outlined">mic</span>
        {isListening && (
          <span className="absolute inset-0 rounded-full border-2 border-green-500 animate-ping opacity-30" />
        )}
      </button>

      {/* Command feedback */}
      {showTooltip && lastCommand && (
        <span className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1 rounded-lg bg-green-500 text-white text-xs whitespace-nowrap shadow-lg">
          {lastCommand}
        </span>
      )}

      {/* Voice commands help */}
      {showHelp && isListening && !showTooltip && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-surface-container-lowest rounded-2xl shadow-lg border border-outline-variant/20 p-4 z-50">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              Voice Commands
            </span>
            <span className="flex items-center gap-1 text-xs text-green-500">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Listening
            </span>
          </div>
          <div className="space-y-2 text-xs text-on-surface-variant">
            <div>
              <p className="font-semibold text-on-surface mb-1">All media</p>
              <p>&quot;pause&quot; &middot; &quot;play&quot; &middot; &quot;stop everything&quot;</p>
            </div>
            <div>
              <p className="font-semibold text-on-surface mb-1">YouTube</p>
              <p>&quot;play video&quot; &middot; &quot;pause video&quot;</p>
              <p>&quot;next video&quot; &middot; &quot;previous video&quot;</p>
            </div>
            <div>
              <p className="font-semibold text-on-surface mb-1">Spotify</p>
              <p>&quot;play music&quot; &middot; &quot;pause music&quot;</p>
              <p>&quot;next song&quot; &middot; &quot;skip&quot; &middot; &quot;previous song&quot;</p>
            </div>
          </div>
          <button
            onClick={() => setShowHelp(false)}
            className="mt-3 w-full text-xs text-on-surface-variant/50 hover:text-on-surface-variant transition-colors cursor-pointer"
          >
            Got it
          </button>
        </div>
      )}
    </div>
  );
}
