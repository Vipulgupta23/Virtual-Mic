import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, Volume2 } from "lucide-react";

interface RobustAudioPlayerProps {
  src: string;
  className?: string;
}

export function RobustAudioPlayer({ src, className = "" }: RobustAudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
      setIsLoaded(true);
      setError(null);
      console.log('Audio loaded successfully:', src);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleError = (e: Event) => {
      console.error('Audio error for', src, ':', e);
      setError('Cannot play this audio format');
      setIsPlaying(false);
      setIsLoaded(false);
    };

    const handleCanPlay = () => {
      setIsLoaded(true);
      setError(null);
      console.log('Audio can play:', src);
    };

    const handleLoadStart = () => {
      console.log('Audio load started:', src);
      setError(null);
    };

    // Add event listeners
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('loadstart', handleLoadStart);

    // Force load
    audio.load();

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('loadstart', handleLoadStart);
    };
  }, [src]);

  const togglePlayback = async () => {
    const audio = audioRef.current;
    if (!audio || !isLoaded) return;

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

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const seekTime = (clickX / rect.width) * duration;
    
    audio.currentTime = seekTime;
    setCurrentTime(seekTime);
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
        <div className="flex items-center space-x-2">
          <Volume2 className="h-4 w-4 text-red-500" />
          <span className="text-red-600 text-sm">Audio Error: {error}</span>
        </div>
        <p className="text-red-500 text-xs mt-1">Source: {src}</p>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {/* Hidden audio element with multiple source formats */}
      <audio ref={audioRef} preload="metadata">
        <source src={src} type="audio/webm" />
        <source src={src} type="audio/mp4" />
        <source src={src} type="audio/wav" />
        <source src={src} type="audio/ogg" />
      </audio>
      
      {/* Play/Pause Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={togglePlayback}
        disabled={!isLoaded}
        className="w-10 h-10 rounded-full p-0"
      >
        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </Button>
      
      {/* Progress Bar */}
      <div className="flex-1">
        <div 
          className="w-full bg-gray-200 rounded-full h-2 cursor-pointer"
          onClick={handleSeek}
        >
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-100" 
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>
      
      {/* Time Display */}
      <div className="text-sm text-gray-600 min-w-[80px] text-right">
        {formatTime(currentTime)} / {formatTime(duration)}
      </div>
      
      {/* Loading indicator */}
      {!isLoaded && !error && (
        <div className="text-xs text-gray-400">Loading...</div>
      )}
    </div>
  );
}