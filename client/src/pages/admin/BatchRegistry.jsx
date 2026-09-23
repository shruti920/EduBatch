import React, { useState, useEffect, useCallback } from "react";
import {
  CalendarDays,
  Plus,
  Download,
  Search,
  Users,
  Lock,
  IndianRupee,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  Building,
  GraduationCap,
} from "lucide-react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import BatchCard from "../../components/batches/BatchCard";
import BatchModal from "../../components/batches/BatchModal";
import {
  getBatches,
  updateBatchStatus,
  archiveBatch,
  getFacultyList,
} from "../../api/batchApi";
import { getAllEnrollments } from "../../api/enrollmentApi";
import { useAuth } from "../../context/AuthContext";

const BatchRegistry = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [batches, setBatches] = useState([]);
  const [counts, setCounts] = useState({ all: 0, active: 0, upcoming: 0, archived: 0 });
  const [teachers, setTeachers] = useState([]);
  const [enrollmentMap, setEnrollmentMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("All Disciplines");

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState(null);

  // Fetch batches and active enrollments together
  const fetchBatchData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const params = {
        status: activeTab,
        ...(searchTerm && { search: searchTerm }),
        ...(selectedSubject !== "All Disciplines" && { subject: selectedSubject }),
      };

      const [batchRes, enrollmentRes] = await Promise.all([
        getBatches(params),
        getAllEnrollments().catch(() => ({ enrollments: [] })),
      ]);

      const loadedBatches = batchRes.batches || [];
      setBatches(loadedBatches);
      if (batchRes.counts) {
        setCounts(batchRes.counts);
      }

      // Build real enrollment count map
      const eMap = {};
      const activeEnrollments = enrollmentRes.enrollments || [];
      activeEnrollments.forEach((e) => {
        if (e.batch?._id) {
          const bId = e.batch._id.toString();
          eMap[bId] = (eMap[bId] || 0) + 1;
        }
      });
      setEnrollmentMap(eMap);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to load batches.");
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchTerm, selectedSubject]);

  // Fetch active teachers for modal
  useEffect(() => {
    if (isAdmin) {
      getFacultyList()
        .then((list) => setTeachers(list || []))
        .catch((err) => console.error("Could not load faculty list:", err));
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchBatchData();
  }, [fetchBatchData]);

  // Action handlers
  const handleEdit = (batch) => {
    setEditingBatch(batch);
    setModalOpen(true);
  };

  const handleArchive = async (id) => {
    if (window.confirm("Are you sure you want to archive this cohort? Historical records will be preserved.")) {
      try {
        await archiveBatch(id);
        fetchBatchData();
      } catch (err) {
        alert("Failed to archive batch: " + (err.response?.data?.message || err.message));
      }
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await updateBatchStatus(id, status);
      fetchBatchData();
    } catch (err) {
      alert("Failed to update status: " + (err.response?.data?.message || err.message));
    }
  };

  const exportCSV = () => {
    if (batches.length === 0) return;
    const headers = ["ID", "Name", "Subject", "Status", "Capacity", "Fee", "Teacher", "Schedule"];
    const rows = batches.map((b) => [
      b._id,
      `"${b.name}"`,
      `"${b.subject}"`,
      b.status,
      b.capacity,
      b.fee,
      `"${b.teacher?.name || ""}"`,
      `"${b.schedule?.days?.join(",") || ""} ${b.schedule?.startTime}-${b.schedule?.endTime}"`,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `EduBatch_Registry_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Real aggregated totals for top metrics
  const totalCapacity = batches.reduce((acc, b) => acc + (b.capacity || 0), 0);
  const totalEnrolled = batches.reduce((acc, b) => acc + (enrollmentMap[b._id] || 0), 0);
  const utilizationPercent =
    totalCapacity > 0 ? Math.round((totalEnrolled / totalCapacity) * 1000) / 10 : 0;
  const hardLockedCount = batches.filter(
    (b) => (enrollmentMap[b._id] || 0) >= b.capacity
  ).length;
  const totalEstimatedRevenue = batches.reduce(
    (acc, b) => acc + b.fee * (enrollmentMap[b._id] || 0),
    0
  );

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Subheader & Registry Action Bar */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-[#E5E3DC]">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-mono tracking-wider uppercase text-[#5A6275]">
              <span>CURRICULUM REGISTRY DESK</span>
              <span>•</span>
              <span className="px-1.5 py-0.5 rounded bg-[#EDF7F2] text-[#1E4934] border border-[#A3D4BC] font-semibold">
                HARD CAPACITY LOCK ACTIVE
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1B2A4A] tracking-tight mt-1">
              Batch Registry & Curriculum Schedule
            </h1>
            <p className="text-xs text-[#5A6275] font-sans mt-0.5">
              Configure course cohorts, fee structures, faculty assignments, and enforce server-side hard capacity locks to prevent overselling.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={exportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-[#F7F6F2] text-[#1B2A4A] border border-[#E5E3DC] text-xs font-semibold rounded shadow-2xs transition-colors cursor-pointer"
            >
              <Download size={14} />
              <span>Export Ledger (CSV)</span>
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  setEditingBatch(null);
                  setModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#1B2A4A] hover:bg-[#253963] text-white text-xs font-semibold rounded shadow-xs transition-colors cursor-pointer"
              >
                <Plus size={14} className="text-[#D99A2B]" />
                <span>Register New Batch</span>
              </button>
            )}
          </div>
        </div>

        {/* 4 Key Registry Summary Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Enrolled Seats */}
          <div className="bg-white border border-[#E5E3DC] rounded-lg p-4 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-[#5A6275] font-semibold">
                <span>TOTAL ENROLLED SEATS</span>
                <Users size={14} className="text-[#64748B]" />
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-3xl font-serif font-bold text-[#1B2A4A]">
                  {totalEnrolled}
                </span>
                <span className="text-xs font-mono text-[#64748B]">
                  / {totalCapacity} Capacity
                </span>
              </div>
              <div className="w-full bg-[#EFECE6] h-1.5 rounded-full overflow-hidden mt-3">
                <div
                  className="bg-[#1B2A4A] h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, utilizationPercent)}%` }}
                ></div>
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-[#E5E3DC] flex items-center justify-between text-[11px] font-mono">
              <span className="text-[#5A6275]">Utilization:</span>
              <span className="font-bold text-[#1B2A4A]">{utilizationPercent}%</span>
            </div>
          </div>

          {/* Card 2: Hard-Locked Cohorts */}
          <div className="bg-white border border-[#E5E3DC] rounded-lg p-4 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-[#5A6275] font-semibold">
                <span>HARD-LOCKED COHORTS</span>
                <Lock size={14} className="text-[#B23A32]" />
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-3xl font-serif font-bold text-[#B23A32]">
                  {hardLockedCount}
                </span>
                <span className="text-xs font-sans text-[#5A6275]">Batches at 100% cap</span>
              </div>
              <div className="text-[11px] font-sans text-[#5A6275] mt-1 leading-snug">
                Atomic database guards prevent admission overflow.
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-[#E5E3DC] flex items-center justify-between text-[11px] font-mono">
              <span className="text-[#B23A32] font-semibold">Zero Overselling</span>
              <span className="text-[#2F6E4F] font-bold">ENFORCED</span>
            </div>
          </div>

          {/* Card 3: Expected Fee Ledger */}
          <div className="bg-white border border-[#E5E3DC] rounded-lg p-4 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-[#5A6275] font-semibold">
                <span>ENROLLED TUITION VALUE</span>
                <IndianRupee size={14} className="text-[#D99A2B]" />
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-serif font-bold text-[#1B2A4A]">
                  ₹{totalEstimatedRevenue.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="text-[11px] font-mono text-[#5A6275] mt-1">
                Across {totalEnrolled} admitted candidates
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-[#E5E3DC] flex items-center justify-between text-[11px] font-mono">
              <span className="text-[#2F6E4F]">Verified Ledger</span>
              <span className="text-[#5A6275]">{batches.length} Cohorts</span>
            </div>
          </div>

          {/* Card 4: Faculty Utilization */}
          <div className="bg-white border border-[#E5E3DC] rounded-lg p-4 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-[#5A6275] font-semibold">
                <span>FACULTY LEADS</span>
                <Users size={14} className="text-[#1B2A4A]" />
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-3xl font-serif font-bold text-[#1B2A4A]">
                  {teachers.length}
                </span>
                <span className="text-xs font-sans text-[#5A6275]">Active Faculty</span>
              </div>
              <div className="text-[11px] font-sans text-[#5A6275] mt-1">
                Authorized for batch roll calls and roster oversight.
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-[#E5E3DC] flex items-center justify-between text-[11px] font-mono">
              <span className="text-[#2F6E4F]">Assigned Status</span>
              <span className="text-[#1B2A4A] font-bold">ACTIVE</span>
            </div>
          </div>
        </div>

        {/* Status Filter Tabs & Search Bar */}
        <div className="bg-white border border-[#E5E3DC] rounded-lg p-3 shadow-2xs flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
            {[
              { key: "all", label: `ALL BATCHES (${counts.all})` },
              { key: "active", label: `ACTIVE (${counts.active})` },
              { key: "upcoming", label: `UPCOMING (${counts.upcoming})` },
              { key: "archived", label: `ARCHIVED (${counts.archived})` },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-1.5 rounded text-xs font-mono font-semibold transition-colors shrink-0 cursor-pointer ${
                  activeTab === tab.key
                    ? "bg-[#1B2A4A] text-white"
                    : "text-[#5A6275] hover:bg-[#F7F6F2] hover:text-[#1B2A4A]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box & Discipline Filter */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5A6275]"
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search batch or subject..."
                className="pl-8 pr-3 py-1.5 bg-[#FCFBF8] border border-[#E5E3DC] rounded text-xs text-[#22242B] focus:outline-hidden focus:border-[#1B2A4A] w-full sm:w-56"
              />
            </div>

            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="px-2.5 py-1.5 bg-[#FCFBF8] border border-[#E5E3DC] rounded text-xs text-[#22242B] font-mono focus:outline-hidden focus:border-[#1B2A4A]"
            >
              <option value="All Disciplines">All Disciplines</option>
              <option value="Physics">Physics</option>
              <option value="Mathematics">Mathematics</option>
              <option value="Chemistry">Chemistry</option>
              <option value="Biology">Biology</option>
            </select>
          </div>
        </div>

        {/* Main Content: Batches Grid & Right Control Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Feed of Batches (2 Columns) */}
          <div className="lg:col-span-2 space-y-4">
            {loading ? (
              <div className="bg-white border border-[#E5E3DC] rounded-lg p-12 text-center">
                <div className="w-6 h-6 border-2 border-[#1B2A4A] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <div className="text-xs font-mono text-[#5A6275]">Loading Cohort Registry...</div>
              </div>
            ) : error ? (
              <div className="bg-[#FDF1F0] border border-[#F3AAA5] rounded-lg p-4 text-xs text-[#B23A32]">
                {error}
              </div>
            ) : batches.length === 0 ? (
              <div className="bg-white border border-[#E5E3DC] rounded-lg p-12 text-center">
                <CalendarDays size={36} className="text-[#64748B] mx-auto mb-2" />
                <h3 className="font-serif font-bold text-[#1B2A4A] text-lg">No Cohorts Found</h3>
                <p className="text-xs text-[#5A6275] mt-1">
                  No batches match your selected filter criteria.
                </p>
                {isAdmin && (
                  <button
                    onClick={() => {
                      setEditingBatch(null);
                      setModalOpen(true);
                    }}
                    className="mt-4 px-3 py-1.5 bg-[#1B2A4A] text-white rounded text-xs font-semibold cursor-pointer"
                  >
                    + Register First Batch
                  </button>
                )}
              </div>
            ) : (
              batches.map((batch) => (
                <BatchCard
                  key={batch._id}
                  batch={{
                    ...batch,
                    enrolledCount: enrollmentMap[batch._id] ?? 0,
                  }}
                  isAdmin={isAdmin}
                  onEdit={handleEdit}
                  onStatusChange={handleStatusChange}
                  onArchive={handleArchive}
                />
              ))
            )}
          </div>

          {/* Right Column: Registry Integrity & Faculty Leads */}
          <div className="space-y-4">
            {/* Server-Side Capacity Lock Box */}
            <div className="p-3.5 bg-[#FEF8EC] border border-[#F3D28E] rounded-lg text-xs">
              <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-[#A67119] uppercase">
                <ShieldCheck size={14} />
                <span>SERVER-SIDE CAPACITY LOCK</span>
              </div>
              <p className="text-[11px] text-[#22242B] font-sans mt-1.5 leading-relaxed">
                Database integrity checks strictly reject admissions when{" "}
                <code className="bg-[#FAF2DF] px-1 py-0.5 rounded font-mono text-[10px]">
                  enrolled &gt;= capacity
                </code>
                . This guarantees strict quota discipline across all cohorts.
              </p>
            </div>

            {/* Active Faculty Leads */}
            <div className="bg-white border border-[#E5E3DC] rounded-lg p-4 shadow-2xs">
              <div className="flex items-center justify-between pb-3 border-b border-[#E5E3DC]">
                <span className="text-xs font-mono uppercase font-semibold text-[#1B2A4A]">
                  ASSIGNED FACULTY LEADS
                </span>
                <span className="text-xs font-mono text-[#5A6275]">
                  {teachers.length} Active
                </span>
              </div>
              <div className="mt-3 space-y-2 text-xs">
                {teachers.length === 0 ? (
                  <div className="py-4 text-center text-[#5A6275] text-xs">
                    No faculty accounts registered yet.
                  </div>
                ) : (
                  teachers.map((t) => (
                    <div
                      key={t._id}
                      className="flex items-center justify-between p-2 border border-[#E5E3DC] rounded bg-[#FCFBF8]"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-[#1B2A4A] text-white text-[10px] font-mono font-bold flex items-center justify-center">
                          {t.name
                            ?.split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-[#1B2A4A]">{t.name}</div>
                          <div className="text-[10px] text-[#5A6275]">{t.email}</div>
                        </div>
                      </div>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-[#EDF7F2] text-[#1E4934] border border-[#A3D4BC]">
                        FACULTY
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Curriculum Breakdown */}
            <div className="bg-white border border-[#E5E3DC] rounded-lg p-4 shadow-2xs">
              <div className="flex items-center justify-between pb-3 border-b border-[#E5E3DC]">
                <span className="text-xs font-mono uppercase font-semibold text-[#1B2A4A]">
                  COHORT STATUS DISTRIBUTION
                </span>
                <CheckCircle2 size={15} className="text-[#2F6E4F]" />
              </div>
              <div className="mt-3 space-y-2 text-[11px] font-mono text-[#5A6275]">
                <div className="flex items-center justify-between">
                  <span>Active Cohorts:</span>
                  <span className="text-[#1B2A4A] font-bold">{counts.active}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Upcoming Cohorts:</span>
                  <span className="text-[#1B2A4A] font-bold">{counts.upcoming}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Archived Cohorts:</span>
                  <span className="text-[#1B2A4A] font-bold">{counts.archived}</span>
                </div>
                <div className="pt-2 border-t border-[#E5E3DC] flex items-center justify-between">
                  <span>Total Managed:</span>
                  <span className="text-[#1B2A4A] font-bold">{counts.all}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Batch Registration / Modification Modal */}
        <BatchModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSuccess={fetchBatchData}
          editBatch={editingBatch}
          teachers={teachers}
        />
      </div>
    </DashboardLayout>
  );
};

export default BatchRegistry;
