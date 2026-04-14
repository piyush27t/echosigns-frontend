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
        let textString = String(data.text || '').trim();
        
        // Filter out predictions with brackets or special characters (e.g., [a], [o])
        if (textString.includes('[') || textString.includes(']')) {
          console.log('Filtered out bracket prediction:', textString);
          return;
        }

        // Ignore zero/no-hand predictions - only accept predictions with confidence > 0
        // Confidence 0 means either no hand detected or low quality prediction
        const confidence = data.confidence || 0;
        if (confidence === 0) {
          console.log('Filtered out zero confidence prediction (no hand detected):', textString);
          return;
        }

        const cleanText = textString.toLowerCase();
        
        // Custom mapping for specific predictions (in case backend sends single letters)
        const predictionMappings: Record<string, string> = {
          'a': 'Hi Welcome to Echosigns',
          'o': 'Good Morning! This is Piyush',
          'b': 'Its my pleasure to work with you all here',
          'v': 'Welcome to Pune Institue of Computer Technology',
          'i': 'Echosigns is a sign language to Caption Convertor',
          'u': 'We are a team of Nishil, Prayag, Kshitij, Piyush'
        };

        const isNone = !cleanText || ['none', 'null', 'padding', 'pad', 'no hand', 'nothing', 'unknown'].includes(cleanText);

        // If it's a "none" prediction or not a recognized gesture, ignore it
        if (isNone) {
          return;
        }

        // Check if this is a single letter (old format) or full caption (new format)
        let finalCaptionText = textString;
        
        // If it's a single letter, try to map it
        if (cleanText.length === 1 && predictionMappings[cleanText]) {
          finalCaptionText = predictionMappings[cleanText];
        }
        // Otherwise use the text as-is (new backend format sends full captions)
        
        // Use the normalized text for comparison (single letter or first few words)
        const normalizedCaptionText = cleanText.length === 1 ? cleanText : cleanText.substring(0, 10);

        // Only update if the sign (prediction) has actually changed
        if (lastSeenTextRef.current === normalizedCaptionText) {
          // Same sign detected again, don't update the display
          console.log('Duplicate prediction ignored:', normalizedCaptionText);
          
          // Still reset the timeout to keep the caption visible while the sign is being held
          if (clearCaptionTimeout.current) {
            clearTimeout(clearCaptionTimeout.current);
          }
          
          clearCaptionTimeout.current = window.setTimeout(() => {
            setCurrentCaption(null);
            lastSeenTextRef.current = '';
            clearCaptionTimeout.current = null;
          }, 2500);
          
          return;
        }

        // Prevent rapid sign changes - ignore predictions arriving within 500ms of last update
        // This prevents the streaming confidence scores from creating multiple caption updates
        const now = Date.now();
        if (now - lastSeenTimeRef.current < 500) {
          console.log('Prediction too soon, ignoring:', normalizedCaptionText, '(only', now - lastSeenTimeRef.current, 'ms since last)');
          return;
        }
        lastSeenTimeRef.current = now;

        // New sign detected - update the caption
        const captionId = `caption-${data.userId}-${normalizedCaptionText}`;

        const caption: Caption = {
          id: captionId,
          text: finalCaptionText,
          userId: data.userId,
          userName: data.userName || 'Unknown',
          timestamp: data.timestamp,
        };

        // Send reset signal to backend to clear old prediction state
        // This prevents the model from processing old frames from the previous sign
        if (socketRef.current?.connected) {
          socketRef.current.emit('reset_prediction_state', {
            roomId,
            userId,
            userName,
            reason: 'sign_changed',
            timestamp: data.timestamp,
          });
          console.log('Sent reset signal for sign change:', normalizedCaptionText);
        }

        // Update current caption with new sign
        setCurrentCaption(caption);
        lastSeenTextRef.current = normalizedCaptionText;
        
        // Update history list
        setCaptions(prev => {
          const last = prev[prev.length - 1];
          const lastTextClean = last?.text.trim().toLowerCase();
          if (last && lastTextClean === finalCaptionText.trim().toLowerCase() && (caption.timestamp - last.timestamp < 3000)) {
            return prev;
          }
          return [...prev.slice(-50), caption];
        });

        // Reset the clearing timeout for new signs
        if (clearCaptionTimeout.current) {
          clearTimeout(clearCaptionTimeout.current);
        }
        
        clearCaptionTimeout.current = window.setTimeout(() => {
          setCurrentCaption(null);
          lastSeenTextRef.current = '';
          clearCaptionTimeout.current = null;
        }, 2500);

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
