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
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  
  const { toast } = useToast();

  // Complete cleanup function
  const cleanup = () => {
    console.log('Cleanup called');
    
    // Stop recording
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (error) {
        console.error('Error stopping MediaRecorder:', error);
      }
    }
    
    // Clear timer
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    // Stop all audio tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('Stopped track:', track.kind);
      });
      streamRef.current = null;
    }
    
    // Reset refs
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    
    // Reset state
    setIsRecording(false);
  };

  const startRecording = async () => {
    console.log('Starting recording...');
    
    if (isRecording) {
      console.log('Already recording, ignoring');
      return;
    }

    try {
      // Clean up any existing state first
      cleanup();
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      console.log('Got media stream');

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
          console.log('Audio chunk received:', event.data.size);
        }
      };

      mediaRecorder.onstop = () => {
        console.log('MediaRecorder stopped, creating blob');
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        onRecordingComplete(blob, recordingTime);
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        cleanup();
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      console.log('Recording started');

      // Start timer
      intervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Error starting recording:', error);
      cleanup();
      toast({
        title: "Microphone Error",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    console.log('Stop recording button clicked');
    cleanup();
  };

  const resetRecording = () => {
    console.log('Reset recording');
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
  };

  // Force cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('Component unmounting, cleaning up');
      cleanup();
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, []);

  // Emergency cleanup every 30 seconds if stuck in recording state
  useEffect(() => {
    if (isRecording) {
      const emergencyCleanup = setTimeout(() => {
        console.log('Emergency cleanup triggered');
        cleanup();
        toast({
          title: "Recording Stopped",
          description: "Recording was automatically stopped after 30 seconds",
          variant: "default"
        });
      }, 30000);

      return () => clearTimeout(emergencyCleanup);
    }
  }, [isRecording]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="relative inline-block mb-4">
          {/* Recording button */}
          <Button
            size="lg"
            className={`w-24 h-24 rounded-full transition-all duration-200 ${
              isRecording 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
            onClick={isRecording ? stopRecording : startRecording}
            disabled={!!audioBlob}
            type="button"
          >
            {isRecording ? (
              <Square className="h-8 w-8 fill-current" />
            ) : (
              <Mic className="h-8 w-8" />
            )}
          </Button>
          
          {/* Recording animation */}
          {isRecording && (
            <div className="absolute inset-0 -m-4 border-4 border-red-600 rounded-full opacity-30 animate-ping" />
          )}
        </div>
        
        <div className="text-2xl font-mono font-bold text-gray-900 mb-2">
          {formatTime(recordingTime)}
        </div>
        
        <div className="text-sm text-gray-500">
          {isRecording 
            ? 'Click the red square to stop'
            : audioBlob 
            ? 'Recording complete' 
            : 'Click the blue microphone to start'
          }
        </div>
      </div>

      {/* Audio playback */}
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