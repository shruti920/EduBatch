import React, { useState, useEffect } from "react";
import { X, UserPlus, AlertCircle, Users, CheckCircle2, ShieldAlert } from "lucide-react";
import { enrollStudent, getCandidates } from "../../api/enrollmentApi";
import { getBatches } from "../../api/batchApi";

const EnrollStudentModal = ({ isOpen, onClose, onSuccess, initialBatchId = null }) => {
  const [candidates, setCandidates] = useState([]);
  const [batches, setBatches] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [selectedBatch, setSelectedBatch] = useState(initialBatchId || "");
  const [paymentStatus, setPaymentStatus] = useState("pending");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setError("");
      // Fetch available candidates and batches
      Promise.all([getCandidates(), getBatches({ status: "all" })])
        .then(([studentsList, batchesData]) => {
          setCandidates(studentsList || []);
          const activeBatches = (batchesData.batches || []).filter(
            (b) => b.status !== "archived" && !b.isArchived
          );
          setBatches(activeBatches);
          if (initialBatchId) {
            setSelectedBatch(initialBatchId);
          } else if (activeBatches.length > 0) {
            setSelectedBatch(activeBatches[0]._id);
          }
          if (studentsList.length > 0) {
            setSelectedStudent(studentsList[0]._id);
          }
        })
        .catch((err) => {
          setError(err.response?.data?.message || err.message || "Failed to load candidates/batches.");
        });
    }
  }, [isOpen, initialBatchId]);

  if (!isOpen) return null;

  const activeBatchObj = batches.find((b) => b._id === selectedBatch);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!selectedStudent || !selectedBatch) {
      setError("Please select both a candidate student and a target cohort.");
      return;
    }

    setLoading(true);

    try {
      await enrollStudent({
        student: selectedStudent,
        batch: selectedBatch,
        paymentStatus,
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || "Failed to enroll candidate."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#101B30]/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white border border-[#E5E3DC] rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E5E3DC] flex items-center justify-between bg-[#FCFBF8]">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-[#5A6275]">
              ADMISSION & ENROLLMENT DISPATCH
            </div>
            <h2 className="text-xl font-serif font-bold text-[#1B2A4A] mt-0.5">
              Direct Candidate Enrollment
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-[#64748B] hover:text-[#1B2A4A] hover:bg-[#F2F6FC] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs font-sans">
          {error && (
            <div className="p-3 bg-[#FDF1F0] border border-[#F3AAA5] rounded text-xs text-[#B23A32] flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Student Select */}
          <div>
            <label className="block text-[11px] font-mono font-semibold uppercase text-[#1B2A4A] mb-1">
              Select Registered Candidate *
            </label>
            <select
              required
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
              className="w-full px-3 py-2 bg-[#F7F6F2] border border-[#E5E3DC] rounded text-xs text-[#22242B] focus:bg-white focus:border-[#1B2A4A] focus:outline-none font-medium"
            >
              <option value="">-- Choose Candidate --</option>
              {candidates.map((cand) => (
                <option key={cand._id} value={cand._id}>
                  {cand.name} • {cand.email} {cand.phone ? `(${cand.phone})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Target Batch Select */}
          <div>
            <label className="block text-[11px] font-mono font-semibold uppercase text-[#1B2A4A] mb-1">
              Target Academic Cohort *
            </label>
            <select
              required
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="w-full px-3 py-2 bg-[#F7F6F2] border border-[#E5E3DC] rounded text-xs text-[#22242B] focus:bg-white focus:border-[#1B2A4A] focus:outline-none font-medium"
            >
              <option value="">-- Select Cohort --</option>
              {batches.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.name} ({b.subject}) — ₹{b.fee?.toLocaleString("en-IN")}
                </option>
              ))}
            </select>
          </div>

          {/* Target Batch Details Snippet */}
          {activeBatchObj && (
            <div className="p-3 bg-[#FCFBF8] border border-[#E5E3DC] rounded text-xs">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase font-bold text-[#5A6275]">
                  COHORT CAPACITY LIMIT
                </span>
                <span className="font-mono text-[11px] font-bold text-[#1B2A4A]">
                  Max: {activeBatchObj.capacity} Seats
                </span>
              </div>
              <div className="text-[11px] text-[#5A6275] mt-1 font-mono">
                Schedule: {activeBatchObj.schedule?.days?.join(", ")} ({activeBatchObj.schedule?.startTime} – {activeBatchObj.schedule?.endTime})
              </div>
            </div>
          )}

          {/* Payment Status */}
          <div>
            <label className="block text-[11px] font-mono font-semibold uppercase text-[#1B2A4A] mb-1">
              Initial Tuition Fee Settlement Status
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: "pending", label: "Pending Due", desc: "Awaiting Online/Offline Pay" },
                { key: "paid", label: "Paid & Cleared", desc: "Direct / Cash Received" },
                { key: "waived", label: "Fee Waived", desc: "Merit / Scholarship Grant" },
              ].map((p) => {
                const isSelected = paymentStatus === p.key;
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setPaymentStatus(p.key)}
                    className={`p-2.5 rounded border text-left transition-all cursor-pointer ${
                      isSelected
                        ? "bg-[#1B2A4A] text-white border-[#1B2A4A] shadow-xs"
                        : "bg-[#F7F6F2] text-[#22242B] border-[#E5E3DC] hover:border-[#1B2A4A]"
                    }`}
                  >
                    <div className="font-mono font-bold text-[10px] uppercase">
                      {p.label}
                    </div>
                    <div
                      className={`text-[9px] mt-0.5 ${
                        isSelected ? "text-slate-300" : "text-[#5A6275]"
                      }`}
                    >
                      {p.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer actions */}
          <div className="pt-4 border-t border-[#E5E3DC] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-[#F7F6F2] text-[#5A6275] border border-[#E5E3DC] rounded text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-[#1B2A4A] hover:bg-[#253963] text-white rounded text-xs font-semibold uppercase tracking-wider transition-colors shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <UserPlus size={14} className="text-[#D99A2B]" />
                  <span>Confirm Enrollment</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EnrollStudentModal;
