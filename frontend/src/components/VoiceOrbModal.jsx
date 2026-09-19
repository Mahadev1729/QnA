import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
} from 'lucide-react';
import VoiceOrbCanvas from './VoiceOrbCanvas';
import { transcribeAudio } from '../services/api';

export default function VoiceOrbModal({
  isOpen,
  onClose,
  handleSendMessage,
  isStreaming,
  statusMessage,
  messages,
}) {
  const [voiceState, setVoiceState] = useState('listening'); // 'listening' | 'thinking' | 'speaking'
  const [liveTranscript, setLiveTranscript] = useState('');
  const [aiSpokenText, setAiSpokenText] = useState('');
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  const recognitionRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const micStreamRef = useRef(null);
  const animAudioRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const isSpeakingUtteranceRef = useRef(false);
  const lastProcessedMsgIdRef = useRef(null);

  // Setup Web Audio API Mic Analyser for live frequency visualization
  useEffect(() => {
    if (!isOpen) return;

    let isCancelled = false;

    const setupAudioAnalyser = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (isCancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        micStreamRef.current = stream;

        // Initialize MediaRecorder for Groq Whisper
        try {
          const mediaRecorder = new MediaRecorder(stream);
          mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
              audioChunksRef.current.push(e.data);
            }
          };
          mediaRecorderRef.current = mediaRecorder;
        } catch (e) {
          console.warn('MediaRecorder not supported, using Web Speech API fallback', e);
        }

        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;

        const audioCtx = new AudioCtx();
        audioContextRef.current = audioCtx;
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        analyserRef.current = analyser;

        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const trackVolume = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);

          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const average = sum / dataArray.length;
          const normalized = Math.min(1, average / 128);

          if (voiceState === 'speaking') {
            setAudioLevel(0.4 + Math.sin(Date.now() / 120) * 0.35);
          } else if (voiceState === 'listening' && !isMicMuted) {
            setAudioLevel(normalized);
          } else {
            setAudioLevel(0);
          }

          animAudioRef.current = requestAnimationFrame(trackVolume);
        };

        trackVolume();
      } catch (err) {
        console.warn('Could not access microphone for visualizer:', err);
      }
    };

    setupAudioAnalyser();

    return () => {
      isCancelled = true;
      if (animAudioRef.current) cancelAnimationFrame(animAudioRef.current);
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [isOpen, voiceState, isMicMuted]);

  // Speech-to-Text Recognition Setup (Groq Whisper + Web Speech Hybrid)
  useEffect(() => {
    if (!isOpen) return;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setLiveTranscript('Voice recognition ready. Speak naturally...');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      const currentSpeech = (final || interim).trim();
      if (!currentSpeech) return;

      // Barge-in: If AI is speaking and user speaks, stop AI voice immediately!
      if (voiceState === 'speaking' || isSpeakingUtteranceRef.current) {
        if (window.speechSynthesis) window.speechSynthesis.cancel();
        isSpeakingUtteranceRef.current = false;
        setVoiceState('listening');
      }

      setLiveTranscript(currentSpeech);

      // Auto-send after 1.2 seconds of silence
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

      silenceTimerRef.current = setTimeout(() => {
        if (currentSpeech && voiceState === 'listening') {
          triggerQuery(currentSpeech);
        }
      }, 1200);
    };

    recognition.onerror = (e) => {
      if (e.error !== 'no-speech') {
        console.warn('Speech recognition status:', e.error);
      }
    };

    recognition.onend = () => {
      if (isOpen && !isMicMuted && voiceState === 'listening') {
        try {
          recognition.start();
        } catch (e) {}
      }
    };

    recognitionRef.current = recognition;

    if (!isMicMuted) {
      try {
        recognition.start();
      } catch (e) {}
    }

    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isOpen, isMicMuted, voiceState]);

  // Handle submitting query to LLM
  const triggerQuery = (queryText) => {
    if (!queryText.trim()) return;
    setVoiceState('thinking');
    setAiSpokenText('');

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }

    handleSendMessage(queryText);
  };

  // Watch for latest assistant response messages and speak them
  useEffect(() => {
    if (!isOpen) return;

    if (messages && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.role === 'assistant') {
        if (lastMsg.content) {
          setAiSpokenText(lastMsg.content);

          if (voiceState === 'thinking') {
            setVoiceState('speaking');
          }

          if (!isStreaming && lastMsg.id !== lastProcessedMsgIdRef.current) {
            lastProcessedMsgIdRef.current = lastMsg.id;
            speakAssistantResponse(lastMsg.content);
          }
        }
      }
    }
  }, [messages, isStreaming, isOpen, voiceState]);

  // Text-To-Speech Playback with Natural Voices
  const speakAssistantResponse = (text) => {
    if (isAudioMuted || !window.speechSynthesis) {
      setVoiceState('listening');
      restartListening();
      return;
    }

    window.speechSynthesis.cancel();

    // Clean text of markdown, code blocks, and formatting
    const cleanText = text
      .replace(/```[\s\S]*?```/g, 'Code block omitted.')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
      .replace(/[#*_\->~]/g, '')
      .replace(/\n+/g, '. ')
      .trim();

    if (!cleanText) {
      setVoiceState('listening');
      restartListening();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utterance.lang = 'en-US';

    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(
      (v) =>
        v.name.includes('Natural') ||
        v.name.includes('Google US English') ||
        v.name.includes('Samantha') ||
        v.name.includes('David') ||
        (v.lang === 'en-US' && !v.name.includes('Compact'))
    );
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    setVoiceState('speaking');
    isSpeakingUtteranceRef.current = true;

    utterance.onend = () => {
      isSpeakingUtteranceRef.current = false;
      setVoiceState('listening');
      setLiveTranscript('');
      restartListening();
    };

    utterance.onerror = () => {
      isSpeakingUtteranceRef.current = false;
      setVoiceState('listening');
      restartListening();
    };

    window.speechSynthesis.speak(utterance);
  };

  const restartListening = () => {
    if (recognitionRef.current && !isMicMuted) {
      try {
        recognitionRef.current.start();
      } catch (e) {}
    }
  };

  const toggleMic = () => {
    if (isMicMuted) {
      setIsMicMuted(false);
      restartListening();
    } else {
      setIsMicMuted(true);
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    }
  };

  const toggleAudio = () => {
    if (isAudioMuted) {
      setIsAudioMuted(false);
    } else {
      setIsAudioMuted(true);
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      setVoiceState('listening');
      restartListening();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="voice-modal-overlay">
      {/* Top Controls Bar */}
      <div className="voice-modal-header">
        <div className="voice-status-pill">
          {voiceState === 'listening' && (
            <>
              <span className="pulse-dot green"></span>
              <span>Listening to you...</span>
            </>
          )}
          {voiceState === 'thinking' && (
            <>
              <span className="pulse-dot purple"></span>
              <span>{statusMessage || 'Thinking...'}</span>
            </>
          )}
          {voiceState === 'speaking' && (
            <>
              <span className="pulse-dot emerald"></span>
              <span>QuickAnswer Speaking</span>
            </>
          )}
        </div>

        <button
          className="voice-close-btn"
          onClick={() => {
            if (window.speechSynthesis) window.speechSynthesis.cancel();
            onClose();
          }}
          title="Exit Voice Mode"
          aria-label="Exit Voice Mode"
        >
          <X size={20} />
        </button>
      </div>

      {/* Central 3D Dynamic Audio Visualizer Orb */}
      <div className="voice-modal-center">
        <VoiceOrbCanvas state={voiceState} audioLevel={audioLevel} />

        {/* Live Subtitles / Dynamic Transcripts */}
        <div className="voice-subtitles-box">
          {voiceState === 'listening' && (
            <p className="voice-subtitle-text user">
              {liveTranscript || 'Start speaking naturally...'}
            </p>
          )}
          {(voiceState === 'thinking' || voiceState === 'speaking') && (
            <p className="voice-subtitle-text assistant">
              {aiSpokenText ? (
                aiSpokenText.length > 180
                  ? aiSpokenText.slice(0, 180) + '...'
                  : aiSpokenText
              ) : (
                <span className="thinking-dots">Analyzing your question...</span>
              )}
            </p>
          )}
        </div>
      </div>

      {/* Bottom Action Controls */}
      <div className="voice-modal-bottom">
        <button
          className={`voice-action-pill ${isMicMuted ? 'muted' : ''}`}
          onClick={toggleMic}
          title={isMicMuted ? 'Unmute microphone' : 'Mute microphone'}
        >
          {isMicMuted ? <MicOff size={18} /> : <Mic size={18} />}
          <span>{isMicMuted ? 'Mic Muted' : 'Mic On'}</span>
        </button>

        <button
          className={`voice-action-pill ${isAudioMuted ? 'muted' : ''}`}
          onClick={toggleAudio}
          title={isAudioMuted ? 'Unmute audio' : 'Mute audio'}
        >
          {isAudioMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          <span>{isAudioMuted ? 'Sound Off' : 'Sound On'}</span>
        </button>
      </div>
    </div>
  );
}
