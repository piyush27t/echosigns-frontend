import { useEffect, useRef, useMemo } from 'react';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';
import { ZEGOCLOUD_CONFIG } from '@/config/zegocloud';
import { useFrameExtractor } from '@/hooks/useFrameExtractor';
import { useCaptionSocket } from '@/hooks/useCaptionSocket';
import { CaptionOverlay } from './CaptionOverlay';
import { StatusIndicator, CaptionActivity } from './StatusIndicator';
import { Button } from '@/components/ui/button';
import { LogOut, Settings } from 'lucide-react';

interface VideoCallRoomProps {
  roomId: string;
  userName: string;
  onLeave: () => void;
}

// Generate a simple token for demo purposes
// In production, this should be generated server-side
const generateToken = (appID: number, serverSecret: string, roomID: string, userID: string, userName: string): string => {
  // This is a placeholder - in production, generate token server-side
  return ZegoUIKitPrebuilt.generateKitTokenForTest(
    appID,
    serverSecret,
    roomID,
    userID,
    userName
  );
};

export const VideoCallRoom = ({ roomId, userName, onLeave }: VideoCallRoomProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const zpRef = useRef<ZegoUIKitPrebuilt | null>(null);
  
  const userId = useMemo(() => `user_${Math.random().toString(36).substring(2, 9)}`, []);

  // Socket hook for communication
  const { 
    currentCaption, 
    captions,
    connectionStatus,
    error: socketError,
    emitFrame,
  } = useCaptionSocket({
    roomId,
    userId,
    userName,
    enabled: true,
  });

  // Frame extraction hook
  const { isExtracting, error: extractionError } = useFrameExtractor({
    enabled: true,
    onFrame: emitFrame, // Wire frame capture to socket emission
  });

  useEffect(() => {
    if (!containerRef.current) return;

    const initCall = async () => {
      // Check if credentials are configured
      if (!ZEGOCLOUD_CONFIG.appID || !ZEGOCLOUD_CONFIG.serverSecret) {
        console.warn('ZEGOCLOUD credentials not configured. Please update src/config/zegocloud.ts');
        return;
      }

      const token = generateToken(
        ZEGOCLOUD_CONFIG.appID,
        ZEGOCLOUD_CONFIG.serverSecret,
        roomId,
        userId,
        userName
      );

      const zp = ZegoUIKitPrebuilt.create(token);
      zpRef.current = zp;

      zp.joinRoom({
        container: containerRef.current,
        scenario: {
          mode: ZegoUIKitPrebuilt.VideoConference,
        },
        turnOnCameraWhenJoining: true,
        turnOnMicrophoneWhenJoining: true,
        showScreenSharingButton: true,
        showUserList: true,
        showLayoutButton: true,
        showPinButton: true,
        showNonVideoUser: true,
        showMyCameraToggleButton: true,
        showMyMicrophoneToggleButton: true,
        showAudioVideoSettingsButton: true,
        showTextChat: false, // We have captions instead
        maxUsers: 10,
        layout: 'Auto',
        showLeavingView: false,
        onLeaveRoom: () => {
          onLeave();
        },
        onUserJoin: (users) => {
          console.log('Users joined:', users);
        },
        onUserLeave: (users) => {
          console.log('Users left:', users);
        },
      });
    };

    initCall();

    return () => {
      if (zpRef.current) {
        zpRef.current.destroy();
        zpRef.current = null;
      }
    };
  }, [roomId, userId, userName, onLeave]);

  const hasZegoCredentials = ZEGOCLOUD_CONFIG.appID && ZEGOCLOUD_CONFIG.serverSecret;

  return (
    <div className="relative w-full h-screen bg-background">
      {/* Status Bar */}
      <div className="absolute top-4 left-4 right-4 z-40 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <StatusIndicator 
            label="Caption Server" 
            status={connectionStatus} 
          />
          <CaptionActivity 
            isActive={!!currentCaption} 
            captionCount={captions.length} 
          />
          {isExtracting && (
            <div className="status-indicator">
              <span className="status-dot connected" />
              <span className="text-foreground/80">Frame Capture:</span>
              <span className="text-foreground">Active</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <div className="status-indicator">
            <span className="text-foreground/80">Room:</span>
            <span className="text-foreground font-mono">{roomId}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onLeave}
            className="text-muted-foreground hover:text-destructive"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {(extractionError || socketError) && (
        <div className="absolute top-20 left-4 z-40 bg-destructive/20 border border-destructive/50 rounded-lg px-4 py-2 text-sm text-destructive">
          {extractionError || socketError}
        </div>
      )}

      {/* Video Call Container */}
      {hasZegoCredentials ? (
        <div 
          ref={containerRef} 
          className="w-full h-full"
        />
      ) : (
        <div className="flex items-center justify-center h-full">
          <div className="glass-card p-8 max-w-lg text-center">
            <Settings className="w-12 h-12 mx-auto mb-4 text-warning" />
            <h2 className="text-xl font-bold mb-2">ZEGOCLOUD Not Configured</h2>
            <p className="text-muted-foreground mb-4">
              Please update your ZEGOCLOUD credentials in{' '}
              <code className="px-2 py-1 bg-secondary rounded text-sm">src/config/zegocloud.ts</code>
            </p>
            <ol className="text-left text-sm text-muted-foreground space-y-2 mb-4">
              <li>1. Go to <a href="https://console.zegocloud.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">ZEGOCLOUD Console</a></li>
              <li>2. Create a new project or use an existing one</li>
              <li>3. Copy your App ID and Server Secret</li>
              <li>4. Update the config file with your credentials</li>
            </ol>
            <Button onClick={onLeave}>Back to Join</Button>
          </div>
        </div>
      )}

      {/* Caption Overlay */}
      <CaptionOverlay caption={currentCaption} />
    </div>
  );
};
