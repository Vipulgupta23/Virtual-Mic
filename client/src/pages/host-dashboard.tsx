import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { QRCodeGenerator } from "@/components/qr-code-generator";
import { QuestionQueue } from "@/components/question-queue";
import { Mic, Settings, Download, Play, Pause, SkipForward, RotateCcw, StopCircle } from "lucide-react";
import type { Session, Question } from "@shared/schema";

export default function HostDashboard() {
  const { sessionId } = useParams();
  const [hostName, setHostName] = useState("");
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<Question | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Create session mutation
  const createSessionMutation = useMutation({
    mutationFn: async (data: { hostName: string }) => {
      const res = await apiRequest("POST", "/api/sessions", data);
      return res.json();
    },
    onSuccess: (session) => {
      setCurrentSession(session);
      window.history.pushState({}, "", `/host/${session.id}`);
      toast({
        title: "Session Created",
        description: `Session ${session.id} is now active`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Get session data
  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ["/api/sessions", sessionId],
    enabled: !!sessionId,
  });

  // Get questions
  const { data: questions = [], refetch: refetchQuestions } = useQuery<Question[]>({
    queryKey: ["/api/sessions", sessionId, "questions"],
    queryFn: () => fetch(`/api/sessions/${sessionId}/questions`).then(res => res.json()),
    enabled: !!sessionId,
    refetchInterval: 3000, // Poll every 3 seconds
  });

  // Update question status mutation
  const updateQuestionMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<Question> }) => {
      const res = await apiRequest("PATCH", `/api/questions/${id}`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions", sessionId, "questions"] });
    },
  });

  // Delete question mutation
  const deleteQuestionMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/questions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions", sessionId, "questions"] });
      toast({
        title: "Question Deleted",
        description: "Question has been removed from the queue",
      });
    },
  });

  // End session mutation
  const endSessionMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/sessions/${sessionId}`, { isActive: false });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions", sessionId] });
      toast({
        title: "Session Ended",
        description: "Session has been deactivated",
      });
    },
  });

  useEffect(() => {
    if (session) {
      setCurrentSession(session);
    }
  }, [session]);

  const handleCreateSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hostName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a host name",
        variant: "destructive",
      });
      return;
    }
    createSessionMutation.mutate({ hostName });
  };

  const playQuestion = (question: Question) => {
    if (audioElement) {
      audioElement.pause();
    }

    const audio = new Audio(`/api/audio/${question.audioFilename}`);
    audio.onloadedmetadata = () => {
      setCurrentlyPlaying(question);
      setAudioElement(audio);
      audio.play();
      setIsPlaying(true);
      updateQuestionMutation.mutate({ id: question.id, updates: { status: "playing" } });
    };

    audio.onended = () => {
      setIsPlaying(false);
      updateQuestionMutation.mutate({ id: question.id, updates: { status: "played" } });
      const nextQuestion = questions.find(q => q.order > question.order && q.status === "queued");
      if (nextQuestion) {
        setTimeout(() => playQuestion(nextQuestion), 1000);
      } else {
        setCurrentlyPlaying(null);
      }
    };

    audio.onerror = () => {
      toast({
        title: "Playback Error",
        description: "Could not play the audio file",
        variant: "destructive",
      });
      setIsPlaying(false);
      setCurrentlyPlaying(null);
    };
  };

  const togglePlayback = () => {
    if (!audioElement || !currentlyPlaying) return;

    if (isPlaying) {
      audioElement.pause();
      setIsPlaying(false);
    } else {
      audioElement.play();
      setIsPlaying(true);
    }
  };

  const skipQuestion = () => {
    if (audioElement) {
      audioElement.pause();
    }
    if (currentlyPlaying) {
      updateQuestionMutation.mutate({ 
        id: currentlyPlaying.id, 
        updates: { status: "skipped" } 
      });
    }
    setIsPlaying(false);
    setCurrentlyPlaying(null);
    setAudioElement(null);
  };

  const queuedQuestions = questions.filter(q => q.status === "queued");
  const participantUrl = `${window.location.origin}/session/${currentSession?.id}`;

  // Show session creation form if no active session
  if (!currentSession) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-primary mx-auto rounded-2xl flex items-center justify-center mb-4">
                <Mic className="h-8 w-8 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-semibold text-gray-900 mb-2">Virtual Mic</h1>
              <p className="text-gray-600">Create a new seminar session</p>
            </div>

            <form onSubmit={handleCreateSession} className="space-y-4">
              <div>
                <Label htmlFor="hostName">Host Name</Label>
                <Input
                  id="hostName"
                  type="text"
                  value={hostName}
                  onChange={(e) => setHostName(e.target.value)}
                  placeholder="e.g. Dr. Sarah Johnson"
                  className="mt-1"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={createSessionMutation.isPending}
              >
                {createSessionMutation.isPending ? "Creating..." : "Create Session"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <Mic className="text-primary-foreground text-lg" />
              </div>
              <div>
                <h1 className="text-xl font-medium text-gray-900">Virtual Mic</h1>
                <p className="text-sm text-gray-500">Seminar Q&A System</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{currentSession.hostName}</p>
                <p className="text-xs text-gray-500">Host</p>
              </div>
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Session Control Panel */}
          <div className="lg:col-span-1">
            <Card className="p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Session Control</h2>
              
              {/* Session Status */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-gray-900">Session Active</span>
                </div>
                <Badge variant="secondary">#{currentSession.id}</Badge>
              </div>

              {/* QR Code Display */}
              <div className="text-center mb-6">
                <QRCodeGenerator value={participantUrl} size={128} />
                <p className="text-sm text-gray-600 mt-2">Participants scan to join</p>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="mt-2"
                  onClick={() => {
                    navigator.clipboard.writeText(participantUrl);
                    toast({ title: "Link copied to clipboard" });
                  }}
                >
                  Copy Link
                </Button>
              </div>

              {/* Session Stats */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="text-center p-4 bg-gray-50 rounded-xl">
                  <div className="text-2xl font-bold text-primary">{currentSession.participantCount}</div>
                  <div className="text-sm text-gray-600">Participants</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-xl">
                  <div className="text-2xl font-bold text-green-600">{questions.length}</div>
                  <div className="text-sm text-gray-600">Questions</div>
                </div>
              </div>

              {/* Session Controls */}
              <div className="space-y-3">
                <Button 
                  variant="destructive" 
                  className="w-full"
                  onClick={() => endSessionMutation.mutate()}
                  disabled={endSessionMutation.isPending}
                >
                  <StopCircle className="h-4 w-4 mr-2" />
                  End Session
                </Button>
                <Button variant="outline" className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Export Report
                </Button>
              </div>
            </Card>
          </div>

          {/* Question Queue */}
          <div className="lg:col-span-2">
            <Card>
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium text-gray-900">Question Queue</h2>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">Auto-refresh</span>
                    <div className="w-8 h-4 bg-primary rounded-full relative">
                      <div className="w-3 h-3 bg-white rounded-full absolute right-0.5 top-0.5"></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {/* Currently Playing */}
                {currentlyPlaying && (
                  <div className="mb-6 p-4 bg-primary/10 border border-primary/20 rounded-xl">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium text-primary">Now Playing</h3>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                        <span className="text-primary-foreground font-medium text-sm">
                          {currentlyPlaying.participantName?.slice(0, 2).toUpperCase() || "AN"}
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{currentlyPlaying.participantName || "Anonymous"}</p>
                        <p className="text-sm text-gray-600">Duration: {Math.floor(currentlyPlaying.duration / 60)}:{(currentlyPlaying.duration % 60).toString().padStart(2, '0')}</p>
                      </div>
                    </div>
                    
                    {/* Playback Controls */}
                    <div className="flex items-center justify-center space-x-4 mt-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={togglePlayback}
                      >
                        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={skipQuestion}
                      >
                        <SkipForward className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                <QuestionQueue
                  questions={queuedQuestions}
                  onPlay={playQuestion}
                  onDelete={(id) => deleteQuestionMutation.mutate(id)}
                  onPrioritize={(question) => {
                    updateQuestionMutation.mutate({
                      id: question.id,
                      updates: { order: 0 }
                    });
                  }}
                />
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
