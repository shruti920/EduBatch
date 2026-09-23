import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Users,
  UserPlus,
  Download,
  Search,
  CheckCircle2,
  Clock,
  ShieldCheck,
  AlertTriangle,
  UserMinus,
  Filter,
  GraduationCap,
  Calendar,
} from "lucide-react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import EnrollStudentModal from "../../components/enrollments/EnrollStudentModal";
import {
  getAllEnrollments,
  updateEnrollmentStatus,
  dropStudent,
} from "../../api/enrollmentApi";
import { getBatches } from "../../api/batchApi";
import { useAuth } from "../../context/AuthContext";

const EnrollmentRoster = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [searchParams, setSearchParams] = useSearchParams();

  const [enrollments, setEnrollments] = useState([]);
  const [counts, setCounts] = useState({ total: 0, paid: 0, pending: 0, waived: 0 });
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [selectedBatch, setSelectedBatch] = useState(searchParams.get("batchId") || "all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Modal
  const [modalOpen, setModalOpen] = useState(false);

  // Fetch batches for filter dropdown
  useEffect(() => {
    getBatches({ status: "all" })
      .then((data) => setBatches(data.batches || []))
      .catch((err) => console.error("Failed to load cohorts:", err));
  }, []);

  // Fetch enrollments
  const fetchEnrollments = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const params = {
        ...(selectedBatch !== "all" && { batch: selectedBatch }),
        ...(paymentFilter !== "all" && { paymentStatus: paymentFilter }),
        ...(searchTerm && { search: searchTerm }),
      };
      const data = await getAllEnrollments(params);
      setEnrollments(data.enrollments || []);
      if (data.counts) {
        setCounts(data.counts);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to load roster.");
    } finally {
      setLoading(false);
    }
  }, [selectedBatch, paymentFilter, searchTerm]);

  useEffect(() => {
    fetchEnrollments();
  }, [fetchEnrollments]);

  // Action handlers
  const handleDrop = async (enrollmentId, candidateName) => {
    if (
      window.confirm(
        `Are you sure you want to drop candidate "${candidateName}" from this cohort? This will release their quota seat.`
      )
    ) {
      try {
        await dropStudent(enrollmentId);
        fetchEnrollments();
      } catch (err) {
        alert("Failed to drop student: " + (err.response?.data?.message || err.message));
      }
    }
  };

  const handlePaymentToggle = async (enrollmentId, currentStatus) => {
    const nextStatus =
      currentStatus === "pending"
        ? "paid"
        : currentStatus === "paid"
        ? "waived"
        : "pending";

    try {
      await updateEnrollmentStatus(enrollmentId, { paymentStatus: nextStatus });
      fetchEnrollments();
    } catch (err) {
      alert("Failed to update payment status: " + (err.response?.data?.message || err.message));
    }
  };

  const exportCSV = () => {
    if (enrollments.length === 0) return;
    const headers = [
      "Roll No",
      "Candidate Name",
      "Email",
      "Phone",
      "Cohort",
      "Subject",
      "Payment Status",
      "Enrolled Date",
    ];
    const rows = enrollments.map((e, idx) => [
      `"#ROL-${String(idx + 1).padStart(2, "0")}"`,
      `"${e.student?.name || ""}"`,
      `"${e.student?.email || ""}"`,
      `"${e.student?.phone || ""}"`,
      `"${e.batch?.name || ""}"`,
      `"${e.batch?.subject || ""}"`,
      e.paymentStatus,
      new Date(e.enrolledAt).toLocaleDateString(),
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `EduBatch_Roster_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getPaymentStatusBadge = (status) => {
    if (status === "paid") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#EDF7F2] text-[#1E4934] border border-[#A3D4BC] uppercase">
          <CheckCircle2 size={11} />
          PAID & CLEARED
        </span>
      );
    }
    if (status === "pending") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#FEF8EC] text-[#A67119] border border-[#F3D28E] uppercase">
          <Clock size={11} />
          PENDING DUE
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#E6EDF8] text-[#1B2A4A] border border-[#C2D0E8] uppercase">
        <ShieldCheck size={11} />
        SCHOLARSHIP WAIVED
      </span>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-[#E5E3DC]">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-mono tracking-wider uppercase text-[#5A6275]">
              <span>LEDGER REFERENCE: ROSTER-MGMT-2025</span>
              <span>•</span>
              <span className="text-[#2F6E4F] font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2F6E4F]"></span>
                ACTIVE ROSTER REGISTRY
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1B2A4A] tracking-tight mt-1">
              Enrollment & Candidate Roster Ledger
            </h1>
            <p className="text-xs text-[#5A6275] font-sans mt-0.5">
              Manage candidate cohort admissions, inspect tuition clearance states, and maintain real-time capacity compliance.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={exportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-[#F7F6F2] text-[#1B2A4A] border border-[#E5E3DC] text-xs font-semibold rounded shadow-2xs transition-colors cursor-pointer"
            >
              <Download size={14} />
              <span>Export Roster (CSV)</span>
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#1B2A4A] hover:bg-[#253963] text-white text-xs font-semibold rounded shadow-xs transition-colors cursor-pointer"
              >
                <UserPlus size={14} className="text-[#D99A2B]" />
                <span>Enroll Student (Direct)</span>
              </button>
            )}
          </div>
        </div>

        {/* 4 Summary Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-[#E5E3DC] rounded-lg p-4 shadow-2xs">
            <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-[#5A6275] font-semibold">
              <span>TOTAL ACTIVE ENROLLMENTS</span>
              <Users size={14} className="text-[#64748B]" />
            </div>
            <div className="text-3xl font-serif font-bold text-[#1B2A4A] mt-2">
              {counts.total}
            </div>
            <div className="text-[11px] font-mono text-[#5A6275] mt-1">
              Across all registered cohorts
            </div>
          </div>

          <div className="bg-white border border-[#E5E3DC] rounded-lg p-4 shadow-2xs">
            <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-[#5A6275] font-semibold">
              <span>TUITION CLEARED</span>
              <CheckCircle2 size={14} className="text-[#2F6E4F]" />
            </div>
            <div className="text-3xl font-serif font-bold text-[#2F6E4F] mt-2">
              {counts.paid}
            </div>
            <div className="text-[11px] font-mono text-[#2F6E4F] mt-1 font-semibold">
              Online / Direct verified
            </div>
          </div>

          <div className="bg-white border border-[#E5E3DC] rounded-lg p-4 shadow-2xs">
            <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-[#5A6275] font-semibold">
              <span>PENDING TUITION DUES</span>
              <Clock size={14} className="text-[#D99A2B]" />
            </div>
            <div className="text-3xl font-serif font-bold text-[#D99A2B] mt-2">
              {counts.pending}
            </div>
            <div className="text-[11px] font-mono text-[#A67119] mt-1 font-semibold">
              Awaiting settlement
            </div>
          </div>

          <div className="bg-white border border-[#E5E3DC] rounded-lg p-4 shadow-2xs">
            <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-[#5A6275] font-semibold">
              <span>MERIT SCHOLARSHIPS</span>
              <ShieldCheck size={14} className="text-[#1B2A4A]" />
            </div>
            <div className="text-3xl font-serif font-bold text-[#1B2A4A] mt-2">
              {counts.waived}
            </div>
            <div className="text-[11px] font-mono text-[#5A6275] mt-1">
              Sanctioned fee waivers
            </div>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="bg-white border border-[#E5E3DC] rounded-lg p-3 shadow-2xs flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Cohort Selector */}
          <div className="flex items-center gap-2 text-xs">
            <span className="font-mono text-[#5A6275] text-[11px] font-semibold">COHORT:</span>
            <select
              value={selectedBatch}
              onChange={(e) => {
                setSelectedBatch(e.target.value);
                if (e.target.value === "all") {
                  searchParams.delete("batchId");
                } else {
                  searchParams.set("batchId", e.target.value);
                }
                setSearchParams(searchParams);
              }}
              className="bg-[#F7F6F2] border border-[#E5E3DC] rounded px-3 py-1.5 text-xs text-[#22242B] font-sans focus:outline-none focus:border-[#1B2A4A] font-medium"
            >
              <option value="all">All Cohorts (Master Roster)</option>
              {batches.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.name} ({b.subject})
                </option>
              ))}
            </select>
          </div>

          {/* Payment Status Tabs & Search */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-[#F7F6F2] p-0.5 rounded border border-[#E5E3DC] text-[11px] font-mono">
              {[
                { key: "all", label: "ALL" },
                { key: "paid", label: "PAID" },
                { key: "pending", label: "PENDING" },
                { key: "waived", label: "WAIVED" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setPaymentFilter(tab.key)}
                  className={`px-2.5 py-1 rounded transition-all cursor-pointer ${
                    paymentFilter === tab.key
                      ? "bg-[#1B2A4A] text-white font-bold shadow-xs"
                      : "text-[#5A6275] hover:text-[#1B2A4A]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#64748B]"
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search candidate..."
                className="pl-8 pr-3 py-1 bg-[#F7F6F2] border border-[#E5E3DC] rounded text-xs text-[#22242B] placeholder-[#64748B] focus:outline-none focus:border-[#1B2A4A] focus:bg-white w-40 sm:w-48 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Master Candidate Roster Table */}
        <div className="bg-white border border-[#E5E3DC] rounded-lg shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-[#E5E3DC] flex items-center justify-between bg-[#FCFBF8]">
            <div className="font-serif font-bold text-[#1B2A4A] text-base">
              Candidate Enrolled Roster Ledger
            </div>
            <div className="text-xs font-mono text-[#5A6275]">
              Showing {enrollments.length} candidate entries
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-[#F7F6F2] border-b border-[#E5E3DC] text-[10px] font-mono uppercase text-[#5A6275]">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Roll #</th>
                  <th className="py-2.5 px-4 font-semibold">Candidate Details</th>
                  <th className="py-2.5 px-4 font-semibold">Enrolled Cohort</th>
                  <th className="py-2.5 px-4 font-semibold">Admission Date</th>
                  <th className="py-2.5 px-4 font-semibold">Payment Status</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E3DC] text-[12px]">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-[#5A6275]">
                      <div className="w-6 h-6 border-2 border-[#1B2A4A] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                      <span className="font-mono text-xs">Loading Candidate Roster...</span>
                    </td>
                  </tr>
                ) : enrollments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-[#5A6275]">
                      <Users size={32} className="text-[#64748B] mx-auto mb-2" />
                      <div className="font-serif font-bold text-[#1B2A4A] text-base">
                        No Candidates Enrolled
                      </div>
                      <div className="text-xs mt-1">
                        No enrollment records match the selected cohort or status filter.
                      </div>
                    </td>
                  </tr>
                ) : (
                  enrollments.map((enr, idx) => (
                    <tr key={enr._id} className="hover:bg-[#F9F8F5] transition-colors">
                      {/* Roll # */}
                      <td className="py-3 px-4 font-mono font-semibold text-[#1B2A4A]">
                        #ROL-{String(idx + 1).padStart(2, "0")}
                      </td>

                      {/* Candidate */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#1B2A4A]">
                          {enr.student?.name || "Unknown Candidate"}
                        </div>
                        <div className="text-[11px] text-[#5A6275] font-mono">
                          {enr.student?.email}
                        </div>
                        {enr.student?.phone && (
                          <div className="text-[10px] text-[#64748B] font-mono">
                            {enr.student.phone}
                          </div>
                        )}
                      </td>

                      {/* Batch */}
                      <td className="py-3 px-4">
                        <div className="font-medium text-[#1B2A4A]">
                          {enr.batch?.name || "N/A"}
                        </div>
                        <div className="text-[10px] text-[#5A6275]">
                          {enr.batch?.subject} • ₹{enr.batch?.fee?.toLocaleString("en-IN")}
                        </div>
                      </td>

                      {/* Date */}
                      <td className="py-3 px-4 font-mono text-[11px] text-[#5A6275]">
                        {new Date(enr.enrolledAt).toLocaleDateString("en-US", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>

                      {/* Payment Status Pill */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {getPaymentStatusBadge(enr.paymentStatus)}
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() =>
                                handlePaymentToggle(enr._id, enr.paymentStatus)
                              }
                              className="text-[10px] font-mono text-[#5A6275] hover:text-[#1B2A4A] underline cursor-pointer"
                              title="Toggle status (Pending -> Paid -> Waived)"
                            >
                              (Change)
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() =>
                              handleDrop(enr._id, enr.student?.name || "Candidate")
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[#B23A32] hover:bg-[#FDF1F0] rounded text-[11px] font-medium border border-[#F3AAA5] transition-colors cursor-pointer"
                            title="Soft Drop Student from Cohort"
                          >
                            <UserMinus size={12} />
                            <span>Drop</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="p-3 border-t border-[#E5E3DC] bg-[#FCFBF8] text-[11px] font-mono text-[#5A6275] flex items-center justify-between">
            <span>Official Ledger Registry: Compliant with Capacity Guard v1.0</span>
            <span>Kota Science Academy</span>
          </div>
        </div>

        {/* Direct Enrollment Modal */}
        <EnrollStudentModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSuccess={fetchEnrollments}
          initialBatchId={selectedBatch !== "all" ? selectedBatch : null}
        />
      </div>
    </DashboardLayout>
  );
};

export default EnrollmentRoster;
