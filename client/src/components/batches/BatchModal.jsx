import React, { useState, useEffect } from "react";
import { X, Calendar, Clock, Users, IndianRupee, MapPin, AlertCircle } from "lucide-react";
import { createBatch, updateBatch } from "../../api/batchApi";

const ALL_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const BatchModal = ({ isOpen, onClose, onSuccess, editBatch = null, teachers = [] }) => {
  const [formData, setFormData] = useState({
    name: "",
    subject: "",
    description: "",
    capacity: 40,
    fee: 35000,
    teacher: "",
    status: "upcoming",
    days: ["Mon", "Wed", "Fri"],
    startTime: "07:00",
    endTime: "09:30",
    venue: "Hall 3 (Auditorium)",
    startDate: "",
    endDate: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editBatch) {
      setFormData({
        name: editBatch.name || "",
        subject: editBatch.subject || "",
        description: editBatch.description || "",
        capacity: editBatch.capacity || 40,
        fee: editBatch.fee || 0,
        teacher: editBatch.teacher?._id || editBatch.teacher || "",
        status: editBatch.status || "upcoming",
        days: editBatch.schedule?.days || ["Mon", "Wed", "Fri"],
        startTime: editBatch.schedule?.startTime || "07:00",
        endTime: editBatch.schedule?.endTime || "09:30",
        venue: editBatch.schedule?.venue || "Hall 3 (Auditorium)",
        startDate: editBatch.startDate ? editBatch.startDate.split("T")[0] : "",
        endDate: editBatch.endDate ? editBatch.endDate.split("T")[0] : "",
      });
    } else {
      // Default to first teacher if available
      setFormData({
        name: "",
        subject: "",
        description: "",
        capacity: 40,
        fee: 35000,
        teacher: teachers[0]?._id || "",
        status: "upcoming",
        days: ["Mon", "Wed", "Fri"],
        startTime: "07:00",
        endTime: "09:30",
        venue: "Hall 3 (Auditorium)",
        startDate: "",
        endDate: "",
      });
    }
    setError("");
  }, [editBatch, teachers, isOpen]);

  if (!isOpen) return null;

  const handleDayToggle = (day) => {
    setFormData((prev) => {
      const exists = prev.days.includes(day);
      const updated = exists
        ? prev.days.filter((d) => d !== day)
        : [...prev.days, day];
      return { ...prev, days: updated.length > 0 ? updated : [day] };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.name.trim() || !formData.subject.trim()) {
      setError("Batch name and subject are mandatory.");
      return;
    }

    if (!formData.teacher) {
      setError("Please assign a designated faculty lead.");
      return;
    }

    if (formData.days.length === 0) {
      setError("Select at least one lecture day for the schedule.");
      return;
    }

    setLoading(true);

    const payload = {
      name: formData.name.trim(),
      subject: formData.subject.trim(),
      description: formData.description.trim(),
      capacity: Number(formData.capacity),
      fee: Number(formData.fee),
      teacher: formData.teacher,
      status: formData.status,
      schedule: {
        days: formData.days,
        startTime: formData.startTime,
        endTime: formData.endTime,
        venue: formData.venue.trim(),
      },
      startDate: formData.startDate || null,
      endDate: formData.endDate || null,
    };

    try {
      if (editBatch) {
        await updateBatch(editBatch._id, payload);
      } else {
        await createBatch(payload);
      }
      onSuccess();
      onClose();
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || "Failed to save batch details."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#101B30]/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white border border-[#E5E3DC] rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#E5E3DC] flex items-center justify-between bg-[#FCFBF8]">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-[#5A6275]">
              CURRICULUM REGISTRY ENTRY
            </div>
            <h2 className="text-xl font-serif font-bold text-[#1B2A4A] mt-0.5">
              {editBatch ? "Modify Cohort Configuration" : "Register New Academic Cohort"}
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

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs font-sans">
          {error && (
            <div className="p-3 bg-[#FDF1F0] border border-[#F3AAA5] rounded text-xs text-[#B23A32] flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Batch Name & Subject */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-mono font-semibold uppercase text-[#1B2A4A] mb-1">
                Batch / Cohort Title *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. JEE Advanced 2026 — Morning Batch A"
                className="w-full px-3 py-2 bg-[#F7F6F2] border border-[#E5E3DC] rounded text-xs text-[#22242B] focus:bg-white focus:border-[#1B2A4A] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono font-semibold uppercase text-[#1B2A4A] mb-1">
                Subject / Discipline *
              </label>
              <input
                type="text"
                required
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="e.g. Physics & Pure Math"
                className="w-full px-3 py-2 bg-[#F7F6F2] border border-[#E5E3DC] rounded text-xs text-[#22242B] focus:bg-white focus:border-[#1B2A4A] focus:outline-none"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-[11px] font-mono font-semibold uppercase text-[#1B2A4A] mb-1">
              Curriculum Syllabus & Objectives
            </label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Target AIR top 500, rigorous weekly problem sheets, mechanics & calculus focus..."
              className="w-full px-3 py-2 bg-[#F7F6F2] border border-[#E5E3DC] rounded text-xs text-[#22242B] focus:bg-white focus:border-[#1B2A4A] focus:outline-none"
            />
          </div>

          {/* Faculty Lead & Venue */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-mono font-semibold uppercase text-[#1B2A4A] mb-1">
                Assigned Faculty Lead *
              </label>
              <select
                required
                value={formData.teacher}
                onChange={(e) => setFormData({ ...formData, teacher: e.target.value })}
                className="w-full px-3 py-2 bg-[#F7F6F2] border border-[#E5E3DC] rounded text-xs text-[#22242B] focus:bg-white focus:border-[#1B2A4A] focus:outline-none font-medium"
              >
                <option value="">-- Select Designated Teacher --</option>
                {teachers.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.name} ({t.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-mono font-semibold uppercase text-[#1B2A4A] mb-1">
                Venue / Classroom Hall
              </label>
              <input
                type="text"
                value={formData.venue}
                onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                placeholder="e.g. Hall 3 (Auditorium)"
                className="w-full px-3 py-2 bg-[#F7F6F2] border border-[#E5E3DC] rounded text-xs text-[#22242B] focus:bg-white focus:border-[#1B2A4A] focus:outline-none"
              />
            </div>
          </div>

          {/* Capacity, Tuition Fee & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-mono font-semibold uppercase text-[#1B2A4A] mb-1">
                Capacity Quota *
              </label>
              <input
                type="number"
                required
                min={1}
                max={500}
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                className="w-full px-3 py-2 bg-[#F7F6F2] border border-[#E5E3DC] rounded text-xs text-[#22242B] focus:bg-white focus:border-[#1B2A4A] focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono font-semibold uppercase text-[#1B2A4A] mb-1">
                Tuition Fee (₹ INR) *
              </label>
              <input
                type="number"
                required
                min={0}
                value={formData.fee}
                onChange={(e) => setFormData({ ...formData, fee: e.target.value })}
                className="w-full px-3 py-2 bg-[#F7F6F2] border border-[#E5E3DC] rounded text-xs text-[#22242B] focus:bg-white focus:border-[#1B2A4A] focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono font-semibold uppercase text-[#1B2A4A] mb-1">
                Lifecycle Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 bg-[#F7F6F2] border border-[#E5E3DC] rounded text-xs text-[#22242B] focus:bg-white focus:border-[#1B2A4A] focus:outline-none font-mono font-semibold uppercase"
              >
                <option value="upcoming">Upcoming</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          {/* Schedule: Day Selection Pills */}
          <div>
            <label className="block text-[11px] font-mono font-semibold uppercase text-[#1B2A4A] mb-1.5">
              Scheduled Class Days
            </label>
            <div className="flex flex-wrap gap-2">
              {ALL_DAYS.map((day) => {
                const selected = formData.days.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => handleDayToggle(day)}
                    className={`px-3 py-1.5 rounded text-xs font-mono font-semibold transition-all cursor-pointer ${
                      selected
                        ? "bg-[#1B2A4A] text-white shadow-xs border border-[#1B2A4A]"
                        : "bg-[#F7F6F2] text-[#5A6275] border border-[#E5E3DC] hover:border-[#1B2A4A]"
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Class Timings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-mono font-semibold uppercase text-[#1B2A4A] mb-1">
                Class Start Time (24h)
              </label>
              <input
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                className="w-full px-3 py-2 bg-[#F7F6F2] border border-[#E5E3DC] rounded text-xs text-[#22242B] focus:bg-white focus:border-[#1B2A4A] focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono font-semibold uppercase text-[#1B2A4A] mb-1">
                Class End Time (24h)
              </label>
              <input
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                className="w-full px-3 py-2 bg-[#F7F6F2] border border-[#E5E3DC] rounded text-xs text-[#22242B] focus:bg-white focus:border-[#1B2A4A] focus:outline-none font-mono"
              />
            </div>
          </div>

          {/* Modal Footer */}
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
                <span>{editBatch ? "Update Cohort" : "Register Cohort"}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BatchModal;
