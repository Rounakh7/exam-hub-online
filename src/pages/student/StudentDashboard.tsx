import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Clock, Trophy, PlayCircle, Loader2 } from 'lucide-react';

interface Exam {
  id: string;
  title: string;
  description: string | null;
  category: 'basic' | 'prelims' | 'mains';
  duration_minutes: number;
  question_count?: number;
}

interface ExamResult {
  id: string;
  exam_id: string;
  score: number;
  total_questions: number;
  correct_answers: number;
  completed_at: string;
  exam?: Exam;
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const [exams, setExams] = useState<Exam[]>([]);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('basic');

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      // Fetch active exams
      const { data: examsData } = await supabase
        .from('exams')
        .select('*, questions(id)')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      const examsWithCount = examsData?.map(exam => ({
        ...exam,
        question_count: exam.questions?.length || 0,
      })) || [];

      setExams(examsWithCount);

      // Fetch user's results
      if (user) {
        const { data: resultsData } = await supabase
          .from('exam_results')
          .select('*')
          .eq('user_id', user.id)
          .order('completed_at', { ascending: false })
          .limit(5);

        setResults(resultsData || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
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

  const getCategoryBgColor = (category: string) => {
    switch (category) {
      case 'basic':
        return 'gradient-primary';
      case 'prelims':
        return 'bg-exam-prelims';
      case 'mains':
        return 'bg-exam-mains';
      default:
        return 'bg-muted';
    }
  };

  const filteredExams = exams.filter(exam => exam.category === activeTab);

  const stats = {
    totalAttempts: results.length,
    avgScore: results.length > 0 
      ? Math.round(results.reduce((acc, r) => acc + (r.correct_answers / r.total_questions) * 100, 0) / results.length)
      : 0,
    examsAvailable: exams.length,
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">
            Welcome Back! 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            Ready to ace your next exam? Choose a category to get started.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6">
          <Card className="shadow-card border-0">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Exams Available</p>
                  <p className="text-3xl font-display font-bold mt-1">{stats.examsAvailable}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card border-0">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Exams Taken</p>
                  <p className="text-3xl font-display font-bold mt-1">{stats.totalAttempts}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card border-0">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg. Score</p>
                  <p className="text-3xl font-display font-bold mt-1">{stats.avgScore}%</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-info/10 flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-info" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Exams by Category */}
        <Card className="shadow-card border-0">
          <CardHeader>
            <CardTitle className="font-display">Available Exams</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="basic" className="data-[state=active]:bg-exam-basic data-[state=active]:text-exam-basic-foreground">
                  Basic
                </TabsTrigger>
                <TabsTrigger value="prelims" className="data-[state=active]:bg-exam-prelims data-[state=active]:text-white">
                  Prelims
                </TabsTrigger>
                <TabsTrigger value="mains" className="data-[state=active]:bg-exam-mains data-[state=active]:text-white">
                  Mains
                </TabsTrigger>
              </TabsList>

              {['basic', 'prelims', 'mains'].map((category) => (
                <TabsContent key={category} value={category}>
                  {filteredExams.length === 0 ? (
                    <div className="text-center py-12">
                      <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        No {category} exams available yet
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {filteredExams.map((exam) => (
                        <Card key={exam.id} className="border hover:shadow-soft transition-shadow">
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between mb-4">
                              <div className={`w-12 h-12 rounded-xl ${getCategoryBgColor(exam.category)} flex items-center justify-center`}>
                                <BookOpen className="w-6 h-6 text-primary-foreground" />
                              </div>
                              <Badge variant="outline" className={getCategoryColor(exam.category)}>
                                {exam.category}
                              </Badge>
                            </div>

                            <h3 className="font-display font-semibold text-lg mb-2">{exam.title}</h3>
                            {exam.description && (
                              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                                {exam.description}
                              </p>
                            )}

                            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {exam.duration_minutes} min
                              </span>
                              <span className="flex items-center gap-1">
                                <BookOpen className="w-4 h-4" />
                                {exam.question_count} Q
                              </span>
                            </div>

                            <Link to={`/student/exam/${exam.id}`}>
                              <Button className="w-full gradient-primary">
                                <PlayCircle className="w-4 h-4 mr-2" />
                                Start Exam
                              </Button>
                            </Link>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
