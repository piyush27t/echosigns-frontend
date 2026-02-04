import { useRef, useCallback, useEffect, useState } from 'react';
import { BACKEND_CONFIG } from '@/config/zegocloud';

interface Caption {
  id: string;
  text: string;
  userId: string;
  userName: string;
  timestamp: number;
}

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

interface UseCaptionWebSocketOptions {
  roomId: string;
  userId: string;
  enabled: boolean;
}

export const useCaptionWebSocket = ({ roomId, userId, enabled }: UseCaptionWebSocketOptions) => {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [currentCaption, setCurrentCaption] = useState<Caption | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [error, setError] = useState<string | null>(null);

  const clearCaptionTimeout = useRef<number | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setConnectionStatus('connecting');
    setError(null);

    try {
      const ws = new WebSocket(`${BACKEND_CONFIG.websocketEndpoint}?roomId=${roomId}&userId=${userId}`);

      ws.onopen = () => {
        setConnectionStatus('connected');
        console.log('Caption WebSocket connected');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'caption') {
            const caption: Caption = {
              id: `${data.userId}-${data.timestamp}`,
              text: data.text,
              userId: data.userId,
              userName: data.userName || 'Unknown',
              timestamp: data.timestamp,
            };

            setCaptions(prev => [...prev.slice(-50), caption]); // Keep last 50 captions
            setCurrentCaption(caption);

            // Clear current caption after 5 seconds
            if (clearCaptionTimeout.current) {
              clearTimeout(clearCaptionTimeout.current);
            }
            clearCaptionTimeout.current = window.setTimeout(() => {
              setCurrentCaption(null);
            }, 5000);
          }
        } catch (err) {
          console.error('Failed to parse caption message:', err);
        }
      };

      ws.onerror = (event) => {
        console.error('Caption WebSocket error:', event);
        setError('WebSocket connection error');
      };

      ws.onclose = (event) => {
        setConnectionStatus('disconnected');
        console.log('Caption WebSocket closed:', event.code, event.reason);

        // Attempt reconnection after 3 seconds
        if (enabled) {
          reconnectTimeoutRef.current = window.setTimeout(() => {
            connect();
          }, 3000);
        }
      };

      wsRef.current = ws;
    } catch (err) {
      setConnectionStatus('disconnected');
      setError(err instanceof Error ? err.message : 'Failed to connect');
    }
  }, [roomId, userId, enabled]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (clearCaptionTimeout.current) {
      clearTimeout(clearCaptionTimeout.current);
      clearCaptionTimeout.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setConnectionStatus('disconnected');
  }, []);

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
    connect,
    disconnect,
  };
};
