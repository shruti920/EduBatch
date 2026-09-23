import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShieldAlert, ArrowLeft, GraduationCap } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const Unauthorized = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const getAuthorizedPath = () => {
    if (user?.role === "admin") return "/admin";
    if (user?.role === "teacher") return "/teacher";
    return "/student";
  };

  return (
    <div className="min-h-screen bg-[#F7F6F2] flex flex-col justify-center items-center p-4 antialiased">
      <div className="max-w-md w-full bg-white border border-[#E5E3DC] rounded-lg shadow-sm p-6 sm:p-8 text-center">
        <div className="w-14 h-14 bg-[#FDF1F0] border border-[#F3AAA5] rounded-full flex items-center justify-center mx-auto text-[#B23A32] mb-4">
          <ShieldAlert size={28} />
        </div>

        <div className="text-[11px] font-mono uppercase tracking-widest text-[#B23A32] font-semibold mb-1">
          Security Violation • 403 Forbidden
        </div>

        <h1 className="text-2xl font-serif font-bold text-[#1B2A4A] tracking-tight mb-2">
          Access Restricted
        </h1>

        <p className="text-xs text-[#5A6275] leading-relaxed mb-6">
          Your current authenticated profile (
          <span className="font-mono font-bold text-[#1B2A4A]">
            {user?.role?.toUpperCase() || "ANONYMOUS"}
          </span>
          ) does not hold the administrative clearance required to view this registry section.
        </p>

        <div className="p-3 bg-[#F7F6F2] border border-[#E5E3DC] rounded mb-6 text-left">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#5A6275] font-semibold mb-1">
            Audit Metadata:
          </div>
          <div className="text-xs text-[#22242B] font-mono">
            User: {user?.email || "N/A"}
          </div>
          <div className="text-xs text-[#22242B] font-mono">
            Clearance Level: Level {user?.role === "admin" ? "3 (Full)" : user?.role === "teacher" ? "2 (Faculty)" : "1 (Candidate)"}
          </div>
        </div>

        <button
          onClick={() => navigate(getAuthorizedPath())}
          className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-[#1B2A4A] hover:bg-[#253963] text-white text-xs font-semibold rounded uppercase tracking-wider transition-colors shadow-xs cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>Return to Authorized Console</span>
        </button>
      </div>
    </div>
  );
};

export default Unauthorized;
