import { useState } from 'react';
import { JoinRoomForm } from '@/components/JoinRoomForm';
import { VideoCallRoom } from '@/components/VideoCallRoom';

interface RoomState {
  roomId: string;
  userName: string;
}

const Index = () => {
  const [roomState, setRoomState] = useState<RoomState | null>(null);

  const handleJoin = (roomId: string, userName: string) => {
    setRoomState({ roomId, userName });
  };

  const handleLeave = () => {
    setRoomState(null);
  };

  if (roomState) {
    return (
      <VideoCallRoom
        roomId={roomState.roomId}
        userName={roomState.userName}
        onLeave={handleLeave}
      />
    );
  }

  return <JoinRoomForm onJoin={handleJoin} />;
};

export default Index;
