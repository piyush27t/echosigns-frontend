import { useRef, useCallback, useEffect, useState } from 'react';
import { FRAME_CONFIG } from '@/config/zegocloud';

interface UseFrameExtractorOptions {
  enabled: boolean;
  onFrame?: (frameData: string, timestamp: number) => void;
}

export interface FrameBufferItem {
  frame: string;
  timestamp: number;
}

export const useFrameExtractor = ({ enabled, onFrame }: UseFrameExtractorOptions) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const requestRef = useRef<number | null>(null);
  const lastCaptureTimeRef = useRef<number>(0);
  const frameBufferRef = useRef<FrameBufferItem[]>([]);
  
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const captureFrame = useCallback(() => {
    const now = Date.now();
    const intervalMs = 1000 / FRAME_CONFIG.fps;

    if (now - lastCaptureTimeRef.current >= intervalMs) {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && canvas && video.readyState === 4) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Draw current video frame to canvas
          ctx.drawImage(video, 0, 0, FRAME_CONFIG.width, FRAME_CONFIG.height);

          // Convert to JPEG Base64
          const base64Image = canvas.toDataURL('image/jpeg', FRAME_CONFIG.quality);
          const base64Data = base64Image.split(',')[1];
          const timestamp = now;

          // Add to local buffer queue
          frameBufferRef.current.push({ frame: base64Data, timestamp });
          
          // Limit buffer size to last 30 frames (~3 seconds at 10fps)
          if (frameBufferRef.current.length > 30) {
            frameBufferRef.current.shift();
          }

          // Callback to send frame
          if (onFrame) {
            onFrame(base64Data, timestamp);
          }

          lastCaptureTimeRef.current = now;
        }
      }
    }

    if (enabled) {
      requestRef.current = requestAnimationFrame(captureFrame);
    }
  }, [enabled, onFrame]);

  const startExtraction = useCallback(async () => {
    try {
      setError(null);
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
      });
      
      streamRef.current = stream;

      const video = document.createElement('video');
      video.srcObject = stream;
      video.autoplay = true;
      video.playsInline = true;
      video.muted = true;
      videoRef.current = video;

      const canvas = document.createElement('canvas');
      canvas.width = FRAME_CONFIG.width;
      canvas.height = FRAME_CONFIG.height;
      canvasRef.current = canvas;

      await video.play();

      setIsExtracting(true);
      lastCaptureTimeRef.current = Date.now();
      requestRef.current = requestAnimationFrame(captureFrame);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start camera';
      setError(message);
      console.error('Frame extraction error:', err);
    }
  }, [captureFrame]);

  const stopExtraction = useCallback(() => {
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
      requestRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    videoRef.current = null;
    canvasRef.current = null;
    setIsExtracting(false);
    frameBufferRef.current = [];
  }, []);

  useEffect(() => {
    if (enabled) {
      startExtraction();
    } else {
      stopExtraction();
    }

    return () => {
      stopExtraction();
    };
  }, [enabled, startExtraction, stopExtraction]);

  return {
    isExtracting,
    error,
    frameBuffer: frameBufferRef.current,
    startExtraction,
    stopExtraction,
  };
};
