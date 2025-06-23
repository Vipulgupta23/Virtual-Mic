import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause } from "lucide-react";

interface SimpleAudioPlayerProps {
  src: string;
  className?: string;
}

export function SimpleAudioPlayer({ src, className = "" }: SimpleAudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration || 0);
    const handleEnded = () => setIsPlaying(false);
    const handleError = (e: Event) => {
      console.error('Audio error:', e);
      setError('Cannot play this audio format');
      setIsPlaying(false);
    };
    const handleCanPlay = () => {
      setError(null);
      console.log('Audio can play');
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('canplay', handleCanPlay);

    // Try to load the audio
    audio.load();

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('canplay', handleCanPlay);
    };
  }, [src]);

  const togglePlayback = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        await audio.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Playback error:', error);
      setError('Playback failed');
      setIsPlaying(false);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (error) {
    return (
      <div className={`p-3 bg-red-50 border border-red-200 rounded-lg ${className}`}>
        <p className="text-red-600 text-sm">Audio playback error: {error}</p>
        <p className="text-red-500 text-xs mt-1">File: {src.substring(0, 50)}...</p>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      <audio ref={audioRef} preload="metadata">
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
        disabled={!duration && !error}
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