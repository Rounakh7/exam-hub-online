import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";

// Pages
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import AdminDashboard from "./pages/admin/AdminDashboard";
import ManageExams from "./pages/admin/ManageExams";
import ExamEditor from "./pages/admin/ExamEditor";
import StudentDashboard from "./pages/student/StudentDashboard";
import TakeExam from "./pages/student/TakeExam";
import ExamResult from "./pages/student/ExamResult";
import StudentResults from "./pages/student/StudentResults";
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient();

// Home redirect based on role
function HomeRedirect() {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-hero">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  return <Navigate to="/student" replace />;
}

const AppRoutes = () => (
  <Routes>
    {/* Public routes */}
    <Route path="/login" element={<Login />} />
    <Route path="/signup" element={<Signup />} />

    {/* Home redirect */}
    <Route path="/" element={<HomeRedirect />} />

    {/* Admin routes */}
    <Route
      path="/admin"
      element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminDashboard />
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/exams"
      element={
        <ProtectedRoute allowedRoles={['admin']}>
          <ManageExams />
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/exams/new"
      element={
        <ProtectedRoute allowedRoles={['admin']}>
          <ExamEditor />
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/exams/:id"
      element={
        <ProtectedRoute allowedRoles={['admin']}>
          <ExamEditor />
        </ProtectedRoute>
      }
    />

    {/* Student routes */}
    <Route
      path="/student"
      element={
        <ProtectedRoute allowedRoles={['student']}>
          <StudentDashboard />
        </ProtectedRoute>
      }
    />
    <Route
      path="/student/exams"
      element={
        <ProtectedRoute allowedRoles={['student']}>
          <StudentDashboard />
        </ProtectedRoute>
      }
    />
    <Route
      path="/student/exam/:id"
      element={
        <ProtectedRoute allowedRoles={['student']}>
          <TakeExam />
        </ProtectedRoute>
      }
    />
    <Route
      path="/student/result/:id"
      element={
        <ProtectedRoute allowedRoles={['student']}>
          <ExamResult />
        </ProtectedRoute>
      }
    />
    <Route
      path="/student/results"
      element={
        <ProtectedRoute allowedRoles={['student']}>
          <StudentResults />
        </ProtectedRoute>
      }
    />

    {/* Catch-all */}
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
