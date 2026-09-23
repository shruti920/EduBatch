import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { GraduationCap, ShieldCheck, AlertCircle, ArrowRight, Lock, Mail, UserCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const from = location.state?.from?.pathname;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await login(email, password);
      if (from) {
        navigate(from, { replace: true });
      } else if (result.user.role === "admin") {
        navigate("/admin", { replace: true });
      } else if (result.user.role === "teacher") {
        navigate("/teacher", { replace: true });
      } else {
        navigate("/student", { replace: true });
      }
    } catch (err) {
      setError(err.message || "Failed to log in. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError("");
  };

  return (
    <div className="min-h-screen bg-[#F7F6F2] flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 antialiased">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Icon & Heading */}
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded bg-[#1B2A4A] text-white flex items-center justify-center shadow-md">
            <GraduationCap size={28} className="text-[#D99A2B]" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl sm:text-3xl font-serif font-bold text-[#1B2A4A] tracking-tight">
          EduBatch Academic Console
        </h2>
        <p className="mt-1 text-center text-xs font-mono tracking-wider text-[#5A6275] uppercase">
          Institutional Access & Credential Verification
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        {/* One-Click Demo Credentials Panel */}
        <div className="mb-4 bg-white border border-[#E5E3DC] rounded-lg p-3 shadow-2xs">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#1B2A4A] mb-2 font-sans">
            <UserCheck size={14} className="text-[#D99A2B]" />
            <span>Quick-Test Demo Profiles (Click to Auto-Fill):</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => fillDemo("admin@edubatch.com", "Admin@123")}
              className="px-2 py-1.5 bg-[#F7F6F2] hover:bg-[#E6EDF8] hover:border-[#1B2A4A] border border-[#E5E3DC] rounded text-left transition-colors"
            >
              <div className="text-[10px] font-mono font-bold text-[#1B2A4A]">ADMIN</div>
              <div className="text-[10px] text-[#5A6275] truncate">Dr. Verma</div>
            </button>
            <button
              type="button"
              onClick={() => fillDemo("teacher@edubatch.com", "Teacher@123")}
              className="px-2 py-1.5 bg-[#F7F6F2] hover:bg-[#E6EDF8] hover:border-[#1B2A4A] border border-[#E5E3DC] rounded text-left transition-colors"
            >
              <div className="text-[10px] font-mono font-bold text-[#1B2A4A]">FACULTY</div>
              <div className="text-[10px] text-[#5A6275] truncate">Prof. Alok</div>
            </button>
            <button
              type="button"
              onClick={() => fillDemo("student@edubatch.com", "Student@123")}
              className="px-2 py-1.5 bg-[#F7F6F2] hover:bg-[#E6EDF8] hover:border-[#1B2A4A] border border-[#E5E3DC] rounded text-left transition-colors"
            >
              <div className="text-[10px] font-mono font-bold text-[#1B2A4A]">CANDIDATE</div>
              <div className="text-[10px] text-[#5A6275] truncate">Aditya N.</div>
            </button>
          </div>
        </div>

        {/* Main Login Card */}
        <div className="bg-white py-6 px-6 sm:px-8 border border-[#E5E3DC] rounded-lg shadow-xs">
          {error && (
            <div className="mb-4 p-3 bg-[#FDF1F0] border border-[#F3AAA5] rounded text-xs text-[#B23A32] flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-[#1B2A4A] uppercase tracking-wider mb-1"
              >
                Institutional Email
              </label>
              <div className="relative rounded">
                <Mail
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]"
                />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@edubatch.com"
                  className="w-full pl-9 pr-3 py-2 bg-[#F7F6F2] border border-[#E5E3DC] rounded text-xs font-sans text-[#22242B] placeholder-[#64748B] focus:outline-none focus:border-[#1B2A4A] focus:bg-white transition-colors"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-[#1B2A4A] uppercase tracking-wider mb-1"
              >
                Passcode / Password
              </label>
              <div className="relative rounded">
                <Lock
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]"
                />
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 bg-[#F7F6F2] border border-[#E5E3DC] rounded text-xs font-sans text-[#22242B] placeholder-[#64748B] focus:outline-none focus:border-[#1B2A4A] focus:bg-white transition-colors"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-2.5 px-4 rounded bg-[#1B2A4A] hover:bg-[#253963] text-white text-xs font-semibold tracking-wider uppercase transition-colors disabled:opacity-50 shadow-xs cursor-pointer"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Verify & Authenticate</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Footer note & Registration link */}
          <div className="mt-5 pt-4 border-t border-[#E5E3DC] flex items-center justify-between text-xs">
            <span className="text-[#5A6275]">Candidate self-enrollment?</span>
            <Link
              to="/register"
              className="font-semibold text-[#1B2A4A] hover:text-[#D99A2B] transition-colors"
            >
              Register Account →
            </Link>
          </div>
        </div>

        {/* Security watermark footer */}
        <div className="mt-6 flex items-center justify-center gap-1.5 text-[11px] font-mono text-[#5A6275]">
          <ShieldCheck size={14} className="text-[#2F6E4F]" />
          <span>Encrypted Session: TLS 1.3 • HMAC-SHA256 • JWT Protected</span>
        </div>
      </div>
    </div>
  );
};

export default Login;
