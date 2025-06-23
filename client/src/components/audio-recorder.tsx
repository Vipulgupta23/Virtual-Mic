import { useState, useRef, useCallback, useEffect } from "react";
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
  const [recordingMode, setRecordingMode] = useState<'hold' | 'click'>('hold');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  
  const { toast } = useToast();

  const startRecording = useCallback(async () => {
    if (isRecording) return;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
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
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        
        // Clear the interval when recording stops
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setIsRecording(false);
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
  }, [isRecording, onRecordingComplete, recordingTime, toast]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      try {
        if (mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
      } catch (error) {
        console.error('Error stopping recording:', error);
        setIsRecording(false);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      }
    }
  }, [isRecording]);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  const resetRecording = useCallback(() => {
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
  }, [audioUrl]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
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
      {/* Recording Mode Toggle */}
      <div className="flex justify-center space-x-2 mb-4">
        <Button
          variant={recordingMode === 'hold' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setRecordingMode('hold')}
          className="text-xs"
        >
          Hold to Record
        </Button>
        <Button
          variant={recordingMode === 'click' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setRecordingMode('click')}
          className="text-xs"
        >
          Click to Record
        </Button>
      </div>

      {/* Recording Button and Timer */}
      <div className="text-center">
        <div className="relative inline-block mb-4">
          {recordingMode === 'hold' ? (
            <Button
              size="lg"
              className={`w-24 h-24 rounded-full transition-all duration-200 recording-button ${
                isRecording 
                  ? 'bg-red-600 hover:bg-red-700 animate-pulse recording' 
                  : 'bg-orange-600 hover:bg-orange-700'
              }`}
              style={{ touchAction: 'none' }}
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onMouseLeave={stopRecording}
              onTouchStart={(e) => {
                e.preventDefault();
                e.stopPropagation();
                startRecording();
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                e.stopPropagation();
                stopRecording();
              }}
              onTouchCancel={stopRecording}
              disabled={!!audioBlob}
            >
              <Mic className="h-8 w-8" />
            </Button>
          ) : (
            <Button
              size="lg"
              className={`w-24 h-24 rounded-full transition-all duration-200 recording-button ${
                isRecording 
                  ? 'bg-red-600 hover:bg-red-700 animate-pulse recording' 
                  : 'bg-orange-600 hover:bg-orange-700'
              }`}
              onClick={toggleRecording}
              disabled={!!audioBlob}
            >
              <Mic className="h-8 w-8" />
            </Button>
          )}
          
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
          {isRecording 
            ? (recordingMode === 'hold' ? 'Release to stop recording' : 'Click to stop recording')
            : audioBlob 
            ? 'Recording complete' 
            : (recordingMode === 'hold' ? 'Hold to record' : 'Click to start recording')
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
