import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AudioPlayer } from "./audio-player";
import { Mic, RotateCcw, Square } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AudioRecorderProps {
  onRecordingComplete: (audioBlob: Blob, duration: number) => void;
}

export function AudioRecorder({ onRecordingComplete }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  
  const { toast } = useToast();

  const startRecording = async () => {
    if (isRecording || isInitializing) return;
    
    setIsInitializing(true);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        console.log('MediaRecorder onstop fired');
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        onRecordingComplete(blob, recordingTime);
        
        // Final cleanup
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        
        mediaRecorderRef.current = null;
        setIsRecording(false);
        setIsInitializing(false);
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setIsInitializing(false);
      setRecordingTime(0);
      
      // Start timer
      intervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error('Error accessing microphone:', error);
      setIsInitializing(false);
      toast({
        title: "Microphone Access Denied",
        description: "Please allow microphone access to record your question",
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    console.log('Stop recording called, isRecording:', isRecording);
    console.log('MediaRecorder state:', mediaRecorderRef.current?.state);
    
    if (mediaRecorderRef.current && isRecording) {
      try {
        if (mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
        // Immediately set recording to false to prevent UI issues
        setIsRecording(false);
        
        // Force cleanup if onstop doesn't fire
        setTimeout(() => {
          cleanupRecording();
        }, 1000);
      } catch (error) {
        console.error('Error stopping recording:', error);
        cleanupRecording();
      }
    } else if (isRecording) {
      // Force cleanup if we're stuck in recording state
      console.log('Force cleanup - no mediaRecorder but isRecording is true');
      cleanupRecording();
    }
  };

  const cleanupRecording = () => {
    setIsRecording(false);
    setIsInitializing(false);
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    mediaRecorderRef.current = null;
  };

  const resetRecording = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupRecording();
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      {/* Recording Button and Timer */}
      <div className="text-center">
        <div className="relative inline-block mb-4">
          <Button
            size="lg"
            className={`w-24 h-24 rounded-full transition-all duration-200 ${
              isRecording 
                ? 'bg-red-600 hover:bg-red-700 animate-pulse' 
                : isInitializing
                ? 'bg-yellow-600 hover:bg-yellow-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
            onClick={() => {
              console.log('Button clicked, isRecording:', isRecording);
              if (isRecording) {
                stopRecording();
              } else {
                startRecording();
              }
            }}
            disabled={!!audioBlob || isInitializing}
          >
            {isInitializing ? (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            ) : isRecording ? (
              <Square className="h-8 w-8 fill-current" />
            ) : (
              <Mic className="h-8 w-8" />
            )}
          </Button>
          
          {/* Recording animation rings */}
          {isRecording && (
            <>
              <div className="absolute inset-0 -m-4 border-4 border-red-600 rounded-full opacity-30 animate-ping" />
              <div className="absolute inset-0 -m-8 border-4 border-red-600 rounded-full opacity-20 animate-ping" style={{ animationDelay: '0.5s' }} />
            </>
          )}
        </div>
        
        <div className="text-2xl font-mono font-bold text-gray-900 mb-2">
          {formatTime(recordingTime)}
        </div>
        
        <div className="text-sm text-gray-500">
          {isInitializing 
            ? 'Initializing microphone...'
            : isRecording 
            ? 'Click the red button to stop recording'
            : audioBlob 
            ? 'Recording complete' 
            : 'Click to start recording'
          }
        </div>
      </div>

      {/* Audio Playback */}
      {audioUrl && (
        <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
          <AudioPlayer src={audioUrl} />
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={resetRecording}
            className="w-full"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Record Again
          </Button>
        </div>
      )}
    </div>
  );
}