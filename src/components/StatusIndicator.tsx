import { Wifi, WifiOff, Loader2, MessageSquare } from 'lucide-react';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

interface StatusIndicatorProps {
  label: string;
  status: ConnectionStatus;
  className?: string;
}

export const StatusIndicator = ({ label, status, className = '' }: StatusIndicatorProps) => {
  const getIcon = () => {
    switch (status) {
      case 'connected':
        return <Wifi className="w-3.5 h-3.5 text-success" />;
      case 'connecting':
        return <Loader2 className="w-3.5 h-3.5 text-warning animate-spin" />;
      case 'disconnected':
        return <WifiOff className="w-3.5 h-3.5 text-destructive" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'disconnected':
        return 'Disconnected';
    }
  };

  return (
    <div className={`status-indicator ${className}`}>
      <span className={`status-dot ${status}`} />
      {getIcon()}
      <span className="text-foreground/80">{label}:</span>
      <span className="text-foreground">{getStatusText()}</span>
    </div>
  );
};

interface CaptionActivityProps {
  isActive: boolean;
  captionCount: number;
}

export const CaptionActivity = ({ isActive, captionCount }: CaptionActivityProps) => {
  return (
    <div className="status-indicator">
      <MessageSquare className={`w-3.5 h-3.5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
      <span className="text-foreground/80">Captions:</span>
      <span className="text-foreground">
        {isActive ? 'Active' : 'Idle'} ({captionCount})
      </span>
    </div>
  );
};
