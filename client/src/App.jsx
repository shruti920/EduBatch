import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth, homePathFor } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import ErrorBoundary from "./components/ErrorBoundary";
import NotFound from "./pages/NotFound";
import Notices from "./pages/notices/Notices";
import { ProtectedRoute, PublicOnlyRoute } from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Unauthorized from "./pages/Unauthorized";
import AdminDashboard from "./pages/admin/AdminDashboard";
import BatchRegistry from "./pages/admin/BatchRegistry";
import EnrollmentRoster from "./pages/admin/EnrollmentRoster";
import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import StudentDashboard from "./pages/student/StudentDashboard";
import AttendanceRegister from "./pages/attendance/AttendanceRegister";
import Payments from "./pages/payments/Payments";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Profile from "./pages/profile/Profile";
import Users from "./pages/admin/Users";

const RootRedirect = () => {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) return null;
  return <Navigate to={isAuthenticated ? homePathFor(user.role) : "/login"} replace />;
};

const guard = (roles, element) => <ProtectedRoute allowedRoles={roles}>{element}</ProtectedRoute>;

const App = () => (
  <BrowserRouter>
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route
              path="/login"
              element={
                <PublicOnlyRoute>
                  <Login />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/register"
              element={
                <PublicOnlyRoute>
                  <Register />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/forgot-password"
              element={
                <PublicOnlyRoute>
                  <ForgotPassword />
                </PublicOnlyRoute>
              }
            />
            {/* Not PublicOnly: the emailed link must work even if another account is signed in */}
            <Route path="/reset-password/:token" element={<ResetPassword />} />
            <Route path="/unauthorized" element={<Unauthorized />} />

            <Route path="/admin" element={guard(["admin"], <AdminDashboard />)} />
            <Route path="/admin/batches" element={guard(["admin"], <BatchRegistry />)} />
            <Route path="/admin/users" element={guard(["admin"], <Users />)} />
            <Route path="/profile" element={guard(["admin", "teacher", "student"], <Profile />)} />
            <Route path="/enrollments" element={guard(["admin", "teacher"], <EnrollmentRoster />)} />
            <Route path="/attendance" element={guard(["admin", "teacher", "student"], <AttendanceRegister />)} />
            <Route path="/payments" element={guard(["admin", "student"], <Payments />)} />
            <Route path="/notices" element={guard(["admin", "teacher", "student"], <Notices />)} />
            <Route path="/teacher" element={guard(["teacher"], <TeacherDashboard />)} />
            <Route path="/student" element={guard(["student"], <StudentDashboard />)} />

            <Route path="/" element={<RootRedirect />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  </BrowserRouter>
);

export default App;
