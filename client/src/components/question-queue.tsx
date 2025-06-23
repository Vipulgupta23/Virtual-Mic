import { Button } from "@/components/ui/button";
import { Play, ArrowUp, Trash2, GripVertical, Clock } from "lucide-react";
import type { Question } from "@shared/schema";

interface QuestionQueueProps {
  questions: Question[];
  onPlay: (question: Question) => void;
  onDelete: (id: number) => void;
  onPrioritize: (question: Question) => void;
}

export function QuestionQueue({ questions, onPlay, onDelete, onPrioritize }: QuestionQueueProps) {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getInitials = (name?: string) => {
    if (!name) return "AN";
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getAvatarColor = (name?: string) => {
    if (!name) return "bg-gray-500";
    const colors = [
      "bg-blue-500", "bg-green-500", "bg-purple-500", "bg-pink-500", 
      "bg-yellow-500", "bg-indigo-500", "bg-red-500", "bg-teal-500"
    ];
    const index = name.length % colors.length;
    return colors[index];
  };

  if (questions.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Play className="h-8 w-8 text-gray-300" />
        </div>
        <p className="text-lg font-medium">No questions yet</p>
        <p className="text-sm">Questions will appear here as participants submit them</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {questions.map((question, index) => (
        <div 
          key={question.id}
          className="flex items-center space-x-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center space-x-3 flex-1">
            <span className="w-6 h-6 bg-gray-400 text-white text-xs font-medium rounded-full flex items-center justify-center">
              {index + 1}
            </span>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getAvatarColor(question.participantName)}`}>
              <span className="text-white font-medium text-sm">
                {getInitials(question.participantName)}
              </span>
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">
                {question.participantName || "Anonymous"}
              </p>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Clock className="h-3 w-3" />
                <span>{formatDuration(question.duration)}</span>
                <span className="text-gray-400">•</span>
                <span>Question #{question.id}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onPlay(question)}
              className="text-gray-400 hover:text-primary"
              title="Play"
            >
              <Play className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onPrioritize(question)}
              className="text-gray-400 hover:text-green-600"
              title="Priority"
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(question.id)}
              className="text-gray-400 hover:text-red-600"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-gray-600 cursor-grab"
              title="Drag to reorder"
            >
              <GripVertical className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
