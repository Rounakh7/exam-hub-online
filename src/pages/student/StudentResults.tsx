import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Trophy, Clock, Eye, Loader2, FileText } from 'lucide-react';

interface Result {
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

export default function StudentResults() {
  const { user } = useAuth();
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchResults();
    }
  }, [user]);

  const fetchResults = async () => {
    try {
      const { data, error } = await supabase
        .from('exam_results')
        .select('*, exam:exams(id, title, category)')
        .eq('user_id', user?.id)
        .order('completed_at', { ascending: false });

      if (error) throw error;
      setResults(data || []);
    } catch (error) {
      console.error('Error fetching results:', error);
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

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'basic':
        return 'bg-exam-basic/10 text-exam-basic border-exam-basic/20';
      case 'prelims':
        return 'bg-exam-prelims/10 text-exam-prelims border-exam-prelims/20';
      case 'mains':
        return 'bg-exam-mains/10 text-exam-mains border-exam-mains/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">
            My Results
          </h1>
          <p className="text-muted-foreground mt-1">
            View your exam history and performance
          </p>
        </div>

        {/* Results Table */}
        <Card className="shadow-card border-0">
          <CardHeader>
            <CardTitle className="font-display">Exam History</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : results.length === 0 ? (
              <div className="text-center py-12">
                <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No exams taken yet</p>
                <Link to="/student">
                  <Button>
                    <FileText className="w-4 h-4 mr-2" />
                    Browse Exams
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Exam</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Correct</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((result) => (
                      <TableRow key={result.id}>
                        <TableCell className="font-medium">{result.exam.title}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getCategoryColor(result.exam.category)}>
                            {result.exam.category}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className={`font-bold ${getScoreColor(result.score)}`}>
                            {result.score}%
                          </span>
                        </TableCell>
                        <TableCell>
                          {result.correct_answers}/{result.total_questions}
                        </TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="w-4 h-4" />
                            {result.time_taken_seconds ? formatTime(result.time_taken_seconds) : '-'}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(result.completed_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Link to={`/student/result/${result.id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4 mr-2" />
                              View
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
