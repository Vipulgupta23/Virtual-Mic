import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AudioRecorder } from "@/components/audio-recorder";
import { Mic, CheckCircle } from "lucide-react";
import type { Session } from "@shared/schema";

export default function ParticipantInterface() {
  const { sessionId } = useParams();
  const [participantName, setParticipantName] = useState("");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [duration, setDuration] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  const { toast } = useToast();

  // Get session data
  const { data: session, isLoading } = useQuery<Session>({
    queryKey: ["/api/sessions", sessionId],
    enabled: !!sessionId,
  });

  // Submit question mutation
  const submitQuestionMutation = useMutation({
    mutationFn: async () => {
      if (!audioBlob || !sessionId) {
        throw new Error("Missing audio recording or session ID");
      }

      const formData = new FormData();
      formData.append('audio', audioBlob, 'question.webm');
      formData.append('sessionId', sessionId);
      formData.append('participantName', participantName || 'Anonymous');
      formData.append('duration', duration.toString());

      const response = await fetch('/api/questions', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      return response.json();
    },
    onSuccess: () => {
      setIsSubmitted(true);
      toast({
        title: "Question Submitted!",
        description: "Your question has been added to the queue",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Submission Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!audioBlob) {
      toast({
        title: "No Recording",
        description: "Please record your question first",
        variant: "destructive",
      });
      return;
    }
    submitQuestionMutation.mutate();
  };

  const resetForm = () => {
    setIsSubmitted(false);
    setAudioBlob(null);
    setDuration(0);
    setParticipantName("");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading session...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <div className="text-red-500 mb-4">
              <Mic className="h-12 w-12 mx-auto" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Session Not Found</h2>
            <p className="text-gray-600">This session may have ended or the link is invalid.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!session.isActive) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <div className="text-gray-400 mb-4">
              <Mic className="h-12 w-12 mx-auto" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Session Ended</h2>
            <p className="text-gray-600">This session is no longer accepting questions.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm mx-auto shadow-2xl">
        {/* Header */}
        <div className="bg-primary text-primary-foreground p-6 text-center rounded-t-lg">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <Mic className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-medium">Virtual Mic</h2>
          <p className="text-primary-foreground/80 text-sm">Ask your question</p>
        </div>

        <CardContent className="p-6">
          {isSubmitted ? (
            /* Success State */
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Question Submitted!</h3>
              <p className="text-gray-600 text-sm mb-4">
                Your question has been added to the queue. The host will play it when ready.
              </p>
              <Button onClick={resetForm} className="px-6">
                Ask Another Question
              </Button>
            </div>
          ) : (
            /* Recording Interface */
            <>
              <div className="text-center mb-6 text-gray-600">
                <p className="text-sm">Hold the button to record your question</p>
              </div>

              {/* Audio Recorder */}
              <div className="mb-6">
                <AudioRecorder
                  onRecordingComplete={(blob, duration) => {
                    setAudioBlob(blob);
                    setDuration(duration);
                  }}
                />
              </div>

              {/* Participant Name */}
              <div className="mb-6">
                <Label htmlFor="participantName" className="text-sm font-medium text-gray-700">
                  Your Name (Optional)
                </Label>
                <Input
                  id="participantName"
                  type="text"
                  placeholder="e.g. John Smith"
                  value={participantName}
                  onChange={(e) => setParticipantName(e.target.value)}
                  className="mt-2"
                />
              </div>

              {/* Submit Button */}
              <Button
                onClick={handleSubmit}
                disabled={!audioBlob || submitQuestionMutation.isPending}
                className="w-full py-4"
              >
                {submitQuestionMutation.isPending ? (
                  "Submitting..."
                ) : (
                  <>
                    <Mic className="h-4 w-4 mr-2" />
                    Submit Question
                  </>
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
