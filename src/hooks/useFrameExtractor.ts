import { useRef, useCallback, useEffect, useState } from 'react';
import { FRAME_CONFIG, BACKEND_CONFIG } from '@/config/zegocloud';

interface UseFrameExtractorOptions {
  roomId: string;
  userId: string;
  enabled: boolean;
}

export const useFrameExtractor = ({ roomId, userId, enabled }: UseFrameExtractorOptions) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<number | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const captureAndSendFrame = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || video.readyState !== 4) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw current video frame to canvas (resized to 224x224)
    ctx.drawImage(video, 0, 0, FRAME_CONFIG.width, FRAME_CONFIG.height);

    // Convert to JPEG Base64
    const base64Image = canvas.toDataURL('image/jpeg', FRAME_CONFIG.quality);
    const base64Data = base64Image.split(',')[1]; // Remove data URL prefix

    try {
      await fetch(BACKEND_CONFIG.frameEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomId,
          userId,
          timestamp: Date.now(),
          frame: base64Data,
        }),
      });
    } catch (err) {
      console.error('Failed to send frame:', err);
    }
  }, [roomId, userId]);

  const startExtraction = useCallback(async () => {
    try {
      setError(null);
      
      // Get camera stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });
      
      streamRef.current = stream;

      // Create hidden video element
      const video = document.createElement('video');
      video.srcObject = stream;
      video.autoplay = true;
      video.playsInline = true;
      video.muted = true;
      videoRef.current = video;

      // Create hidden canvas for frame extraction
      const canvas = document.createElement('canvas');
      canvas.width = FRAME_CONFIG.width;
      canvas.height = FRAME_CONFIG.height;
      canvasRef.current = canvas;

      await video.play();

      // Start frame capture interval
      const intervalMs = 1000 / FRAME_CONFIG.fps;
      intervalRef.current = window.setInterval(captureAndSendFrame, intervalMs);

      setIsExtracting(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start camera';
      setError(message);
      console.error('Frame extraction error:', err);
    }
  }, [captureAndSendFrame]);

  const stopExtraction = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    videoRef.current = null;
    canvasRef.current = null;
    setIsExtracting(false);
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
    startExtraction,
    stopExtraction,
  };
};
