import { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth, homePathFor } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import ErrorBoundary from "./components/ErrorBoundary";
import Preloader from "./components/brand/Preloader";
import { ProtectedRoute, PublicOnlyRoute } from "./components/ProtectedRoute";

// Each page is its own chunk, so the login page loads without the dashboards
const NotFound = lazy(() => import("./pages/NotFound"));
const Notices = lazy(() => import("./pages/notices/Notices"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Unauthorized = lazy(() => import("./pages/Unauthorized"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const BatchRegistry = lazy(() => import("./pages/admin/BatchRegistry"));
const EnrollmentRoster = lazy(() => import("./pages/admin/EnrollmentRoster"));
const TeacherDashboard = lazy(() => import("./pages/teacher/TeacherDashboard"));
const StudentDashboard = lazy(() => import("./pages/student/StudentDashboard"));
const AttendanceRegister = lazy(
  () => import("./pages/attendance/AttendanceRegister"),
);
const Payments = lazy(() => import("./pages/payments/Payments"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Profile = lazy(() => import("./pages/profile/Profile"));
const Users = lazy(() => import("./pages/admin/Users"));

const RootRedirect = () => {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) return null;
  return (
    <Navigate
      to={isAuthenticated ? homePathFor(user.role) : "/login"}
      replace
    />
  );
};

const guard = (roles, element) => (
  <ProtectedRoute allowedRoles={roles}>{element}</ProtectedRoute>
);

// Covers the first paint (and the session check) with the brand intro
const AppPreloader = () => {
  const { loading } = useAuth();
  return <Preloader busy={loading} />;
};

const App = () => (
  <BrowserRouter>
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <Suspense fallback={null}>
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
              <Route
                path="/reset-password/:token"
                element={<ResetPassword />}
              />
              <Route path="/unauthorized" element={<Unauthorized />} />

              <Route
                path="/admin"
                element={guard(["admin"], <AdminDashboard />)}
              />
              <Route
                path="/admin/batches"
                element={guard(["admin"], <BatchRegistry />)}
              />
              <Route
                path="/admin/users"
                element={guard(["admin"], <Users />)}
              />
              <Route
                path="/profile"
                element={guard(["admin", "teacher", "student"], <Profile />)}
              />
              <Route
                path="/enrollments"
                element={guard(["admin", "teacher"], <EnrollmentRoster />)}
              />
              <Route
                path="/attendance"
                element={guard(
                  ["admin", "teacher", "student"],
                  <AttendanceRegister />,
                )}
              />
              <Route
                path="/payments"
                element={guard(["admin", "student"], <Payments />)}
              />
              <Route
                path="/notices"
                element={guard(["admin", "teacher", "student"], <Notices />)}
              />
              <Route
                path="/teacher"
                element={guard(["teacher"], <TeacherDashboard />)}
              />
              <Route
                path="/student"
                element={guard(["student"], <StudentDashboard />)}
              />

              <Route path="/" element={<RootRedirect />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          <AppPreloader />
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  </BrowserRouter>
);

export default App;
