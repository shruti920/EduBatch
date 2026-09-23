import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CalendarDays,
  CreditCard,
  ClipboardCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  GraduationCap,
  ShieldCheck,
  Bell,
  MapPin,
  Calendar,
} from "lucide-react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { useAuth } from "../../context/AuthContext";
import { getMyEnrollments } from "../../api/enrollmentApi";
import { getMyAttendance } from "../../api/attendanceApi";

const StudentDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [enrollments, setEnrollments] = useState([]);
  const [attendanceData, setAttendanceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([getMyEnrollments(), getMyAttendance()])
      .then(([enrData, attData]) => {
        setEnrollments(enrData || []);
        setAttendanceData(attData || null);
      })
      .catch((err) =>
        setError(err.response?.data?.message || err.message || "Failed to load dashboard data.")
      )
      .finally(() => setLoading(false));
  }, []);

  const totalEnrolled = enrollments.length;
  const hasPendingFees = enrollments.some((e) => e.paymentStatus === "pending");
  const allFeesPaid = totalEnrolled > 0 && enrollments.every((e) => e.paymentStatus === "paid" || e.paymentStatus === "waived");

  const overallAttRate = attendanceData?.overall?.percentage ?? 100;
  const totalAttSessions = attendanceData?.overall?.totalSessions ?? 0;
  const attendedSessions = (attendanceData?.overall?.present ?? 0) + (attendanceData?.overall?.late ?? 0);

  const formatTime12h = (time24) => {
    if (!time24) return "";
    const [h, m] = time24.split(":").map(Number);
    const suffix = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 || 12;
    return `${String(hour12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${suffix}`;
  };

  // Build a lookup for batch attendance rates
  const batchAttendanceMap = {};
  if (attendanceData?.batches) {
    attendanceData.batches.forEach((b) => {
      const bId = typeof b.batch === "object" ? b.batch._id : b.batch;
      batchAttendanceMap[bId] = b.percentage;
    });
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-[#E5E3DC]">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-mono tracking-wider uppercase text-[#5A6275]">
              <span>CANDIDATE ADMISSION LEDGER</span>
              <span>•</span>
              <span className="px-1.5 py-0.5 rounded bg-[#EDF7F2] text-[#1E4934] border border-[#A3D4BC] font-semibold">
                ACTIVE CANDIDATE
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1B2A4A] tracking-tight mt-1">
              Candidate Academic Desk & Ledger
            </h1>
            <p className="text-xs text-[#5A6275] font-sans mt-0.5">
              Welcome, {user?.name || "Candidate"}. Review your enrolled batches, track attendance, and inspect tuition records.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/attendance"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#1B2A4A] hover:bg-[#253963] text-white text-xs font-semibold rounded shadow-xs transition-colors cursor-pointer"
            >
              <ClipboardCheck size={14} className="text-[#D99A2B]" />
              <span>Attendance Ledger</span>
            </Link>
          </div>
        </div>

        {/* 3 Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-[#E5E3DC] rounded-lg p-4 shadow-2xs">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#5A6275] font-semibold">
              ENROLLED BATCHES
            </div>
            <div className="text-3xl font-serif font-bold text-[#1B2A4A] mt-1">
              {loading ? "..." : totalEnrolled}
            </div>
            <div className="text-[11px] text-[#2F6E4F] font-mono mt-2 flex items-center gap-1">
              <CheckCircle2 size={12} />
              <span>Verified Admission</span>
            </div>
          </div>

          {/* Cumulative Attendance Card - Clickable to /attendance */}
          <div
            onClick={() => navigate("/attendance")}
            className="bg-white border border-[#E5E3DC] rounded-lg p-4 shadow-2xs hover:border-[#1B2A4A] transition-colors cursor-pointer"
          >
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#5A6275] font-semibold flex items-center justify-between">
              <span>CUMULATIVE ATTENDANCE</span>
              <ArrowRight size={12} className="text-[#5A6275]" />
            </div>
            <div
              className={`text-3xl font-serif font-bold mt-1 ${
                overallAttRate >= 75 ? "text-[#2F6E4F]" : "text-[#B23A32]"
              }`}
            >
              {loading ? "..." : `${overallAttRate}%`}
            </div>
            <div className="text-[11px] text-[#5A6275] font-mono mt-2">
              {totalAttSessions > 0
                ? `${attendedSessions} / ${totalAttSessions} Sessions Attended`
                : "No lectures recorded yet"}
            </div>
          </div>

          <div className="bg-white border border-[#E5E3DC] rounded-lg p-4 shadow-2xs">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#5A6275] font-semibold">
              TUITION FEE STATUS
            </div>
            <div
              className={`text-3xl font-serif font-bold mt-1 ${
                hasPendingFees ? "text-[#D99A2B]" : "text-[#2F6E4F]"
              }`}
            >
              {loading ? "..." : hasPendingFees ? "PENDING" : allFeesPaid ? "CLEARED" : "NO DUES"}
            </div>
            <div className="text-[11px] text-[#2F6E4F] font-mono mt-2 flex items-center gap-1 font-semibold">
              <ShieldCheck size={13} />
              <span>{hasPendingFees ? "Payment Due on Ledger" : "Tuition Verified"}</span>
            </div>
          </div>
        </div>

        {/* Enrolled Batches Section */}
        <div className="bg-white border border-[#E5E3DC] rounded-lg p-5 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E3DC]">
            <h2 className="font-serif font-bold text-[#1B2A4A] text-lg">
              Enrolled Academic Cohorts
            </h2>
            <span className="text-xs font-mono text-[#5A6275]">
              {totalEnrolled} Active Enrollment{totalEnrolled !== 1 ? "s" : ""}
            </span>
          </div>

          {loading ? (
            <div className="py-12 text-center text-[#5A6275]">
              <div className="w-6 h-6 border-2 border-[#1B2A4A] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <span className="font-mono text-xs">Loading personal cohorts...</span>
            </div>
          ) : error ? (
            <div className="my-4 p-3 bg-[#FDF1F0] border border-[#F3AAA5] rounded text-xs text-[#B23A32]">
              {error}
            </div>
          ) : enrollments.length === 0 ? (
            <div className="py-12 text-center">
              <CalendarDays size={32} className="text-[#64748B] mx-auto mb-2" />
              <div className="font-serif font-bold text-[#1B2A4A] text-base">
                No Cohorts Enrolled Yet
              </div>
              <p className="text-xs text-[#5A6275] mt-1 max-w-md mx-auto">
                You have not been admitted into any course cohorts yet. Please contact your academic administrator or admissions desk for cohort enrollment.
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {enrollments.map((enr) => {
                const batch = enr.batch;
                if (!batch) return null;

                const isPaid = enr.paymentStatus === "paid";
                const isPending = enr.paymentStatus === "pending";
                const cohortRate = batchAttendanceMap[batch._id] ?? 100;

                return (
                  <div
                    key={enr._id}
                    className="p-4 border border-[#E5E3DC] rounded-lg bg-[#FCFBF8] hover:shadow-2xs transition-shadow"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-[#1B2A4A]">
                            #BATCH-{batch._id?.slice(-6).toUpperCase()}
                          </span>
                          <span className="text-[11px] font-mono text-[#5A6275] flex items-center gap-1">
                            <MapPin size={11} className="text-[#64748B]" />
                            {batch.schedule?.venue || "Lecture Hall"}
                          </span>
                        </div>
                        <h3 className="text-base font-serif font-bold text-[#1B2A4A] mt-1">
                          {batch.name}
                        </h3>
                        <p className="text-xs text-[#5A6275] mt-0.5 font-sans">
                          Faculty Lead: {batch.teacher?.name || "Designated Faculty"} • {batch.subject}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {isPaid ? (
                          <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-[#EDF7F2] text-[#1E4934] border border-[#A3D4BC]">
                            TUITION CLEARED
                          </span>
                        ) : isPending ? (
                          <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-[#FEF8EC] text-[#A67119] border border-[#F3D28E]">
                            TUITION PENDING • ₹{batch.fee?.toLocaleString("en-IN")}
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-[#E6EDF8] text-[#1B2A4A] border border-[#C2D0E8]">
                            MERIT WAIVED
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#E5E3DC] grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-sans">
                      <div>
                        <span className="text-[10px] font-mono uppercase text-[#5A6275] block">
                          LECTURE TIMINGS
                        </span>
                        <span className="font-semibold text-[#1B2A4A] font-mono text-[11px]">
                          {batch.schedule?.days?.join(", ")} (
                          {formatTime12h(batch.schedule?.startTime)} –{" "}
                          {formatTime12h(batch.schedule?.endTime)})
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono uppercase text-[#5A6275] block">
                          ADMISSION DATE
                        </span>
                        <span className="font-semibold text-[#1B2A4A] font-mono text-[11px]">
                          {new Date(enr.enrolledAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono uppercase text-[#5A6275] block">
                          ATTENDANCE RATE
                        </span>
                        <span
                          className={`font-semibold font-mono text-[11px] ${
                            cohortRate >= 75 ? "text-[#2F6E4F]" : "text-[#B23A32]"
                          }`}
                        >
                          {cohortRate}% ({cohortRate >= 75 ? "Exemplary" : "Deficit"})
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default StudentDashboard;
