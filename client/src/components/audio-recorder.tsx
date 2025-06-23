
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Play, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AudioRecorderProps {
  onRecordingComplete: (audioBlob: Blob, duration: number) => void;
}

export function AudioRecorder({ onRecordingComplete }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
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
    
    // Stop all audio tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('🔇 Stopped track:', track.kind);
      });
      streamRef.current = null;
    }
    
    // Reset MediaRecorder
    mediaRecorderRef.current = null;
    chunksRef.current = [];
  };

  const startRecording = async () => {
    console.log('🎙️ Starting recording...');
    
    try {
      // Clean up any existing state
      cleanup();
      setIsRecording(false);
      setRecordingTime(0);
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        } 
      });
      
      streamRef.current = stream;
      chunksRef.current = [];
      
      // Use a more compatible MIME type
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/mp4';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = ''; // Let browser choose
      }
      
      console.log('✅ Selected MIME type:', mimeType);
      
      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType || undefined
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
        console.log('⏹️ MediaRecorder stopped, processing...');
        processRecording();
      };
      
      mediaRecorder.onerror = (event) => {
        console.error('❌ MediaRecorder error:', event);
        cleanup();
        setIsRecording(false);
        toast({
          title: "Recording Error",
          description: "An error occurred during recording",
          variant: "destructive"
        });
      };
      
      // Start recording
      mediaRecorder.start(1000); // Collect data every second
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
      setIsRecording(false);
      toast({
        title: "Microphone Error",
        description: "Could not access microphone. Please allow microphone access.",
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    console.log('⏹️ Stop recording requested');
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      console.log('⏹️ Stopping MediaRecorder...');
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      // The onstop event will trigger processRecording()
    } else {
      console.log('⚠️ MediaRecorder not in recording state:', mediaRecorderRef.current?.state);
      cleanup();
      setIsRecording(false);
    }
  };

  const processRecording = () => {
    if (chunksRef.current.length === 0) {
      console.warn('⚠️ No audio chunks available');
      toast({
        title: "Recording Error",
        description: "No audio data was recorded",
        variant: "destructive"
      });
      return;
    }

    console.log('🔄 Processing', chunksRef.current.length, 'chunks');
    
    // Create blob with a more universal format
    const blob = new Blob(chunksRef.current, { type: 'audio/wav' });
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
    
    // Create URL for playback
    const url = URL.createObjectURL(blob);
    console.log('🔗 Created blob URL:', url);
    
    setAudioBlob(blob);
    setAudioUrl(url);
    
    // Call completion callback
    onRecordingComplete(blob, recordingTime);
    
    // Clean up recording resources
    cleanup();
    
    toast({
      title: "Recording Complete",
      description: `Recorded ${recordingTime} seconds of audio`,
    });
  };

  const playRecording = () => {
    if (!audioUrl || !audioRef.current) return;
    
    console.log('▶️ Playing recording');
    
    audioRef.current.src = audioUrl;
    audioRef.current.play()
      .then(() => {
        setIsPlaying(true);
      })
      .catch(error => {
        console.error('❌ Play error:', error);
        toast({
          title: "Playback Error",
          description: "Could not play the recording",
          variant: "destructive"
        });
      });
  };

  const pauseRecording = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const resetRecording = () => {
    console.log('🔄 Reset recording');
    
    // Stop any playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    
    // Clean up URLs
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    
    // Reset state
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    setIsPlaying(false);
    
    // Ensure we're not recording
    if (isRecording) {
      stopRecording();
    }
  };

  // Handle audio events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => setIsPlaying(false);
    const handlePause = () => setIsPlaying(false);
    const handlePlay = () => setIsPlaying(true);

    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('play', handlePlay);

    return () => {
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('play', handlePlay);
    };
  }, [audioUrl]);

  // Auto-stop after 30 seconds
  useEffect(() => {
    if (isRecording) {
      const autoStop = setTimeout(() => {
        console.log('⏰ Auto-stop after 30 seconds');
        stopRecording();
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
        <div className="flex justify-center items-center gap-4 mb-4">
          {/* Start Recording Button */}
          <div className="relative">
            <Button
              size="lg"
              className={`w-20 h-20 rounded-full transition-all duration-200 ${
                isRecording 
                  ? 'bg-red-600 hover:bg-red-700 cursor-not-allowed opacity-50' 
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
              onClick={startRecording}
              disabled={isRecording || !!audioBlob}
            >
              <Mic className="h-8 w-8" />
            </Button>
            
            {isRecording && (
              <div className="absolute inset-0 -m-2 border-4 border-red-600 rounded-full opacity-30 animate-ping" />
            )}
          </div>
          
          {/* Stop Recording Button */}
          <Button
            size="lg"
            variant="destructive"
            className="w-20 h-20 rounded-full"
            onClick={stopRecording}
            disabled={!isRecording}
          >
            <Square className="h-8 w-8 fill-current" />
          </Button>
        </div>
        
        <div className="text-2xl font-mono font-bold text-gray-900 mb-2">
          {formatTime(recordingTime)}
        </div>
        
        <div className="text-sm text-gray-500">
          {isRecording 
            ? 'Recording... Click stop button to finish'
            : audioBlob 
            ? 'Recording complete - ready to submit' 
            : 'Click microphone to start recording'
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
            <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700">
              Ready to Play
            </span>
          </div>
          
          {/* Hidden audio element for playback */}
          <audio 
            ref={audioRef}
            preload="metadata"
            onError={(e) => {
              console.error('Audio element error:', e);
            }}
          />
          
          {/* Custom Controls */}
          <div className="flex items-center space-x-3">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={isPlaying ? pauseRecording : playRecording}
              className="w-10 h-10 rounded-full p-0"
            >
              <Play className="h-4 w-4" />
            </Button>
            
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full w-0" />
            </div>
            
            <span className="text-sm text-gray-600 min-w-[40px]">
              {formatTime(recordingTime)}
            </span>
          </div>
          
          <div className="flex space-x-2">
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
        <div className="text-xs text-gray-500 space-y-1 bg-gray-100 p-2 rounded">
          <div>Blob size: {audioBlob.size} bytes</div>
          <div>Blob type: {audioBlob.type}</div>
          <div>Duration: {recordingTime}s</div>
        </div>
      )}
    </div>
  );
}
