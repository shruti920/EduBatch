import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GraduationCap, AlertCircle, ArrowRight, Lock, Mail, User, Phone, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passcodes do not match. Please verify.");
      return;
    }

    if (formData.password.length < 6) {
      setError("Passcode must be at least 6 characters in length.");
      return;
    }

    setLoading(true);

    try {
      await register({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
      });
      navigate("/student", { replace: true });
    } catch (err) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F6F2] flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 antialiased">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded bg-[#1B2A4A] text-white flex items-center justify-center shadow-md">
            <GraduationCap size={28} className="text-[#D99A2B]" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl sm:text-3xl font-serif font-bold text-[#1B2A4A] tracking-tight">
          Candidate Registration
        </h2>
        <p className="mt-1 text-center text-xs font-mono tracking-wider text-[#5A6275] uppercase">
          Admissions & Batch Enrollment Ledger
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-6 px-6 sm:px-8 border border-[#E5E3DC] rounded-lg shadow-xs">
          {error && (
            <div className="mb-4 p-3 bg-[#FDF1F0] border border-[#F3AAA5] rounded text-xs text-[#B23A32] flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-3.5" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="name"
                className="block text-xs font-semibold text-[#1B2A4A] uppercase tracking-wider mb-1"
              >
                Candidate Full Name
              </label>
              <div className="relative rounded">
                <User
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]"
                />
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Aditya Nair"
                  className="w-full pl-9 pr-3 py-2 bg-[#F7F6F2] border border-[#E5E3DC] rounded text-xs font-sans text-[#22242B] placeholder-[#64748B] focus:outline-none focus:border-[#1B2A4A] focus:bg-white transition-colors"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-[#1B2A4A] uppercase tracking-wider mb-1"
              >
                Official Email Address
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
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="candidate@edubatch.com"
                  className="w-full pl-9 pr-3 py-2 bg-[#F7F6F2] border border-[#E5E3DC] rounded text-xs font-sans text-[#22242B] placeholder-[#64748B] focus:outline-none focus:border-[#1B2A4A] focus:bg-white transition-colors"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="phone"
                className="block text-xs font-semibold text-[#1B2A4A] uppercase tracking-wider mb-1"
              >
                Primary Contact / WhatsApp Mobile
              </label>
              <div className="relative rounded">
                <Phone
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]"
                />
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+91 98450 11204"
                  className="w-full pl-9 pr-3 py-2 bg-[#F7F6F2] border border-[#E5E3DC] rounded text-xs font-sans text-[#22242B] placeholder-[#64748B] focus:outline-none focus:border-[#1B2A4A] focus:bg-white transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold text-[#1B2A4A] uppercase tracking-wider mb-1"
                >
                  Passcode
                </label>
                <div className="relative rounded">
                  <Lock
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]"
                  />
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Min 6 chars"
                    className="w-full pl-8 pr-3 py-2 bg-[#F7F6F2] border border-[#E5E3DC] rounded text-xs font-sans text-[#22242B] placeholder-[#64748B] focus:outline-none focus:border-[#1B2A4A] focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-xs font-semibold text-[#1B2A4A] uppercase tracking-wider mb-1"
                >
                  Confirm Passcode
                </label>
                <div className="relative rounded">
                  <Lock
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]"
                  />
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Re-enter"
                    className="w-full pl-8 pr-3 py-2 bg-[#F7F6F2] border border-[#E5E3DC] rounded text-xs font-sans text-[#22242B] placeholder-[#64748B] focus:outline-none focus:border-[#1B2A4A] focus:bg-white transition-colors"
                  />
                </div>
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
                    <span>Enroll Candidate Account</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-5 pt-4 border-t border-[#E5E3DC] flex items-center justify-between text-xs">
            <span className="text-[#5A6275]">Already registered?</span>
            <Link
              to="/login"
              className="font-semibold text-[#1B2A4A] hover:text-[#D99A2B] transition-colors"
            >
              Sign In Here →
            </Link>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-1.5 text-[11px] font-mono text-[#5A6275]">
          <ShieldCheck size={14} className="text-[#2F6E4F]" />
          <span>Role Clearance: Automatically assigned to Candidate Roster</span>
        </div>
      </div>
    </div>
  );
};

export default Register;
