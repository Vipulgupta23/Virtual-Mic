import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause } from "lucide-react";

interface AudioPlayerProps {
  src: string;
  className?: string;
}

export function AudioPlayer({ src, className = "" }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [src]);

  const togglePlayback = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(error => {
        console.error('Audio play error:', error);
        console.log('Audio src:', audio.src);
        console.log('Audio readyState:', audio.readyState);
        console.log('Audio networkState:', audio.networkState);
      });
    }
    setIsPlaying(!isPlaying);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      <audio 
        ref={audioRef} 
        preload="metadata"
        onError={(e) => {
          console.error('Audio playback error:', e);
          console.log('Audio src:', src);
        }}
      >
        <source src={src} type="audio/webm" />
        <source src={src} type="audio/mp4" />
        <source src={src} type="audio/wav" />
        <source src={src} type="audio/ogg" />
      </audio>
      
      <Button
        variant="outline"
        size="sm"
        onClick={togglePlayback}
        className="w-10 h-10 rounded-full p-0"
      >
        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </Button>
      
      <div className="flex-1">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-100" 
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>
      
      <span className="text-sm text-gray-600 min-w-[40px]">
        {formatTime(duration)}
      </span>
    </div>
  );
}
