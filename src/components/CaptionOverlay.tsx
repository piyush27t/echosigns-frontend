import { motion, AnimatePresence } from 'framer-motion';

interface Caption {
  id: string;
  text: string;
  userId: string;
  userName: string;
  timestamp: number;
}

interface CaptionOverlayProps {
  caption: Caption | null;
}

export const CaptionOverlay = ({ caption }: CaptionOverlayProps) => {
  return (
    <AnimatePresence mode="wait">
      {caption && (
        <motion.div
          key={caption.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="caption-overlay"
        >
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs text-white/60 font-medium uppercase tracking-wider">
              {caption.userName}
            </span>
            <p className="text-white text-lg leading-relaxed">{caption.text}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
