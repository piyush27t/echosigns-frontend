import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Video, Users, ArrowRight, Hand } from 'lucide-react';

interface JoinRoomFormProps {
  onJoin: (roomId: string, userName: string) => void;
}

export const JoinRoomForm = ({ onJoin }: JoinRoomFormProps) => {
  const [roomId, setRoomId] = useState('');
  const [userName, setUserName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomId.trim() && userName.trim()) {
      onJoin(roomId.trim(), userName.trim());
    }
  };

  const generateRoomId = () => {
    const id = Math.random().toString(36).substring(2, 10);
    setRoomId(id);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-card p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <Hand className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Sign Language Caption Call
          </h1>
          <p className="text-muted-foreground">
            Real-time video calls with AI-powered sign language to text captioning
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="userName" className="text-foreground/80">
              Your Name
            </Label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="userName"
                type="text"
                placeholder="Enter your name"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="pl-10 bg-secondary/50 border-border/50 focus:border-primary"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="roomId" className="text-foreground/80">
              Room ID
            </Label>
            <div className="relative">
              <Video className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="roomId"
                type="text"
                placeholder="Enter room ID"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="pl-10 pr-24 bg-secondary/50 border-border/50 focus:border-primary"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={generateRoomId}
                className="absolute right-1 top-1/2 -translate-y-1/2 text-xs text-primary hover:text-white"
              >
                Generate
              </Button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-12 text-base font-semibold gap-2"
            disabled={!roomId.trim() || !userName.trim()}
          >
            Join Room
            <ArrowRight className="w-4 h-4" />
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t border-border/50">
          <h3 className="text-sm font-medium text-foreground/80 mb-3">Features</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              HD Video & Audio Conferencing
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              Real-time Sign Language Recognition
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              Live Text Caption Overlay
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              Screen Sharing Support
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
