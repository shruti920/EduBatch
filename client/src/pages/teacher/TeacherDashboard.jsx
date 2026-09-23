import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays,
  Users,
  ClipboardCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  GraduationCap,
  MapPin,
  Lock,
} from "lucide-react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { useAuth } from "../../context/AuthContext";
import { getTeacherDashboard } from "../../api/dashboardApi";

const TeacherDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getTeacherDashboard()
      .then((data) => setDashboardData(data))
      .catch((err) =>
        setError(err.response?.data?.message || err.message || "Failed to load faculty dashboard.")
      )
      .finally(() => setLoading(false));
  }, []);

  const totalBatches = dashboardData?.totalBatches || 0;
  const totalStudents = dashboardData?.totalStudents || 0;
  const totalCapacity = dashboardData?.totalCapacity || 0;
  const rollCallStatus = dashboardData?.rollCallStatus || "PENDING";
  const batches = dashboardData?.batches || [];

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
              Welcome back, {user?.name || "Professor"}. Track your cohort schedules, roll call logs, and candidate attendance.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/attendance")}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#1B2A4A] hover:bg-[#253963] text-white text-xs font-semibold rounded shadow-xs transition-colors cursor-pointer"
            >
              <ClipboardCheck size={14} className="text-[#D99A2B]" />
              <span>Mark Today's Attendance</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center text-[#5A6275]">
            <div className="w-7 h-7 border-2 border-[#1B2A4A] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <span className="font-mono text-xs">Loading faculty schedule and rosters...</span>
          </div>
        ) : error ? (
          <div className="p-4 bg-[#FDF1F0] border border-[#F3AAA5] rounded text-xs text-[#B23A32]">
            {error}
          </div>
        ) : (
          <>
            {/* 4 Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-[#E5E3DC] rounded-lg p-4 shadow-2xs">
                <div className="text-[10px] font-mono uppercase tracking-wider text-[#5A6275] font-semibold">
                  ASSIGNED COHORTS
                </div>
                <div className="text-3xl font-serif font-bold text-[#1B2A4A] mt-1">
                  {totalBatches}
                </div>
                <div className="text-[11px] text-[#2F6E4F] font-mono mt-2 flex items-center gap-1">
                  <CheckCircle2 size={12} />
                  <span>Designated Faculty Lead</span>
                </div>
              </div>

              <div className="bg-white border border-[#E5E3DC] rounded-lg p-4 shadow-2xs">
                <div className="text-[10px] font-mono uppercase tracking-wider text-[#5A6275] font-semibold">
                  ENROLLED CANDIDATES
                </div>
                <div className="text-3xl font-serif font-bold text-[#1B2A4A] mt-1">
                  {totalStudents}
                </div>
                <div className="text-[11px] text-[#5A6275] font-mono mt-2">
                  Across assigned batches ({totalCapacity} Quota)
                </div>
              </div>

              <div className="bg-white border border-[#E5E3DC] rounded-lg p-4 shadow-2xs">
                <div className="text-[10px] font-mono uppercase tracking-wider text-[#5A6275] font-semibold">
                  TODAY'S ROLL CALL STATUS
                </div>
                <div
                  className={`text-3xl font-serif font-bold mt-1 ${
                    rollCallStatus === "VERIFIED"
                      ? "text-[#2F6E4F]"
                      : rollCallStatus === "PARTIAL"
                      ? "text-[#D99A2B]"
                      : "text-[#B23A32]"
                  }`}
                >
                  {rollCallStatus}
                </div>
                <div className="text-[11px] text-[#5A6275] font-mono mt-2">
                  {rollCallStatus === "VERIFIED"
                    ? "All assigned registers locked"
                    : `${dashboardData?.todaySessionsCount || 0}/${totalBatches} Sessions Recorded Today`}
                </div>
              </div>

              <div className="bg-white border border-[#E5E3DC] rounded-lg p-4 shadow-2xs">
                <div className="text-[10px] font-mono uppercase tracking-wider text-[#5A6275] font-semibold">
                  FACULTY AUDIT LEVEL
                </div>
                <div className="text-3xl font-serif font-bold text-[#1B2A4A] mt-1">Full</div>
                <div className="text-[11px] text-[#2F6E4F] font-mono mt-2 flex items-center gap-1 font-semibold">
                  <CheckCircle2 size={12} />
                  <span>Authorized Roll Call Registrar</span>
                </div>
              </div>
            </div>

            {/* Assigned Batches Section */}
            <div className="bg-white border border-[#E5E3DC] rounded-lg p-5 shadow-2xs">
              <div className="flex items-center justify-between pb-3 border-b border-[#E5E3DC]">
                <h2 className="font-serif font-bold text-[#1B2A4A] text-lg">
                  Active Batches Under Charge
                </h2>
                <span className="text-xs font-mono text-[#5A6275]">
                  {totalBatches} Active Cohort{totalBatches !== 1 ? "s" : ""}
                </span>
              </div>

              {batches.length === 0 ? (
                <div className="py-12 text-center text-[#5A6275]">
                  <CalendarDays size={32} className="text-[#64748B] mx-auto mb-2" />
                  <div className="font-serif font-bold text-[#1B2A4A] text-base">
                    No Batches Assigned Yet
                  </div>
                  <p className="text-xs text-[#5A6275] mt-1">
                    You currently have no active cohorts assigned to your faculty profile.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  {batches.map((batch) => (
                    <div
                      key={batch._id}
                      className="p-4 border border-[#E5E3DC] rounded-lg bg-[#FCFBF8]"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-[#1B2A4A]">
                          #BATCH-{batch._id.slice(-6).toUpperCase()}
                        </span>
                        {batch.isFull ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#FDF1F0] text-[#B23A32] border border-[#F3AAA5]">
                            <Lock size={10} />
                            CAPACITY LOCKED
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#EDF7F2] text-[#1E4934] border border-[#A3D4BC]">
                            {batch.enrolledCount}/{batch.capacity} ENROLLED
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-serif font-bold text-[#1B2A4A] mt-2">
                        {batch.name}
                      </h3>
                      <p className="text-xs text-[#5A6275] mt-1">
                        {batch.subject} • Schedule: {batch.schedule?.days?.join(", ") || "Mon, Wed, Fri"} (
                        {batch.schedule?.startTime} – {batch.schedule?.endTime})
                      </p>
                      <div className="mt-4 pt-3 border-t border-[#E5E3DC] flex items-center justify-between">
                        <span className="text-[11px] font-mono text-[#5A6275] flex items-center gap-1">
                          <MapPin size={11} className="text-[#64748B]" />
                          {batch.schedule?.venue || "Lecture Hall"}
                        </span>
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => navigate(`/enrollments?batchId=${batch._id}`)}
                            className="px-2.5 py-1 bg-white hover:bg-[#F7F6F2] text-[#1B2A4A] border border-[#E5E3DC] rounded text-xs font-medium transition-colors cursor-pointer"
                          >
                            Roster ({batch.enrolledCount})
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate(`/attendance?batchId=${batch._id}`)}
                            className="px-2.5 py-1 bg-[#1B2A4A] hover:bg-[#253963] text-white rounded text-xs font-medium transition-colors cursor-pointer"
                          >
                            Take Attendance
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default TeacherDashboard;
