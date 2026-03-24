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

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    setConnectionStatus('connecting');
    setError(null);

    const socket = io(BACKEND_CONFIG.socketUrl, {
      query: { roomId, userId, userName },
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
        const caption: Caption = {
          id: `${data.userId}-${data.timestamp}`,
          text: data.text,
          userId: data.userId,
          userName: data.userName || 'Unknown',
          timestamp: data.timestamp,
        };

        setCaptions(prev => [...prev.slice(-50), caption]);
        setCurrentCaption(caption);

        if (clearCaptionTimeout.current) {
          clearTimeout(clearCaptionTimeout.current);
        }
        clearCaptionTimeout.current = window.setTimeout(() => {
          setCurrentCaption(null);
        }, 5000);
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
