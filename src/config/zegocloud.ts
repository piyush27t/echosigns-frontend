// ZEGOCLOUD Configuration
// Replace these with your actual ZEGOCLOUD credentials
export const ZEGOCLOUD_CONFIG = {
  appID: 719075091, // Your ZEGOCLOUD App ID (number)
  serverSecret: 'b284f4leba483dd8707e49f30c049add', // Your ZEGOCLOUD Server Secret
};

// Backend Configuration
export const BACKEND_CONFIG = {
  // Socket.IO server URL
  socketUrl: 'http://localhost:8080',
  // Session timeout in seconds
  sessionTimeout: 120,
};

// Frame Extraction Configuration
export const FRAME_CONFIG = {
  fps: 10, // 100ms interval (1000/10 = 100ms)
  width: 224,
  height: 224,
  quality: 0.7, // JPEG compression quality (0-1)
};
