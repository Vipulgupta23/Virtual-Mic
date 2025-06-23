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
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingStateRef = useRef<boolean>(false);
  
  const { toast } = useToast();

  const stopAllTracks = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log("Track stopped:", track.kind);
      });
      streamRef.current = null;
    }
  };

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const forceStop = () => {
    console.log("🛑 FORCE STOP CALLED");
    
    // Stop recording state immediately
    recordingStateRef.current = false;
    setIsRecording(false);
    
    // Stop timer
    clearTimer();
    
    // Stop media recorder
    if (mediaRecorderRef.current) {
      try {
        if (mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
      } catch (error) {
        console.error("Error stopping MediaRecorder:", error);
      }
      mediaRecorderRef.current = null;
    }
    
    // Stop audio tracks
    stopAllTracks();
    
    // Process audio if we have chunks
    if (chunksRef.current.length > 0) {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      setAudioBlob(blob);
      setAudioUrl(URL.createObjectURL(blob));
      onRecordingComplete(blob, recordingTime);
    }
    
    // Clear chunks
    chunksRef.current = [];
    
    console.log("🛑 FORCE STOP COMPLETE");
  };

  const startRecording = async () => {
    console.log("🔴 START RECORDING");
    
    if (recordingStateRef.current) {
      console.log("Already recording, ignoring");
      return;
    }

    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });
      
      streamRef.current = stream;
      chunksRef.current = [];
      
      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      
      // Set up event handlers
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
          console.log("📊 Chunk added:", event.data.size, "bytes");
        }
      };
      
      mediaRecorder.onstop = () => {
        console.log("📱 MediaRecorder stopped naturally");
        if (chunksRef.current.length > 0) {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
          setAudioBlob(blob);
          setAudioUrl(URL.createObjectURL(blob));
          onRecordingComplete(blob, recordingTime);
        }
      };
      
      mediaRecorder.onerror = (event) => {
        console.error("MediaRecorder error:", event);
        forceStop();
      };
      
      // Start recording
      mediaRecorder.start(1000); // Collect data every second
      recordingStateRef.current = true;
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      console.log("✅ Recording started successfully");
      
    } catch (error) {
      console.error("Error starting recording:", error);
      forceStop();
      toast({
        title: "Microphone Error",
        description: "Could not access microphone. Please allow microphone access.",
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    console.log("🛑 STOP RECORDING BUTTON CLICKED");
    forceStop();
  };

  const resetRecording = () => {
    console.log("🔄 RESET RECORDING");
    setAudioBlob(null);
    setRecordingTime(0);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
  };

  // Auto-cleanup after 30 seconds
  useEffect(() => {
    if (isRecording) {
      const autoStop = setTimeout(() => {
        console.log("⏰ AUTO-STOP after 30 seconds");
        forceStop();
        toast({
          title: "Recording Stopped",
          description: "Recording automatically stopped after 30 seconds",
        });
      }, 30000);
      
      return () => clearTimeout(autoStop);
    }
  }, [isRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log("🧹 Component unmounting - cleanup");
      forceStop();
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleButtonClick = () => {
    console.log("🖱️ Button clicked - isRecording:", isRecording);
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="relative inline-block mb-4">
          <Button
            size="lg"
            className={`w-24 h-24 rounded-full transition-all duration-200 ${
              isRecording 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
            onClick={handleButtonClick}
            disabled={!!audioBlob}
            type="button"
          >
            {isRecording ? (
              <Square className="h-8 w-8 fill-current" />
            ) : (
              <Mic className="h-8 w-8" />
            )}
          </Button>
          
          {isRecording && (
            <div className="absolute inset-0 -m-4 border-4 border-red-600 rounded-full opacity-30 animate-ping" />
          )}
        </div>
        
        <div className="text-2xl font-mono font-bold text-gray-900 mb-2">
          {formatTime(recordingTime)}
        </div>
        
        <div className="text-sm text-gray-500">
          {isRecording 
            ? 'Recording... Click red button to stop'
            : audioBlob 
            ? 'Recording complete - ready to submit' 
            : 'Click blue button to start recording'
          }
        </div>
        
        {/* Force stop button for emergencies */}
        {isRecording && (
          <Button
            variant="outline"
            size="sm"
            onClick={forceStop}
            className="mt-2 text-red-600 border-red-600 hover:bg-red-50"
          >
            Force Stop
          </Button>
        )}
      </div>

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