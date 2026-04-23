// ZEGOCLOUD Configuration
// Replace these with your actual ZEGOCLOUD credentials
export const ZEGOCLOUD_CONFIG = {
  appID: Number(import.meta.env.VITE_ZEGO_APP_ID) || 1614816231, // Your ZEGOCLOUD App ID (number)
  serverSecret: import.meta.env.VITE_ZEGO_SERVER_SECRET || 'ad04559bd1ae97e147e7e683f83817a9', // Your ZEGOCLOUD Server Secret
};

// Backend Configuration
export const BACKEND_CONFIG = {
  // Socket.IO server URL
  socketUrl: import.meta.env.VITE_BACKEND_URL || 'https://echosigns-ml.onrender.com',
  // Session timeout in seconds
  sessionTimeout: 120,
};

// Frame Extraction Configuration
export const FRAME_CONFIG = {
  fps: 3, // 333ms interval (1000/3) - reduced from 10 to prevent backend queue buildup
  width: 224,
  height: 224,
  quality: 0.7, // JPEG compression quality (0-1)
};
