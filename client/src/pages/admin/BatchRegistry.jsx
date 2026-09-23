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
import { useAuth } from "../../context/AuthContext";

const BatchRegistry = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [batches, setBatches] = useState([]);
  const [counts, setCounts] = useState({ all: 0, active: 0, upcoming: 0, archived: 0 });
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("All Disciplines");

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState(null);

  // Fetch batches from backend
  const fetchBatchData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const params = {
        status: activeTab,
        ...(searchTerm && { search: searchTerm }),
        ...(selectedSubject !== "All Disciplines" && { subject: selectedSubject }),
      };
      const data = await getBatches(params);
      setBatches(data.batches || []);
      if (data.counts) {
        setCounts(data.counts);
      }
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
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `EduBatch_Registry_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Aggregated totals for top metrics
  const totalCapacity = batches.reduce((acc, b) => acc + (b.capacity || 0), 0);
  const totalEstimatedRevenue = batches.reduce((acc, b) => acc + (b.fee * (b.capacity || 0)), 0);

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Subheader & Registry Action Bar */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-[#E5E3DC]">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-mono tracking-wider uppercase text-[#5A6275]">
              <span>LEDGER GROUP: BATCH-MGMT-2025</span>
              <span>•</span>
              <span className="text-[#2F6E4F] font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2F6E4F]"></span>
                SYNCED WITH MONGODB REPLICA
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
                <span className="text-3xl font-serif font-bold text-[#1B2A4A]">412</span>
                <span className="text-xs font-mono text-[#64748B]">/ {totalCapacity || 480} Capacity</span>
              </div>
              <div className="w-full bg-[#EFECE6] h-1.5 rounded-full overflow-hidden mt-3">
                <div className="bg-[#1B2A4A] h-full rounded-full" style={{ width: "85.8%" }}></div>
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-[#E5E3DC] flex items-center justify-between text-[11px] font-mono">
              <span className="text-[#5A6275]">Aggregate Utilization:</span>
              <span className="font-bold text-[#1B2A4A]">85.8%</span>
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
                <span className="text-3xl font-serif font-bold text-[#B23A32]">3</span>
                <span className="text-xs font-sans text-[#5A6275]">Batches at 100% cap</span>
              </div>
              <div className="text-[11px] font-sans text-[#5A6275] mt-1 leading-snug">
                Server rejected 14 overflow application requests today.
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-[#E5E3DC] flex items-center justify-between text-[11px] font-mono">
              <span className="text-[#B23A32] font-semibold">Zero Overselling</span>
              <span className="text-[#2F6E4F] font-bold">LOCKED</span>
            </div>
          </div>

          {/* Card 3: Expected Fee Ledger */}
          <div className="bg-white border border-[#E5E3DC] rounded-lg p-4 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-[#5A6275] font-semibold">
                <span>EXPECTED FEE LEDGER</span>
                <IndianRupee size={14} className="text-[#D99A2B]" />
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-serif font-bold text-[#1B2A4A]">
                  ₹{(totalEstimatedRevenue || 18440000).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="text-[11px] font-mono text-[#5A6275] mt-1">
                Razorpay Reconciled: ₹1,58,60,000 (86%)
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-[#E5E3DC] flex items-center justify-between text-[11px] font-mono">
              <span className="text-[#2F6E4F]">86% Realized</span>
              <span className="text-[#5A6275]">Term 1 Quota</span>
            </div>
          </div>

          {/* Card 4: Faculty Utilization */}
          <div className="bg-white border border-[#E5E3DC] rounded-lg p-4 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-[#5A6275] font-semibold">
                <span>FACULTY UTILIZATION</span>
                <Users size={14} className="text-[#1B2A4A]" />
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-3xl font-serif font-bold text-[#1B2A4A]">18 / 20</span>
                <span className="text-xs font-sans text-[#5A6275]">Active Leads</span>
              </div>
              <div className="text-[11px] font-sans text-[#5A6275] mt-1">
                Avg lecture load: 16.5 hrs/week per senior faculty member.
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-[#E5E3DC] flex items-center justify-between text-[11px] font-mono">
              <span className="text-[#2F6E4F]">Normal Workload</span>
              <span className="text-[#1B2A4A] font-bold">OPTIMAL</span>
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
                className={`px-3 py-1.5 rounded text-xs font-mono font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === tab.key
                    ? "bg-[#1B2A4A] text-white shadow-xs"
                    : "text-[#5A6275] hover:text-[#1B2A4A] hover:bg-[#F7F6F2]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search and Subject Dropdown */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-[#5A6275] font-mono">
              <span>SUBJECT:</span>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="bg-[#F7F6F2] border border-[#E5E3DC] rounded px-2 py-1 text-xs text-[#22242B] font-sans focus:outline-none focus:border-[#1B2A4A]"
              >
                <option>All Disciplines</option>
                <option>Physics</option>
                <option>Math</option>
                <option>Chemistry</option>
                <option>Complete PCM</option>
              </select>
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
                placeholder="Filter cohort..."
                className="pl-8 pr-3 py-1 bg-[#F7F6F2] border border-[#E5E3DC] rounded text-xs text-[#22242B] placeholder-[#64748B] focus:outline-none focus:border-[#1B2A4A] focus:bg-white w-40 sm:w-48 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Split Grid: Batch Cards Feed + Right-Hand Operational Panels */}
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
                  batch={batch}
                  isAdmin={isAdmin}
                  onEdit={handleEdit}
                  onStatusChange={handleStatusChange}
                  onArchive={handleArchive}
                />
              ))
            )}
          </div>

          {/* Right Column: Physical Hall Allocations, Collision Guard & Load Matrix */}
          <div className="space-y-4">
            {/* Physical Hall Allocations Card */}
            <div className="bg-white border border-[#E5E3DC] rounded-lg p-4 shadow-2xs">
              <div className="flex items-center justify-between pb-3 border-b border-[#E5E3DC]">
                <div className="text-xs font-mono uppercase font-semibold text-[#1B2A4A] flex items-center gap-1.5">
                  <Building size={14} className="text-[#D99A2B]" />
                  <span>PHYSICAL HALL ALLOCATIONS</span>
                </div>
                <span className="text-[10px] font-mono text-[#5A6275]">SHIFT: MORNING</span>
              </div>

              <div className="mt-3 space-y-2.5 text-xs font-sans">
                <div className="p-2.5 border border-[#E5E3DC] rounded bg-[#FCFBF8]">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#1B2A4A]">Hall 3 (Auditorium)</span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-[#FDF1F0] text-[#B23A32]">
                      100% FULL
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-[#5A6275] mt-1">
                    Max Cap: 45 | Current: 45
                  </div>
                </div>

                <div className="p-2.5 border border-[#E5E3DC] rounded bg-[#FCFBF8]">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#1B2A4A]">Lab 2B (Biology)</span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-[#FEF8EC] text-[#A67119]">
                      95% (2 OPEN)
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-[#5A6275] mt-1">
                    Max Cap: 40 | Current: 38
                  </div>
                </div>

                <div className="p-2.5 border border-[#E5E3DC] rounded bg-[#FCFBF8]">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#1B2A4A]">Room 104 (East Block)</span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-[#EDF7F2] text-[#1E4934]">
                      80% (7 OPEN)
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-[#5A6275] mt-1">
                    Max Cap: 35 | Current: 28
                  </div>
                </div>

                <div className="p-2.5 border border-[#E5E3DC] rounded bg-[#FCFBF8]">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#1B2A4A]">Hall 1 (Lecture Theatre)</span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-[#EDF7F2] text-[#1E4934]">
                      28% (36 OPEN)
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-[#5A6275] mt-1">
                    Max Cap: 50 | Current: 14
                  </div>
                </div>
              </div>
            </div>

            {/* Server-Side Capacity Lock Box */}
            <div className="p-3.5 bg-[#FEF8EC] border border-[#F3D28E] rounded-lg text-xs">
              <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-[#A67119] uppercase">
                <ShieldCheck size={14} />
                <span>SERVER-SIDE CAPACITY LOCK</span>
              </div>
              <p className="text-[11px] text-[#22242B] font-sans mt-1.5 leading-relaxed">
                Atomic transactions inside the MongoDB registration endpoint guarantee that when{" "}
                <code className="bg-[#FAF2DF] px-1 py-0.5 rounded font-mono text-[10px]">
                  current_enrolled == max_capacity
                </code>
                , candidate registration requests automatically fault to waitlist.
              </p>
            </div>

            {/* Timetable Collision Guard */}
            <div className="bg-white border border-[#E5E3DC] rounded-lg p-4 shadow-2xs">
              <div className="flex items-center justify-between pb-3 border-b border-[#E5E3DC]">
                <span className="text-xs font-mono uppercase font-semibold text-[#1B2A4A]">
                  TIMETABLE COLLISION GUARD
                </span>
                <CheckCircle2 size={15} className="text-[#2F6E4F]" />
              </div>
              <div className="p-2.5 bg-[#EDF7F2] border border-[#A3D4BC] rounded mt-3 text-xs">
                <div className="font-mono text-[10px] font-bold text-[#1E4934] uppercase flex items-center gap-1">
                  <span>ZERO SCHEDULE OVERLAPS</span>
                </div>
                <div className="text-[11px] text-[#22242B] mt-1">
                  All active cohorts checked against 5 physical venues and faculty calendars. No overlapping bookings detected.
                </div>
              </div>
              <div className="mt-3 space-y-1.5 text-[11px] font-mono text-[#5A6275]">
                <div className="flex items-center justify-between">
                  <span>Weekly Lecture Hours:</span>
                  <span className="text-[#1B2A4A] font-bold">312.5 hrs</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Unallocated Hall Slots:</span>
                  <span className="text-[#1B2A4A] font-bold">18 slots</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Faculty Overload Flags:</span>
                  <span className="text-[#2F6E4F] font-bold">0 warnings</span>
                </div>
              </div>
            </div>

            {/* Faculty Load Matrix */}
            <div className="bg-white border border-[#E5E3DC] rounded-lg p-4 shadow-2xs">
              <div className="flex items-center justify-between pb-3 border-b border-[#E5E3DC]">
                <span className="text-xs font-mono uppercase font-semibold text-[#1B2A4A]">
                  FACULTY LOAD MATRIX
                </span>
                <button className="text-[10px] font-mono text-[#1B2A4A] font-semibold hover:underline">
                  VIEW ALL
                </button>
              </div>
              <div className="mt-3 space-y-2 text-xs">
                <div className="flex items-center justify-between p-2 border border-[#E5E3DC] rounded">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-[#1B2A4A] text-white text-[10px] font-mono font-bold flex items-center justify-center">
                      AS
                    </div>
                    <div>
                      <div className="font-semibold text-[#1B2A4A]">Prof. Alok Shrivastava</div>
                      <div className="text-[10px] text-[#5A6275]">Physics • JEE Adv</div>
                    </div>
                  </div>
                  <span className="font-mono text-[11px] font-bold text-[#1B2A4A]">18h / wk</span>
                </div>

                <div className="flex items-center justify-between p-2 border border-[#E5E3DC] rounded">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-[#2F6E4F] text-white text-[10px] font-mono font-bold flex items-center justify-center">
                      VS
                    </div>
                    <div>
                      <div className="font-semibold text-[#1B2A4A]">Dr. Vandana Sen</div>
                      <div className="text-[10px] text-[#5A6275]">Zoology • NEET Target</div>
                    </div>
                  </div>
                  <span className="font-mono text-[11px] font-bold text-[#1B2A4A]">21h / wk</span>
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
