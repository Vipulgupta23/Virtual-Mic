import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
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
  const [canPlayRecording, setCanPlayRecording] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const { toast } = useToast();

  const cleanup = () => {
    console.log('🧹 Cleanup called');
    
    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // Stop MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (error) {
        console.error('Error stopping MediaRecorder:', error);
      }
    }
    
    // Stop all audio tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('🔇 Stopped track:', track.kind);
      });
      streamRef.current = null;
    }
    
    // Reset refs
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    setIsRecording(false);
  };

  const startRecording = async () => {
    console.log('🎙️ Starting recording...');
    
    try {
      // Clean up any existing state
      cleanup();
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      streamRef.current = stream;
      chunksRef.current = [];
      
      // Test supported MIME types
      const mimeTypes = [
        'audio/webm',
        'audio/webm;codecs=opus',
        'audio/mp4',
        'audio/ogg;codecs=opus',
        'audio/wav'
      ];
      
      let selectedMimeType = 'audio/webm';
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType;
          console.log('✅ Selected MIME type:', mimeType);
          break;
        }
      }
      
      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: selectedMimeType
      });
      
      mediaRecorderRef.current = mediaRecorder;
      
      // Set up event handlers
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
          console.log('📊 Audio chunk:', event.data.size, 'bytes');
        }
      };
      
      mediaRecorder.onstop = () => {
        console.log('⏹️ MediaRecorder stopped');
        processRecording(selectedMimeType);
      };
      
      mediaRecorder.onerror = (event) => {
        console.error('❌ MediaRecorder error:', event);
        cleanup();
        toast({
          title: "Recording Error",
          description: "An error occurred during recording",
          variant: "destructive"
        });
      };
      
      // Start recording
      mediaRecorder.start(100); // Collect data every 100ms for better responsiveness
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      console.log('✅ Recording started successfully');
      
    } catch (error) {
      console.error('❌ Error starting recording:', error);
      cleanup();
      toast({
        title: "Microphone Error",
        description: "Could not access microphone. Please allow microphone access.",
        variant: "destructive"
      });
    }
  };

  const processRecording = (mimeType: string) => {
    if (chunksRef.current.length === 0) {
      console.warn('⚠️ No audio chunks available');
      return;
    }

    console.log('🔄 Processing', chunksRef.current.length, 'chunks');
    
    // Create blob
    const blob = new Blob(chunksRef.current, { type: mimeType });
    console.log('📦 Created blob:', blob.size, 'bytes, type:', blob.type);
    
    if (blob.size === 0) {
      console.error('❌ Empty blob created');
      toast({
        title: "Recording Error",
        description: "No audio was recorded",
        variant: "destructive"
      });
      return;
    }
    
    // Create URL for playback testing
    const url = URL.createObjectURL(blob);
    console.log('🔗 Created blob URL:', url);
    
    setAudioBlob(blob);
    setAudioUrl(url);
    
    // Test if audio can be played
    testAudioPlayback(url);
    
    // Call completion callback
    onRecordingComplete(blob, recordingTime);
  };

  const testAudioPlayback = (url: string) => {
    const testAudio = new Audio(url);
    
    testAudio.oncanplay = () => {
      console.log('✅ Audio can be played');
      setCanPlayRecording(true);
    };
    
    testAudio.onerror = (error) => {
      console.error('❌ Audio playback test failed:', error);
      setCanPlayRecording(false);
    };
    
    testAudio.load();
  };

  const stopRecording = () => {
    console.log('⏹️ Stop recording requested');
    cleanup();
  };

  const playRecording = () => {
    if (!audioUrl || !audioRef.current) return;
    
    console.log('▶️ Playing recording');
    audioRef.current.src = audioUrl;
    audioRef.current.play().catch(error => {
      console.error('❌ Play error:', error);
      toast({
        title: "Playback Error",
        description: "Could not play the recording",
        variant: "destructive"
      });
    });
  };

  const resetRecording = () => {
    console.log('🔄 Reset recording');
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    setCanPlayRecording(false);
  };

  // Auto-cleanup after 30 seconds
  useEffect(() => {
    if (isRecording) {
      const autoStop = setTimeout(() => {
        console.log('⏰ Auto-stop after 30 seconds');
        cleanup();
        toast({
          title: "Recording Stopped",
          description: "Recording automatically stopped after 30 seconds"
        });
      }, 30000);
      
      return () => clearTimeout(autoStop);
    }
  }, [isRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
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

  return (
    <div className="space-y-4">
      {/* Recording Controls */}
      <div className="text-center">
        <div className="relative inline-block mb-4">
          <Button
            size="lg"
            className={`w-24 h-24 rounded-full transition-all duration-200 ${
              isRecording 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
            onClick={isRecording ? stopRecording : startRecording}
            disabled={!!audioBlob}
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
      </div>

      {/* Audio Playback */}
      {audioUrl && (
        <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              Recording ({((audioBlob?.size || 0) / 1024).toFixed(1)} KB)
            </span>
            <span className={`text-xs px-2 py-1 rounded ${
              canPlayRecording ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {canPlayRecording ? 'Playable' : 'Format Issue'}
            </span>
          </div>
          
          <audio 
            ref={audioRef}
            controls 
            className="w-full"
            onError={(e) => {
              console.error('Audio element error:', e);
            }}
          />
          
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={playRecording}
              className="flex-1"
            >
              Test Play
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={resetRecording}
              className="flex-1"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Record Again
            </Button>
          </div>
        </div>
      )}
      
      {/* Debug Info */}
      {audioBlob && (
        <div className="text-xs text-gray-500 space-y-1">
          <div>Blob size: {audioBlob.size} bytes</div>
          <div>Blob type: {audioBlob.type}</div>
          <div>Duration: {recordingTime}s</div>
        </div>
      )}
    </div>
  );
}