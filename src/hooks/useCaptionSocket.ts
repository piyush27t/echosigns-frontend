import { useRef, useCallback, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { BACKEND_CONFIG } from '@/config/zegocloud';

interface Caption {
  id: string;
  text: string;
  userId: string;
  userName: string;
  timestamp: number;
}

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

interface UseCaptionSocketOptions {
  roomId: string;
  userId: string;
  userName: string;
  enabled: boolean;
}

export const useCaptionSocket = ({ roomId, userId, userName, enabled }: UseCaptionSocketOptions) => {
  const socketRef = useRef<Socket | null>(null);
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [currentCaption, setCurrentCaption] = useState<Caption | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [error, setError] = useState<string | null>(null);

  const clearCaptionTimeout = useRef<number | null>(null);
  const lastSeenTextRef = useRef<string>('');
  const lastSeenTimeRef = useRef<number>(0);

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    setConnectionStatus('connecting');
    setError(null);

    const socket = io(BACKEND_CONFIG.socketUrl, {
      query: { roomId, userId, userName },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      timeout: 10000,
    });

    socket.on('connect', () => {
      setConnectionStatus('connected');
      console.log('Caption Socket.IO connected');
    });

    socket.on('disconnect', (reason) => {
      setConnectionStatus('disconnected');
      console.log('Caption Socket.IO disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
      console.error('Caption Socket.IO error:', err);
      setError('Socket connection error');
      setConnectionStatus('disconnected');
    });

    socket.on('prediction', (data) => {
      try {
        console.log('Received prediction:', data);
        let textString = String(data.text || '');
        const cleanText = textString.trim().toLowerCase();
        
        // Custom mapping for specific predictions
        const predictionMappings: Record<string, string> = {
          'a': 'Hi Welcome to Echosigns',
          'o': 'Good Morning! This is Piyush',
          'b': 'Its my pleasure to work with you all here'
        };

        if (predictionMappings[cleanText]) {
          textString = predictionMappings[cleanText];
        }

        if (!cleanText || ['none', 'null', 'padding', 'pad', 'no hand', 'nothing', 'unknown'].includes(cleanText)) {
          setCurrentCaption(null);
          lastSeenTextRef.current = ''; // Reset memory when "no hand" is detected
          if (clearCaptionTimeout.current) {
            clearTimeout(clearCaptionTimeout.current);
            clearCaptionTimeout.current = null;
          }
          return;
        }

        const caption: Caption = {
          id: `${data.userId}-${data.timestamp}`,
          text: textString,
          userId: data.userId,
          userName: data.userName || 'Unknown',
          timestamp: data.timestamp,
        };

        // Normalize text for comparison to ignore whitespace/case variation
        const normalizedCaptionText = caption.text.trim().toLowerCase();

        // Filter out spam of the exact same prediction (normalized) to allow timeout to clear it
        if (lastSeenTextRef.current === normalizedCaptionText && (Date.now() - lastSeenTimeRef.current < 2000)) {
           // If it's the same word and happened recently, we DO NOT reset the timeout here.
           // This forces the "Hello" to eventually disappear even if the backend is sticky!
           lastSeenTimeRef.current = Date.now();
           return;
        }

        // It's a NEW word (or 2 seconds have passed since we last saw this word).
        lastSeenTextRef.current = normalizedCaptionText;
        lastSeenTimeRef.current = Date.now();
        setCurrentCaption(caption);

        if (clearCaptionTimeout.current) {
          clearTimeout(clearCaptionTimeout.current);
        }
        
        // Set a new timeout to clear this new word after 1.5s
        clearCaptionTimeout.current = window.setTimeout(() => {
          setCurrentCaption(null);
          // Crucially: reset lastSeenTextRef when the caption is cleared!
          // This ensures that if the user signs the same word again 1.6s later,
          // it counts as NEW and shows up immediately!
          lastSeenTextRef.current = '';
          clearCaptionTimeout.current = null;
        }, 1500);

        // Also update the history list but avoid consecutive duplicates rapidly
        setCaptions(prev => {
          const last = prev[prev.length - 1];
          // Use normalized text for history duplicate check as well
          const lastTextClean = last?.text.trim().toLowerCase();
          if (last && lastTextClean === normalizedCaptionText && (caption.timestamp - last.timestamp < 3000)) {
            return prev;
          }
          return [...prev.slice(-50), caption];
        });

      } catch (err) {
        console.error('Failed to parse prediction message:', err);
      }
    });

    socketRef.current = socket;
  }, [roomId, userId, userName]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setConnectionStatus('disconnected');
  }, []);

  const emitFrame = useCallback((frameData: string, timestamp: number) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('frame', {
        roomId,
        userId,
        userName,
        frame: frameData,
        timestamp,
      });
    }
  }, [roomId, userId, userName]);

  useEffect(() => {
    if (enabled) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  return {
    captions,
    currentCaption,
    connectionStatus,
    error,
    emitFrame,
    connect,
    disconnect,
  };
};
