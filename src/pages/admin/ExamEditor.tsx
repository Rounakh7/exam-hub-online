import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Plus, Trash2, Save, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Question {
  id?: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: 'A' | 'B' | 'C' | 'D';
  order_index: number;
}

type ExamCategory = 'basic' | 'prelims' | 'mains';

interface ExamForm {
  title: string;
  description: string;
  category: ExamCategory;
  duration_minutes: number;
  is_active: boolean;
}

const DURATION_BY_CATEGORY = {
  basic: 40,
  prelims: 20,
  mains: 30,
};

export default function ExamEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEditing = !!id;

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [exam, setExam] = useState<ExamForm>({
    title: '',
    description: '',
    category: 'basic',
    duration_minutes: 40,
    is_active: true,
  });
  const [questions, setQuestions] = useState<Question[]>([]);

  useEffect(() => {
    if (isEditing) {
      fetchExam();
    }
  }, [id]);

  const fetchExam = async () => {
    try {
      const { data: examData, error: examError } = await supabase
        .from('exams')
        .select('*')
        .eq('id', id)
        .single();

      if (examError) throw examError;

      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('exam_id', id)
        .order('order_index');

      if (questionsError) throw questionsError;

      setExam({
        title: examData.title,
        description: examData.description || '',
        category: examData.category,
        duration_minutes: examData.duration_minutes,
        is_active: examData.is_active,
      });

      setQuestions((questionsData || []).map(q => ({
        ...q,
        correct_option: q.correct_option as 'A' | 'B' | 'C' | 'D',
      })));
    } catch (error) {
      console.error('Error fetching exam:', error);
      toast.error('Failed to load exam');
      navigate('/admin/exams');
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (category: ExamCategory) => {
    setExam(prev => ({
      ...prev,
      category,
      duration_minutes: DURATION_BY_CATEGORY[category],
    }));
  };

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        question_text: '',
        option_a: '',
        option_b: '',
        option_c: '',
        option_d: '',
        correct_option: 'A',
        order_index: questions.length,
      },
    ]);
  };

  const updateQuestion = (index: number, field: keyof Question, value: string) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!exam.title.trim()) {
      toast.error('Please enter an exam title');
      return;
    }

    if (questions.length === 0) {
      toast.error('Please add at least one question');
      return;
    }

    // Validate all questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question_text.trim() || !q.option_a.trim() || !q.option_b.trim() || !q.option_c.trim() || !q.option_d.trim()) {
        toast.error(`Please fill in all fields for question ${i + 1}`);
        return;
      }
    }

    setSaving(true);

    try {
      let examId = id;

      if (isEditing) {
        // Update existing exam
        const { error } = await supabase
          .from('exams')
          .update({
            title: exam.title,
            description: exam.description || null,
            category: exam.category,
            duration_minutes: exam.duration_minutes,
            is_active: exam.is_active,
          })
          .eq('id', id);

        if (error) throw error;

        // Delete existing questions and add new ones
        await supabase.from('questions').delete().eq('exam_id', id);
      } else {
        // Create new exam
        const { data, error } = await supabase
          .from('exams')
          .insert({
            title: exam.title,
            description: exam.description || null,
            category: exam.category,
            duration_minutes: exam.duration_minutes,
            is_active: exam.is_active,
            created_by: user?.id,
          })
          .select('id')
          .single();

        if (error) throw error;
        examId = data.id;
      }

      // Insert questions
      const questionsToInsert = questions.map((q, index) => ({
        exam_id: examId,
        question_text: q.question_text,
        option_a: q.option_a,
        option_b: q.option_b,
        option_c: q.option_c,
        option_d: q.option_d,
        correct_option: q.correct_option,
        order_index: index,
      }));

      const { error: questionsError } = await supabase
        .from('questions')
        .insert(questionsToInsert);

      if (questionsError) throw questionsError;

      toast.success(isEditing ? 'Exam updated successfully' : 'Exam created successfully');
      navigate('/admin/exams');
    } catch (error) {
      console.error('Error saving exam:', error);
      toast.error('Failed to save exam');
    } finally {
      setSaving(false);
    }
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
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/exams')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">
              {isEditing ? 'Edit Exam' : 'Create New Exam'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isEditing ? 'Update exam details and questions' : 'Set up your exam with questions'}
            </p>
          </div>
        </div>

        {/* Exam Details */}
        <Card className="shadow-card border-0">
          <CardHeader>
            <CardTitle className="font-display">Exam Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title">Exam Title</Label>
                <Input
                  id="title"
                  value={exam.title}
                  onChange={(e) => setExam({ ...exam, title: e.target.value })}
                  placeholder="e.g., Mathematics Fundamentals"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={exam.category} onValueChange={handleCategoryChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Basic (40 min)</SelectItem>
                    <SelectItem value="prelims">Prelims (20 min)</SelectItem>
                    <SelectItem value="mains">Mains (30 min)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={exam.description}
                onChange={(e) => setExam({ ...exam, description: e.target.value })}
                placeholder="Brief description of the exam..."
                rows={3}
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="active"
                checked={exam.is_active}
                onCheckedChange={(checked) => setExam({ ...exam, is_active: checked })}
              />
              <Label htmlFor="active">Exam is active and visible to students</Label>
            </div>
          </CardContent>
        </Card>

        {/* Questions */}
        <Card className="shadow-card border-0">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-display">Questions ({questions.length})</CardTitle>
            <Button onClick={addQuestion} variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Question
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            {questions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No questions added yet</p>
                <Button onClick={addQuestion} variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Add your first question
                </Button>
              </div>
            ) : (
              questions.map((question, index) => (
                <div
                  key={index}
                  className="p-4 rounded-lg border border-border bg-muted/30 space-y-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <Label>Question {index + 1}</Label>
                      <Textarea
                        value={question.question_text}
                        onChange={(e) => updateQuestion(index, 'question_text', e.target.value)}
                        placeholder="Enter your question..."
                        rows={2}
                      />
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive shrink-0">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Question?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this question?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => removeQuestion(index)}
                            className="bg-destructive text-destructive-foreground"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {(['A', 'B', 'C', 'D'] as const).map((option) => (
                      <div key={option} className="flex items-center gap-2">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium shrink-0 cursor-pointer transition-colors ${
                            question.correct_option === option
                              ? 'bg-success text-success-foreground'
                              : 'bg-muted text-muted-foreground hover:bg-muted/80'
                          }`}
                          onClick={() => updateQuestion(index, 'correct_option', option)}
                          title={question.correct_option === option ? 'Correct answer' : 'Click to mark as correct'}
                        >
                          {option}
                        </div>
                        <Input
                          value={question[`option_${option.toLowerCase()}` as keyof Question] as string}
                          onChange={(e) =>
                            updateQuestion(index, `option_${option.toLowerCase()}` as keyof Question, e.target.value)
                          }
                          placeholder={`Option ${option}`}
                          className="flex-1"
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Click on A, B, C, or D to mark the correct answer
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end gap-4">
          <Button variant="outline" onClick={() => navigate('/admin/exams')}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="gradient-primary" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {isEditing ? 'Update Exam' : 'Create Exam'}
              </>
            )}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
