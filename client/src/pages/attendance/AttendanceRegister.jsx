import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  ClipboardCheck,
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Check,
  RotateCcw,
  History,
  ShieldCheck,
  ArrowRight,
  User,
  GraduationCap,
  Sparkles,
} from "lucide-react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { useAuth } from "../../context/AuthContext";
import {
  markAttendance,
  getBatchAttendance,
  getBatchAttendanceByDate,
  getMyAttendance,
} from "../../api/attendanceApi";
import { getBatches } from "../../api/batchApi";
import { getBatchRoster } from "../../api/enrollmentApi";

const AttendanceRegister = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const isStudent = user?.role === "student";
  const isTeacher = user?.role === "teacher";
  const isAdmin = user?.role === "admin";

  // ==========================================
  // STUDENT STATE
  // ==========================================
  const [studentData, setStudentData] = useState(null);
  const [studentLoading, setStudentLoading] = useState(isStudent);
  const [studentError, setStudentError] = useState("");

  // ==========================================
  // TEACHER / ADMIN STATE
  // ==========================================
  const [batches, setBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState(searchParams.get("batchId") || "");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [activeTab, setActiveTab] = useState("rollcall"); // 'rollcall' | 'history'

  const [roster, setRoster] = useState([]);
  const [recordsMap, setRecordsMap] = useState({}); // { [studentId]: { status: 'present'|'absent'|'late', remarks: '' } }
  const [isMarked, setIsMarked] = useState(false);
  const [markedByInfo, setMarkedByInfo] = useState(null);

  const [historySessions, setHistorySessions] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [loadingRoster, setLoadingRoster] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  // ------------------------------------------
  // 1. Fetch Student Personal Attendance Desk
  // ------------------------------------------
  useEffect(() => {
    if (isStudent) {
      setStudentLoading(true);
      getMyAttendance()
        .then((data) => setStudentData(data))
        .catch((err) =>
          setStudentError(err.response?.data?.message || err.message || "Failed to load attendance records.")
        )
        .finally(() => setStudentLoading(false));
    }
  }, [isStudent]);

  // ------------------------------------------
  // 2. Fetch Batches (Teacher sees assigned, Admin sees all)
  // ------------------------------------------
  useEffect(() => {
    if (!isStudent) {
      getBatches({ status: "active" })
        .then((data) => {
          const list = data.batches || [];
          setBatches(list);
          if (!selectedBatchId && list.length > 0) {
            setSelectedBatchId(list[0]._id);
          }
        })
        .catch((err) => console.error("Failed to load batches:", err));
    }
  }, [isStudent, selectedBatchId]);

  // Update query param when selected batch changes
  useEffect(() => {
    if (selectedBatchId && !isStudent) {
      setSearchParams({ batchId: selectedBatchId });
    }
  }, [selectedBatchId, setSearchParams, isStudent]);

  // ------------------------------------------
  // 3. Load Roster and Date Attendance for Selected Batch
  // ------------------------------------------
  const loadBatchSessionData = useCallback(async () => {
    if (!selectedBatchId || isStudent) return;

    try {
      setLoadingRoster(true);
      setFeedback({ type: "", message: "" });

      // Step A: Load cohort roster to know all active enrolled students
      const rosterData = await getBatchRoster(selectedBatchId);
      const studentList = rosterData.roster || [];
      setRoster(studentList);

      // Step B: Check if attendance was already recorded for this date
      const dateData = await getBatchAttendanceByDate(selectedBatchId, selectedDate);
      setIsMarked(dateData.isMarked);
      setMarkedByInfo(dateData.attendance?.markedBy || null);

      // Initialize records mapping
      const initialMap = {};

      if (dateData.isMarked && dateData.attendance?.records) {
        // Pre-fill existing records
        dateData.attendance.records.forEach((rec) => {
          const sId = typeof rec.student === "object" ? rec.student._id : rec.student;
          initialMap[sId] = {
            status: rec.status,
            remarks: rec.remarks || "",
          };
        });
      } else {
        // Default all enrolled students to 'present' for fast 1-click submission
        studentList.forEach((item) => {
          const sId = item.student._id;
          initialMap[sId] = {
            status: "present",
            remarks: "",
          };
        });
      }

      setRecordsMap(initialMap);
    } catch (err) {
      setFeedback({
        type: "error",
        message: err.response?.data?.message || err.message || "Failed to load session roster.",
      });
    } finally {
      setLoadingRoster(false);
    }
  }, [selectedBatchId, selectedDate, isStudent]);

  useEffect(() => {
    loadBatchSessionData();
  }, [loadBatchSessionData]);

  // ------------------------------------------
  // 4. Load Batch History Sessions
  // ------------------------------------------
  const loadHistory = useCallback(async () => {
    if (!selectedBatchId || isStudent) return;
    try {
      setLoadingHistory(true);
      const data = await getBatchAttendance(selectedBatchId);
      setHistorySessions(data.sessions || []);
    } catch (err) {
      console.error("Failed to load attendance history:", err);
    } finally {
      setLoadingHistory(false);
    }
  }, [selectedBatchId, isStudent]);

  useEffect(() => {
    if (activeTab === "history") {
      loadHistory();
    }
  }, [activeTab, loadHistory]);

  // ------------------------------------------
  // Actions: Quick Status Toggles
  // ------------------------------------------
  const handleSetAllStatus = (newStatus) => {
    const updated = { ...recordsMap };
    roster.forEach((item) => {
      const sId = item.student._id;
      updated[sId] = {
        ...updated[sId],
        status: newStatus,
      };
    });
    setRecordsMap(updated);
  };

  const handleStudentStatusChange = (studentId, status) => {
    setRecordsMap((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status,
      },
    }));
  };

  const handleStudentRemarksChange = (studentId, remarks) => {
    setRecordsMap((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        remarks,
      },
    }));
  };

  // ------------------------------------------
  // Submit Roll Call
  // ------------------------------------------
  const handleSubmitRegister = async (e) => {
    e.preventDefault();
    if (!selectedBatchId) return;

    try {
      setSubmitting(true);
      setFeedback({ type: "", message: "" });

      const recordsArray = Object.keys(recordsMap).map((sId) => ({
        student: sId,
        status: recordsMap[sId].status || "present",
        remarks: recordsMap[sId].remarks || "",
      }));

      if (recordsArray.length === 0) {
        setFeedback({
          type: "error",
          message: "Cohort has no enrolled candidates to mark attendance.",
        });
        setSubmitting(false);
        return;
      }

      await markAttendance({
        batch: selectedBatchId,
        date: selectedDate,
        records: recordsArray,
      });

      setIsMarked(true);
      setFeedback({
        type: "success",
        message: `Attendance register successfully recorded and locked for ${selectedDate}.`,
      });

      // Refresh data
      loadBatchSessionData();
    } catch (err) {
      setFeedback({
        type: "error",
        message: err.response?.data?.message || err.message || "Failed to record roll call.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate live counters
  const currentRecords = Object.values(recordsMap);
  const countPresent = currentRecords.filter((r) => r.status === "present").length;
  const countLate = currentRecords.filter((r) => r.status === "late").length;
  const countAbsent = currentRecords.filter((r) => r.status === "absent").length;
  const countTotal = currentRecords.length;
  const liveRate = countTotal > 0 ? Math.round(((countPresent + countLate) / countTotal) * 1000) / 10 : 0;

  // =========================================================================
  // RENDER: STUDENT VIEW
  // =========================================================================
  if (isStudent) {
    return (
      <DashboardLayout>
        <div className="space-y-6 max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-[#E5E3DC]">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-mono tracking-wider uppercase text-[#5A6275]">
                <span>CANDIDATE ATTENDANCE DESK</span>
                <span>•</span>
                <span className="px-1.5 py-0.5 rounded bg-[#EDF7F2] text-[#1E4934] border border-[#A3D4BC] font-semibold">
                  AUDITED SESSIONS
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1B2A4A] tracking-tight mt-1">
                Candidate Attendance & Session Log
              </h1>
              <p className="text-xs text-[#5A6275] font-sans mt-0.5">
                Review your session presence rate, timely arrivals, and verified attendance records.
              </p>
            </div>
          </div>

          {studentLoading ? (
            <div className="py-16 text-center text-[#5A6275]">
              <div className="w-6 h-6 border-2 border-[#1B2A4A] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <span className="font-mono text-xs">Retrieving candidate attendance ledger...</span>
            </div>
          ) : studentError ? (
            <div className="p-4 bg-[#FDF1F0] border border-[#F3AAA5] rounded text-xs text-[#B23A32]">
              {studentError}
            </div>
          ) : (
            <>
              {/* Overall Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-[#E5E3DC] rounded-lg p-4 shadow-2xs">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-[#5A6275] font-semibold">
                    CUMULATIVE ATTENDANCE
                  </div>
                  <div
                    className={`text-3xl font-serif font-bold mt-1 ${
                      studentData?.overall?.percentage >= 75 ? "text-[#2F6E4F]" : "text-[#B23A32]"
                    }`}
                  >
                    {studentData?.overall?.percentage ?? 100}%
                  </div>
                  <div className="text-[11px] text-[#5A6275] font-mono mt-2">
                    {studentData?.overall?.percentage >= 75
                      ? "Exemplary — Above 75% threshold"
                      : "Deficit — Requires immediate makeup"}
                  </div>
                </div>

                <div className="bg-white border border-[#E5E3DC] rounded-lg p-4 shadow-2xs">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-[#5A6275] font-semibold">
                    TOTAL LECTURES HELD
                  </div>
                  <div className="text-3xl font-serif font-bold text-[#1B2A4A] mt-1">
                    {studentData?.overall?.totalSessions || 0}
                  </div>
                  <div className="text-[11px] text-[#5A6275] font-mono mt-2">
                    Verified classroom roll calls
                  </div>
                </div>

                <div className="bg-white border border-[#E5E3DC] rounded-lg p-4 shadow-2xs">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-[#5A6275] font-semibold">
                    ON-TIME & PRESENT
                  </div>
                  <div className="text-3xl font-serif font-bold text-[#2F6E4F] mt-1">
                    {studentData?.overall?.present || 0}
                  </div>
                  <div className="text-[11px] text-[#5A6275] font-mono mt-2">
                    Plus {studentData?.overall?.late || 0} late arrivals
                  </div>
                </div>

                <div className="bg-white border border-[#E5E3DC] rounded-lg p-4 shadow-2xs">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-[#5A6275] font-semibold">
                    ABSENT SESSIONS
                  </div>
                  <div className="text-3xl font-serif font-bold text-[#B23A32] mt-1">
                    {studentData?.overall?.absent || 0}
                  </div>
                  <div className="text-[11px] text-[#5A6275] font-mono mt-2">
                    Unattended sessions
                  </div>
                </div>
              </div>

              {/* Per-Cohort Breakdown Cards */}
              <div className="bg-white border border-[#E5E3DC] rounded-lg p-5 shadow-2xs">
                <h2 className="font-serif font-bold text-[#1B2A4A] text-base border-b border-[#E5E3DC] pb-3">
                  Attendance by Enrolled Cohort
                </h2>

                {studentData?.batches?.length === 0 ? (
                  <div className="py-8 text-center text-xs text-[#5A6275]">
                    No enrolled cohorts found.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    {studentData?.batches?.map((item) => (
                      <div
                        key={item.batch?._id}
                        className="p-4 border border-[#E5E3DC] rounded-lg bg-[#FCFBF8]"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-bold text-[#1B2A4A]">
                            {item.batch?.name}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                              item.percentage >= 75
                                ? "bg-[#EDF7F2] text-[#1E4934] border border-[#A3D4BC]"
                                : "bg-[#FDF1F0] text-[#B23A32] border border-[#F3AAA5]"
                            }`}
                          >
                            {item.percentage}%
                          </span>
                        </div>
                        <div className="text-xs text-[#5A6275] mt-1 font-sans">
                          {item.batch?.subject}
                        </div>

                        {/* Progress bar */}
                        <div className="w-full bg-[#E5E3DC] h-1.5 rounded-full overflow-hidden mt-3">
                          <div
                            className={`h-full ${
                              item.percentage >= 75 ? "bg-[#2F6E4F]" : "bg-[#B23A32]"
                            }`}
                            style={{ width: `${Math.min(100, item.percentage)}%` }}
                          ></div>
                        </div>

                        <div className="mt-3 pt-2 border-t border-[#E5E3DC] flex items-center justify-between text-[11px] font-mono text-[#5A6275]">
                          <span>
                            Present: <strong className="text-[#2F6E4F]">{item.present}</strong>
                          </span>
                          <span>
                            Late: <strong className="text-[#D99A2B]">{item.late}</strong>
                          </span>
                          <span>
                            Absent: <strong className="text-[#B23A32]">{item.absent}</strong>
                          </span>
                          <span>
                            Total: <strong className="text-[#1B2A4A]">{item.totalSessions}</strong>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Chronological Session History Log */}
              <div className="bg-white border border-[#E5E3DC] rounded-lg p-5 shadow-2xs">
                <h2 className="font-serif font-bold text-[#1B2A4A] text-base border-b border-[#E5E3DC] pb-3">
                  Historical Session Register Log
                </h2>

                {studentData?.history?.length === 0 ? (
                  <div className="py-8 text-center text-xs text-[#5A6275]">
                    No roll call sessions have been recorded for your account yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto mt-4">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-[#E5E3DC] bg-[#F7F6F2] text-[10px] font-mono uppercase text-[#5A6275]">
                          <th className="py-2.5 px-3">Session Date</th>
                          <th className="py-2.5 px-3">Enrolled Cohort</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3">Faculty Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E5E3DC]">
                        {studentData?.history?.map((log) => (
                          <tr key={log._id} className="hover:bg-[#FCFBF8] transition-colors">
                            <td className="py-2.5 px-3 font-mono font-medium text-[#1B2A4A]">
                              {new Date(log.date).toLocaleDateString("en-IN", {
                                weekday: "short",
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </td>
                            <td className="py-2.5 px-3 font-sans font-semibold text-[#1B2A4A]">
                              {log.batch?.name}
                            </td>
                            <td className="py-2.5 px-3">
                              {log.status === "present" ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#EDF7F2] text-[#1E4934] border border-[#A3D4BC]">
                                  <CheckCircle2 size={11} /> PRESENT
                                </span>
                              ) : log.status === "late" ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#FEF8EC] text-[#A67119] border border-[#F3D28E]">
                                  <Clock size={11} /> LATE ARRIVAL
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#FDF1F0] text-[#B23A32] border border-[#F3AAA5]">
                                  <XCircle size={11} /> ABSENT
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-sans text-[#5A6275]">
                              {log.remarks || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </DashboardLayout>
    );
  }

  // =========================================================================
  // RENDER: TEACHER / ADMIN VIEW
  // =========================================================================
  const selectedBatchObj = batches.find((b) => b._id === selectedBatchId);

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-[#E5E3DC]">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-mono tracking-wider uppercase text-[#5A6275]">
              <span>ACADEMIC AUDIT DESK</span>
              <span>•</span>
              <span className="px-1.5 py-0.5 rounded bg-[#EDF7F2] text-[#1E4934] border border-[#A3D4BC] font-semibold">
                MODULE 4 • ATTENDANCE
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1B2A4A] tracking-tight mt-1">
              Cohort Roll Call Register & Audit
            </h1>
            <p className="text-xs text-[#5A6275] font-sans mt-0.5">
              Record daily classroom presence, audit historical sessions, and enforce attendance thresholds.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex rounded border border-[#E5E3DC] bg-white p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab("rollcall")}
                className={`px-3 py-1.5 rounded font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === "rollcall"
                    ? "bg-[#1B2A4A] text-white"
                    : "text-[#5A6275] hover:text-[#1B2A4A]"
                }`}
              >
                <ClipboardCheck size={13} />
                <span>Today's Roll Call</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("history")}
                className={`px-3 py-1.5 rounded font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === "history"
                    ? "bg-[#1B2A4A] text-white"
                    : "text-[#5A6275] hover:text-[#1B2A4A]"
                }`}
              >
                <History size={13} />
                <span>Session Ledger</span>
              </button>
            </div>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback.message && (
          <div
            className={`p-3 rounded text-xs border flex items-center justify-between ${
              feedback.type === "success"
                ? "bg-[#EDF7F2] border-[#A3D4BC] text-[#1E4934]"
                : "bg-[#FDF1F0] border-[#F3AAA5] text-[#B23A32]"
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === "success" ? <Check size={14} /> : <AlertCircle size={14} />}
              <span>{feedback.message}</span>
            </div>
            <button
              onClick={() => setFeedback({ type: "", message: "" })}
              className="text-xs font-mono underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Batch & Date Selection Bar */}
        <div className="bg-white border border-[#E5E3DC] rounded-lg p-4 shadow-2xs flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
            {/* Batch Selector */}
            <div className="min-w-[260px]">
              <label className="block text-[10px] font-mono uppercase tracking-wider text-[#5A6275] font-semibold mb-1">
                SELECT COHORT BATCH
              </label>
              <select
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                className="w-full bg-[#FCFBF8] border border-[#E5E3DC] rounded px-3 py-1.5 text-xs text-[#1B2A4A] font-semibold focus:outline-hidden focus:border-[#1B2A4A]"
              >
                {batches.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name} ({b.subject})
                  </option>
                ))}
              </select>
            </div>

            {/* Date Selector */}
            <div className="min-w-[180px]">
              <label className="block text-[10px] font-mono uppercase tracking-wider text-[#5A6275] font-semibold mb-1">
                SESSION DATE
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full bg-[#FCFBF8] border border-[#E5E3DC] rounded px-3 py-1.5 text-xs text-[#1B2A4A] font-mono focus:outline-hidden focus:border-[#1B2A4A]"
              />
            </div>
          </div>

          {/* Verification Status Pill */}
          <div className="flex items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-[#E5E3DC]">
            {isMarked ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-[#EDF7F2] border border-[#A3D4BC] text-[#1E4934]">
                <ShieldCheck size={14} className="text-[#2F6E4F]" />
                <div className="text-[11px] font-mono font-bold">
                  REGISTER LOCKED FOR THIS DATE
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-[#FEF8EC] border border-[#F3D28E] text-[#A67119]">
                <Clock size={14} className="text-[#D99A2B]" />
                <div className="text-[11px] font-mono font-bold">
                  PENDING ROLL CALL SUBMISSION
                </div>
              </div>
            )}
          </div>
        </div>

        {/* =========================================================================
            TAB 1: ROLL CALL GRID
        ========================================================================= */}
        {activeTab === "rollcall" && (
          <form onSubmit={handleSubmitRegister} className="space-y-4">
            {/* Quick Action Toolbar & Realtime Counters */}
            <div className="bg-[#FCFBF8] border border-[#E5E3DC] rounded-lg p-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-mono uppercase font-semibold text-[#5A6275] mr-1">
                  BATCH SHORTCUTS:
                </span>
                <button
                  type="button"
                  onClick={() => handleSetAllStatus("present")}
                  className="px-2.5 py-1 bg-[#EDF7F2] hover:bg-[#DDF0E6] text-[#1E4934] border border-[#A3D4BC] rounded text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <CheckCircle2 size={12} /> Mark All Present
                </button>
                <button
                  type="button"
                  onClick={() => handleSetAllStatus("absent")}
                  className="px-2.5 py-1 bg-[#FDF1F0] hover:bg-[#FBE4E2] text-[#B23A32] border border-[#F3AAA5] rounded text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <XCircle size={12} /> Mark All Absent
                </button>
              </div>

              {/* Counters */}
              <div className="flex items-center gap-4 text-xs font-mono">
                <div>
                  <span className="text-[#5A6275]">Present:</span>{" "}
                  <strong className="text-[#2F6E4F]">{countPresent}</strong>
                </div>
                <div>
                  <span className="text-[#5A6275]">Late:</span>{" "}
                  <strong className="text-[#D99A2B]">{countLate}</strong>
                </div>
                <div>
                  <span className="text-[#5A6275]">Absent:</span>{" "}
                  <strong className="text-[#B23A32]">{countAbsent}</strong>
                </div>
                <div className="pl-2 border-l border-[#E5E3DC]">
                  <span className="text-[#5A6275]">Attendance Rate:</span>{" "}
                  <strong className="text-[#1B2A4A]">{liveRate}%</strong>
                </div>
              </div>
            </div>

            {/* Candidate Roll Call Table */}
            <div className="bg-white border border-[#E5E3DC] rounded-lg shadow-2xs overflow-hidden">
              {loadingRoster ? (
                <div className="py-16 text-center text-[#5A6275]">
                  <div className="w-6 h-6 border-2 border-[#1B2A4A] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <span className="font-mono text-xs">Loading cohort candidate roster...</span>
                </div>
              ) : roster.length === 0 ? (
                <div className="py-16 text-center text-[#5A6275]">
                  <Users size={32} className="text-[#64748B] mx-auto mb-2" />
                  <div className="font-serif font-bold text-[#1B2A4A] text-base">
                    No Candidates Enrolled
                  </div>
                  <p className="text-xs text-[#5A6275] mt-1">
                    There are no actively admitted candidates in this cohort to take attendance for.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#E5E3DC] bg-[#F7F6F2] text-[10px] font-mono uppercase text-[#5A6275]">
                        <th className="py-3 px-4 w-12 text-center">#</th>
                        <th className="py-3 px-4 min-w-[220px]">Candidate Student</th>
                        <th className="py-3 px-4 min-w-[280px]">Attendance Roll Status</th>
                        <th className="py-3 px-4 min-w-[200px]">Faculty Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E3DC]">
                      {roster.map((item, index) => {
                        const student = item.student;
                        if (!student) return null;
                        const sId = student._id;
                        const current = recordsMap[sId] || { status: "present", remarks: "" };

                        return (
                          <tr key={sId} className="hover:bg-[#FCFBF8] transition-colors">
                            <td className="py-3 px-4 text-center font-mono text-[#5A6275]">
                              {index + 1}
                            </td>

                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-full bg-[#1B2A4A] text-white font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                                  {student.name
                                    ?.split(" ")
                                    .map((n) => n[0])
                                    .join("")
                                    .slice(0, 2)
                                    .toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-serif font-bold text-[#1B2A4A]">
                                    {student.name}
                                  </div>
                                  <div className="text-[11px] font-mono text-[#5A6275]">
                                    {student.email}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* 3-State Segmented Toggle Pill */}
                            <td className="py-3 px-4">
                              <div className="inline-flex rounded border border-[#E5E3DC] bg-[#F7F6F2] p-0.5 text-xs font-mono">
                                <button
                                  type="button"
                                  onClick={() => handleStudentStatusChange(sId, "present")}
                                  className={`px-3 py-1 rounded font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                                    current.status === "present"
                                      ? "bg-[#2F6E4F] text-white shadow-2xs"
                                      : "text-[#5A6275] hover:text-[#1E4934]"
                                  }`}
                                >
                                  <Check size={12} />
                                  <span>PRESENT</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleStudentStatusChange(sId, "late")}
                                  className={`px-3 py-1 rounded font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                                    current.status === "late"
                                      ? "bg-[#D99A2B] text-white shadow-2xs"
                                      : "text-[#5A6275] hover:text-[#A67119]"
                                  }`}
                                >
                                  <Clock size={12} />
                                  <span>LATE</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleStudentStatusChange(sId, "absent")}
                                  className={`px-3 py-1 rounded font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                                    current.status === "absent"
                                      ? "bg-[#B23A32] text-white shadow-2xs"
                                      : "text-[#5A6275] hover:text-[#B23A32]"
                                  }`}
                                >
                                  <XCircle size={12} />
                                  <span>ABSENT</span>
                                </button>
                              </div>
                            </td>

                            {/* Remarks input */}
                            <td className="py-3 px-4">
                              <input
                                type="text"
                                placeholder="Optional note (e.g. traffic delay)"
                                value={current.remarks}
                                onChange={(e) =>
                                  handleStudentRemarksChange(sId, e.target.value)
                                }
                                className="w-full bg-[#FCFBF8] border border-[#E5E3DC] rounded px-2.5 py-1 text-xs text-[#1B2A4A] placeholder-[#94A3B8] focus:outline-hidden focus:border-[#1B2A4A]"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Submit Action Footer */}
              <div className="p-4 bg-[#FCFBF8] border-t border-[#E5E3DC] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="text-xs text-[#5A6275]">
                  {markedByInfo ? (
                    <span>
                      Previously verified by <strong>{markedByInfo.name}</strong>. Re-submitting
                      will atomically revise this register.
                    </span>
                  ) : (
                    <span>
                      Submission will register attendance in the immutable cohort database.
                    </span>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={submitting || roster.length === 0}
                  className="px-5 py-2.5 bg-[#1B2A4A] hover:bg-[#253963] disabled:opacity-50 text-white text-xs font-semibold rounded shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Locking Register...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={14} className="text-[#D99A2B]" />
                      <span>
                        {isMarked ? "Update & Re-Lock Register" : "Submit & Lock Register"}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* =========================================================================
            TAB 2: PAST SESSION LEDGER
        ========================================================================= */}
        {activeTab === "history" && (
          <div className="bg-white border border-[#E5E3DC] rounded-lg shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-[#E5E3DC] flex items-center justify-between">
              <h2 className="font-serif font-bold text-[#1B2A4A] text-base">
                Historical Session Registers for {selectedBatchObj?.name}
              </h2>
              <span className="text-xs font-mono text-[#5A6275]">
                {historySessions.length} Recorded Sessions
              </span>
            </div>

            {loadingHistory ? (
              <div className="py-16 text-center text-[#5A6275]">
                <div className="w-6 h-6 border-2 border-[#1B2A4A] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <span className="font-mono text-xs">Retrieving session history logs...</span>
              </div>
            ) : historySessions.length === 0 ? (
              <div className="py-16 text-center text-[#5A6275]">
                <History size={32} className="text-[#64748B] mx-auto mb-2" />
                <div className="font-serif font-bold text-[#1B2A4A] text-base">
                  No Session History Found
                </div>
                <p className="text-xs text-[#5A6275] mt-1">
                  No previous roll calls have been submitted for this cohort.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#E5E3DC] bg-[#F7F6F2] text-[10px] font-mono uppercase text-[#5A6275]">
                      <th className="py-3 px-4">Session Date</th>
                      <th className="py-3 px-4">Marked Faculty Lead</th>
                      <th className="py-3 px-4 text-center">Total Enrolled</th>
                      <th className="py-3 px-4 text-center">Present</th>
                      <th className="py-3 px-4 text-center">Late</th>
                      <th className="py-3 px-4 text-center">Absent</th>
                      <th className="py-3 px-4 text-center">Presence Rate</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E3DC]">
                    {historySessions.map((sess) => {
                      const sessionDateStr = new Date(sess.date).toISOString().slice(0, 10);
                      return (
                        <tr key={sess._id} className="hover:bg-[#FCFBF8] transition-colors">
                          <td className="py-3 px-4 font-mono font-medium text-[#1B2A4A]">
                            {new Date(sess.date).toLocaleDateString("en-IN", {
                              weekday: "short",
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </td>
                          <td className="py-3 px-4 font-sans text-[#1B2A4A]">
                            {sess.markedBy?.name || "Faculty Lead"}
                          </td>
                          <td className="py-3 px-4 text-center font-mono text-[#5A6275]">
                            {sess.summary?.total}
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-semibold text-[#2F6E4F]">
                            {sess.summary?.present}
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-semibold text-[#D99A2B]">
                            {sess.summary?.late}
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-semibold text-[#B23A32]">
                            {sess.summary?.absent}
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-bold">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] ${
                                sess.summary?.rate >= 75
                                  ? "bg-[#EDF7F2] text-[#1E4934] border border-[#A3D4BC]"
                                  : "bg-[#FDF1F0] text-[#B23A32] border border-[#F3AAA5]"
                              }`}
                            >
                              {sess.summary?.rate}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedDate(sessionDateStr);
                                setActiveTab("rollcall");
                              }}
                              className="px-2.5 py-1 bg-white hover:bg-[#F7F6F2] text-[#1B2A4A] border border-[#E5E3DC] rounded text-xs font-semibold transition-colors cursor-pointer"
                            >
                              View / Edit Register
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AttendanceRegister;
