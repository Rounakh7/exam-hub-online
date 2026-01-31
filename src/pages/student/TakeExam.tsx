import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Clock, ChevronLeft, ChevronRight, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Question {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  order_index: number;
}

interface Exam {
  id: string;
  title: string;
  description: string | null;
  category: string;
  duration_minutes: number;
}

export default function TakeExam() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    fetchExam();
  }, [id]);

  useEffect(() => {
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const fetchExam = async () => {
    try {
      const { data: examData, error: examError } = await supabase
        .from('exams')
        .select('*')
        .eq('id', id)
        .eq('is_active', true)
        .single();

      if (examError) throw examError;

      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('exam_id', id)
        .order('order_index');

      if (questionsError) throw questionsError;

      setExam(examData);
      setQuestions(questionsData || []);
      setTimeLeft(examData.duration_minutes * 60);
    } catch (error) {
      console.error('Error fetching exam:', error);
      toast.error('Failed to load exam');
      navigate('/student');
    } finally {
      setLoading(false);
    }
  };

  const handleAutoSubmit = useCallback(async () => {
    toast.warning('Time is up! Submitting your answers...');
    await submitExam();
  }, [answers, questions]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const selectAnswer = (questionId: string, option: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
  };

  const goToQuestion = (index: number) => {
    if (index >= 0 && index < questions.length) {
      setCurrentIndex(index);
    }
  };

  const submitExam = async () => {
    if (!user || !exam) return;

    setSubmitting(true);

    try {
      const timeTaken = Math.floor((Date.now() - startTime) / 1000);
      let correctCount = 0;

      // Calculate score
      questions.forEach((q) => {
        if (answers[q.id] === q.correct_option) {
          correctCount++;
        }
      });

      const score = Math.round((correctCount / questions.length) * 100);

      // Save result
      const { data: result, error: resultError } = await supabase
        .from('exam_results')
        .insert({
          user_id: user.id,
          exam_id: exam.id,
          score,
          total_questions: questions.length,
          correct_answers: correctCount,
          time_taken_seconds: timeTaken,
        })
        .select('id')
        .single();

      if (resultError) throw resultError;

      // Save individual answers
      const answersToInsert = questions.map((q) => ({
        result_id: result.id,
        question_id: q.id,
        selected_option: answers[q.id] || null,
        is_correct: answers[q.id] === q.correct_option,
      }));

      await supabase.from('student_answers').insert(answersToInsert);

      toast.success('Exam submitted successfully!');
      navigate(`/student/result/${result.id}`);
    } catch (error) {
      console.error('Error submitting exam:', error);
      toast.error('Failed to submit exam');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-hero">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!exam || questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-hero">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Exam not found or no questions available</p>
          <Button onClick={() => navigate('/student')}>Go Back</Button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const progress = (answeredCount / questions.length) * 100;

  const getTimerColor = () => {
    const percentage = timeLeft / (exam.duration_minutes * 60);
    if (percentage > 0.5) return 'text-success';
    if (percentage > 0.25) return 'text-warning';
    return 'text-destructive';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-card border-b border-border z-50 px-4">
        <div className="h-full max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-display font-semibold text-foreground">{exam.title}</h1>
            <p className="text-xs text-muted-foreground">
              Question {currentIndex + 1} of {questions.length}
            </p>
          </div>

          <div className={`flex items-center gap-2 text-lg font-mono font-bold ${getTimerColor()}`}>
            <div className="relative">
              <Clock className="w-5 h-5" />
              {timeLeft < 60 && <span className="absolute -top-1 -right-1 w-2 h-2 bg-destructive rounded-full timer-pulse" />}
            </div>
            {formatTime(timeLeft)}
          </div>
        </div>
      </header>

      {/* Progress */}
      <div className="fixed top-16 left-0 right-0 z-40">
        <Progress value={progress} className="h-1 rounded-none" />
      </div>

      {/* Main Content */}
      <main className="pt-20 pb-24 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Question Card */}
          <Card className="shadow-card border-0 mb-6 animate-fade-in">
            <CardHeader>
              <CardTitle className="text-lg font-display">
                Q{currentIndex + 1}. {currentQuestion.question_text}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(['A', 'B', 'C', 'D'] as const).map((option) => {
                const optionText = currentQuestion[`option_${option.toLowerCase()}` as keyof Question] as string;
                const isSelected = answers[currentQuestion.id] === option;

                return (
                  <button
                    key={option}
                    onClick={() => selectAnswer(currentQuestion.id, option)}
                    className={`w-full p-4 rounded-lg border-2 text-left transition-all flex items-center gap-3 ${
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50 hover:bg-muted/50'
                    }`}
                  >
                    <span
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium shrink-0 ${
                        isSelected
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {option}
                    </span>
                    <span className={isSelected ? 'text-foreground font-medium' : 'text-foreground'}>
                      {optionText}
                    </span>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          {/* Question Navigator */}
          <Card className="shadow-soft border-0">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground mb-3">Question Navigator</p>
              <div className="flex flex-wrap gap-2">
                {questions.map((q, index) => (
                  <button
                    key={q.id}
                    onClick={() => goToQuestion(index)}
                    className={`w-10 h-10 rounded-lg text-sm font-medium transition-all ${
                      index === currentIndex
                        ? 'gradient-primary text-primary-foreground'
                        : answers[q.id]
                        ? 'bg-success/20 text-success border border-success/30'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer Navigation */}
      <footer className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 z-50">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => goToQuestion(currentIndex - 1)}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>

          <div className="text-sm text-muted-foreground">
            {answeredCount}/{questions.length} answered
          </div>

          {currentIndex === questions.length - 1 ? (
            <Button
              onClick={() => setShowSubmitDialog(true)}
              className="gradient-primary"
            >
              <Send className="w-4 h-4 mr-2" />
              Submit
            </Button>
          ) : (
            <Button onClick={() => goToQuestion(currentIndex + 1)}>
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </footer>

      {/* Submit Confirmation Dialog */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Exam?</AlertDialogTitle>
            <AlertDialogDescription>
              You have answered {answeredCount} out of {questions.length} questions.
              {answeredCount < questions.length && (
                <span className="block mt-2 text-warning">
                  ⚠️ You have {questions.length - answeredCount} unanswered questions!
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Exam</AlertDialogCancel>
            <AlertDialogAction
              onClick={submitExam}
              className="gradient-primary"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Exam'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
