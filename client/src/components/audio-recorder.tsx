import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { AudioPlayer } from "./audio-player";
import { Mic, RotateCcw } from "lucide-react";
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
  
  const { toast } = useToast();

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        onRecordingComplete(blob, recordingTime);
        
        // Stop all tracks to release the microphone
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start timer
      intervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast({
        title: "Microphone Access Denied",
        description: "Please allow microphone access to record your question",
        variant: "destructive"
      });
    }
  }, [onRecordingComplete, recordingTime, toast]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [isRecording]);

  const resetRecording = useCallback(() => {
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
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
                : 'bg-orange-600 hover:bg-orange-700'
            }`}
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
            disabled={!!audioBlob}
          >
            <Mic className="h-8 w-8" />
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
          {isRecording ? 'Recording...' : audioBlob ? 'Recording complete' : 'Hold to record'}
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
