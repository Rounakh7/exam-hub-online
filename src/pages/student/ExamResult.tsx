import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, XCircle, Clock, Trophy, ArrowLeft, Home, Loader2 } from 'lucide-react';

interface ResultData {
  id: string;
  score: number;
  total_questions: number;
  correct_answers: number;
  time_taken_seconds: number | null;
  completed_at: string;
  exam: {
    id: string;
    title: string;
    category: string;
  };
}

interface AnswerDetail {
  id: string;
  selected_option: string | null;
  is_correct: boolean;
  question: {
    id: string;
    question_text: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    correct_option: string;
    order_index: number;
  };
}

export default function ExamResult() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [result, setResult] = useState<ResultData | null>(null);
  const [answers, setAnswers] = useState<AnswerDetail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResult();
  }, [id]);

  const fetchResult = async () => {
    try {
      const { data: resultData, error: resultError } = await supabase
        .from('exam_results')
        .select('*, exam:exams(id, title, category)')
        .eq('id', id)
        .single();

      if (resultError) throw resultError;

      const { data: answersData, error: answersError } = await supabase
        .from('student_answers')
        .select('*, question:questions(*)')
        .eq('result_id', id)
        .order('question(order_index)');

      if (answersError) throw answersError;

      setResult(resultData);
      setAnswers(answersData || []);
    } catch (error) {
      console.error('Error fetching result:', error);
      navigate('/student');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-info';
    if (score >= 40) return 'text-warning';
    return 'text-destructive';
  };

  const getScoreMessage = (score: number) => {
    if (score >= 80) return 'Excellent! Outstanding performance! 🎉';
    if (score >= 60) return 'Good job! Keep practicing! 👍';
    if (score >= 40) return 'Fair attempt. More practice needed. 💪';
    return 'Keep learning. You can do better! 📚';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-hero">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-hero">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Result not found</p>
          <Button onClick={() => navigate('/student')}>Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/student')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <Link to="/student">
            <Button variant="outline" size="sm">
              <Home className="w-4 h-4 mr-2" />
              Home
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Score Card */}
        <Card className="shadow-card border-0 overflow-hidden">
          <div className="gradient-primary p-6 text-center text-primary-foreground">
            <Trophy className="w-16 h-16 mx-auto mb-4 opacity-90" />
            <h1 className="text-3xl font-display font-bold mb-2">{result.exam.title}</h1>
            <p className="opacity-80 capitalize">{result.exam.category} Exam</p>
          </div>
          <CardContent className="p-6">
            <div className="text-center mb-6">
              <p className="text-6xl font-display font-bold mb-2">
                <span className={getScoreColor(result.score)}>{result.score}%</span>
              </p>
              <p className="text-muted-foreground">{getScoreMessage(result.score)}</p>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 rounded-lg bg-success/10">
                <CheckCircle2 className="w-6 h-6 text-success mx-auto mb-2" />
                <p className="text-2xl font-bold text-success">{result.correct_answers}</p>
                <p className="text-sm text-muted-foreground">Correct</p>
              </div>
              <div className="p-4 rounded-lg bg-destructive/10">
                <XCircle className="w-6 h-6 text-destructive mx-auto mb-2" />
                <p className="text-2xl font-bold text-destructive">
                  {result.total_questions - result.correct_answers}
                </p>
                <p className="text-sm text-muted-foreground">Wrong</p>
              </div>
              <div className="p-4 rounded-lg bg-info/10">
                <Clock className="w-6 h-6 text-info mx-auto mb-2" />
                <p className="text-2xl font-bold text-info">
                  {result.time_taken_seconds ? formatTime(result.time_taken_seconds) : '-'}
                </p>
                <p className="text-sm text-muted-foreground">Time Taken</p>
              </div>
            </div>

            <div className="mt-6">
              <div className="flex justify-between text-sm mb-2">
                <span>Accuracy</span>
                <span>{result.score}%</span>
              </div>
              <Progress value={result.score} className="h-3" />
            </div>
          </CardContent>
        </Card>

        {/* Answers Review */}
        <Card className="shadow-card border-0">
          <CardHeader>
            <CardTitle className="font-display">Answer Review</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {answers.map((answer, index) => (
              <div
                key={answer.id}
                className={`p-4 rounded-lg border-2 ${
                  answer.is_correct ? 'border-success/30 bg-success/5' : 'border-destructive/30 bg-destructive/5'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      answer.is_correct ? 'bg-success text-success-foreground' : 'bg-destructive text-destructive-foreground'
                    }`}
                  >
                    {answer.is_correct ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <XCircle className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium mb-2">
                      Q{index + 1}. {answer.question.question_text}
                    </p>
                    <div className="grid gap-2 text-sm">
                      {(['A', 'B', 'C', 'D'] as const).map((opt) => {
                        const optionText = answer.question[`option_${opt.toLowerCase()}` as keyof typeof answer.question] as string;
                        const isCorrect = answer.question.correct_option === opt;
                        const isSelected = answer.selected_option === opt;

                        return (
                          <div
                            key={opt}
                            className={`p-2 rounded flex items-center gap-2 ${
                              isCorrect
                                ? 'bg-success/20 text-success'
                                : isSelected && !isCorrect
                                ? 'bg-destructive/20 text-destructive'
                                : 'text-muted-foreground'
                            }`}
                          >
                            <span className="font-medium w-6">{opt}.</span>
                            <span>{optionText}</span>
                            {isCorrect && <CheckCircle2 className="w-4 h-4 ml-auto" />}
                            {isSelected && !isCorrect && <XCircle className="w-4 h-4 ml-auto" />}
                          </div>
                        );
                      })}
                    </div>
                    {!answer.selected_option && (
                      <p className="text-sm text-warning mt-2">⚠️ Not answered</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/student">
            <Button variant="outline" className="w-full sm:w-auto">
              <Home className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <Link to={`/student/exam/${result.exam.id}`}>
            <Button className="w-full sm:w-auto gradient-primary">
              Retake Exam
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
