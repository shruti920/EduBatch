import React from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays,
  Users,
  ClipboardCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  GraduationCap,
} from "lucide-react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { useAuth } from "../../context/AuthContext";

const TeacherDashboard = () => {
  const { user } = useAuth();

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-[#E5E3DC]">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-mono tracking-wider uppercase text-[#5A6275]">
              <span>FACULTY ROSTER DESK</span>
              <span>•</span>
              <span className="px-1.5 py-0.5 rounded bg-[#EDF7F2] text-[#1E4934] border border-[#A3D4BC] font-semibold">
                ACTIVE SEMESTER
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1B2A4A] tracking-tight mt-1">
              Faculty Schedule & Roll Call Ledger
            </h1>
            <p className="text-xs text-[#5A6275] font-sans mt-0.5">
              Welcome back, {user?.name || "Professor"}. Track your cohort schedules, roll call logs, and syllabus progress.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#1B2A4A] hover:bg-[#253963] text-white text-xs font-semibold rounded shadow-xs transition-colors cursor-pointer">
              <ClipboardCheck size={14} className="text-[#D99A2B]" />
              <span>Mark Today's Attendance</span>
            </button>
          </div>
        </div>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-[#E5E3DC] rounded-lg p-4 shadow-2xs">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#5A6275] font-semibold">
              ASSIGNED COHORTS
            </div>
            <div className="text-3xl font-serif font-bold text-[#1B2A4A] mt-1">2</div>
            <div className="text-[11px] text-[#2F6E4F] font-mono mt-2 flex items-center gap-1">
              <CheckCircle2 size={12} />
              <span>Physics HOD Division</span>
            </div>
          </div>

          <div className="bg-white border border-[#E5E3DC] rounded-lg p-4 shadow-2xs">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#5A6275] font-semibold">
              TOTAL STUDENTS
            </div>
            <div className="text-3xl font-serif font-bold text-[#1B2A4A] mt-1">85</div>
            <div className="text-[11px] text-[#5A6275] font-mono mt-2">
              Across assigned batches
            </div>
          </div>

          <div className="bg-white border border-[#E5E3DC] rounded-lg p-4 shadow-2xs">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#5A6275] font-semibold">
              TODAY'S CLASSES
            </div>
            <div className="text-3xl font-serif font-bold text-[#1B2A4A] mt-1">1</div>
            <div className="text-[11px] text-[#D99A2B] font-mono mt-2 flex items-center gap-1 font-semibold">
              <Clock size={12} />
              <span>07:00 – 09:30 AM (Hall-301)</span>
            </div>
          </div>

          <div className="bg-white border border-[#E5E3DC] rounded-lg p-4 shadow-2xs">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#5A6275] font-semibold">
              ROLL CALL STATUS
            </div>
            <div className="text-3xl font-serif font-bold text-[#2F6E4F] mt-1">VERIFIED</div>
            <div className="text-[11px] text-[#5A6275] font-mono mt-2">
              All previous registers locked
            </div>
          </div>
        </div>

        {/* Assigned Batches Section */}
        <div className="bg-white border border-[#E5E3DC] rounded-lg p-5 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E3DC]">
            <h2 className="font-serif font-bold text-[#1B2A4A] text-lg">
              Active Batches Under Charge
            </h2>
            <span className="text-xs font-mono text-[#5A6275]">2 Active Batches</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="p-4 border border-[#E5E3DC] rounded-lg bg-[#FCFBF8]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-[#1B2A4A]">#JEE-2026-M1</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#EDF7F2] text-[#1E4934] border border-[#A3D4BC]">
                  ACTIVE
                </span>
              </div>
              <h3 className="text-base font-serif font-bold text-[#1B2A4A] mt-2">
                JEE Advanced 2026 — Morning Batch A
              </h3>
              <p className="text-xs text-[#5A6275] mt-1">
                Physics, Calculus & Advanced Mechanics. 40 Students enrolled.
              </p>
              <div className="mt-4 pt-3 border-t border-[#E5E3DC] flex items-center justify-between">
                <span className="text-[11px] font-mono text-[#5A6275]">Mon, Wed, Fri (07:00 AM)</span>
                <button className="px-2.5 py-1 bg-[#1B2A4A] hover:bg-[#253963] text-white rounded text-xs font-medium transition-colors">
                  Take Attendance
                </button>
              </div>
            </div>

            <div className="p-4 border border-[#E5E3DC] rounded-lg bg-[#FCFBF8]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-[#1B2A4A]">#JEE-REPEAT-R1</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#EDF7F2] text-[#1E4934] border border-[#A3D4BC]">
                  ACTIVE
                </span>
              </div>
              <h3 className="text-base font-serif font-bold text-[#1B2A4A] mt-2">
                JEE Droppers Intensive Revision
              </h3>
              <p className="text-xs text-[#5A6275] mt-1">
                Problem Solving & Daily Tests. 45 Students enrolled.
              </p>
              <div className="mt-4 pt-3 border-t border-[#E5E3DC] flex items-center justify-between">
                <span className="text-[11px] font-mono text-[#5A6275]">Daily (08:00 AM)</span>
                <button className="px-2.5 py-1 bg-[#1B2A4A] hover:bg-[#253963] text-white rounded text-xs font-medium transition-colors">
                  Take Attendance
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default TeacherDashboard;
