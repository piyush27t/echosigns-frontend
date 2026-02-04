// ZEGOCLOUD Configuration
// Replace these with your actual ZEGOCLOUD credentials
export const ZEGOCLOUD_CONFIG = {
  appID: 545613729, // Your ZEGOCLOUD App ID (number)
  serverSecret: 'b5932e8823322d46d53026aa0787ab4c', // Your ZEGOCLOUD Server Secret
};

// Backend Configuration
export const BACKEND_CONFIG = {
  // HTTP endpoint for sending gesture frames
  frameEndpoint: 'http://localhost:8080/api/frames',
  // WebSocket endpoint for receiving captions
  websocketEndpoint: 'ws://localhost:8080/ws/captions',
};

// Frame Extraction Configuration
export const FRAME_CONFIG = {
  fps: 6, // Frames per second (5-8 recommended)
  width: 224,
  height: 224,
  quality: 0.7, // JPEG compression quality (0-1)
};
