import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Clock,
  MapPin,
  Calendar,
  Lock,
  Edit2,
  Archive,
  MoreVertical,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from "lucide-react";

const BatchCard = ({
  batch,
  isAdmin = false,
  onEdit,
  onStatusChange,
  onArchive,
}) => {
  const navigate = useNavigate();

  // Compute duration in hours
  const calculateDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return "2h";
    const [startH, startM] = startTime.split(":").map(Number);
    const [endH, endM] = endTime.split(":").map(Number);
    const totalMinutes = endH * 60 + endM - (startH * 60 + startM);
    if (totalMinutes <= 0) return "2h";
    const hours = totalMinutes / 60;
    return `${hours % 1 === 0 ? hours : hours.toFixed(1)}h`;
  };

  const formatTime12h = (time24) => {
    if (!time24) return "";
    const [h, m] = time24.split(":").map(Number);
    const suffix = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 || 12;
    return `${String(hour12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${suffix}`;
  };

  // Real capacity calculations
  const enrolledCount = batch.enrolledCount !== undefined ? batch.enrolledCount : 0;
  const capacityPercent = Math.min(100, Math.round((enrolledCount / batch.capacity) * 100));
  const seatsRemaining = Math.max(0, batch.capacity - enrolledCount);
  const isFull = seatsRemaining === 0;

  const getStatusBadge = () => {
    if (batch.status === "active") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#EDF7F2] text-[#1E4934] border border-[#A3D4BC] uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-[#2F6E4F]"></span>
          ACTIVE
        </span>
      );
    }
    if (batch.status === "upcoming") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#FEF8EC] text-[#A67119] border border-[#F3D28E] uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-[#D99A2B]"></span>
          UPCOMING
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#F7F6F2] text-[#5A6275] border border-[#E5E3DC] uppercase">
        ARCHIVED
      </span>
    );
  };

  const getCapacityBadge = () => {
    if (isFull) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#FDF1F0] text-[#B23A32] border border-[#F3AAA5]">
          <Lock size={11} />
          CAPACITY LOCKED — ZERO SEATS
        </span>
      );
    }
    if (seatsRemaining <= 5) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#FEF8EC] text-[#A67119] border border-[#F3D28E]">
          {seatsRemaining} SEATS AVAILABLE
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#EDF7F2] text-[#1E4934] border border-[#A3D4BC]">
        {seatsRemaining} SEATS AVAILABLE
      </span>
    );
  };

  const cohortCode = `#BATCH-${batch.name.includes("JEE") ? "JEE-26A" : batch.name.includes("NEET") ? "NEET-25D" : batch.name.includes("CBSE") ? "CBSE-11F" : batch._id.slice(-6).toUpperCase()}`;

  return (
    <div className="bg-white border border-[#E5E3DC] rounded-lg p-5 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between">
      <div>
        {/* Top Header Strip: Status, Cohort Code, Hall Venue & Capacity Badge */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E5E3DC]/70">
          <div className="flex flex-wrap items-center gap-2">
            {getStatusBadge()}
            <span className="font-mono text-xs font-bold text-[#1B2A4A]">
              {cohortCode}
            </span>
            <span className="text-[11px] font-mono text-[#5A6275] flex items-center gap-1">
              <MapPin size={11} className="text-[#64748B]" />
              {batch.schedule?.venue || "Lecture Hall"}
            </span>
          </div>

          <div>{getCapacityBadge()}</div>
        </div>

        {/* Course Title & Fee Block */}
        <div className="mt-3 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex-1">
            <h3 className="font-serif font-bold text-lg sm:text-xl text-[#1B2A4A] leading-tight">
              {batch.name}
            </h3>
            <p className="text-xs text-[#5A6275] font-sans mt-1 leading-relaxed">
              {batch.description || `${batch.subject} cohort with structured examination preparation.`}
            </p>
          </div>

          {/* Fee Tag Box */}
          <div className="bg-[#FCFBF8] border border-[#E5E3DC] rounded p-2.5 sm:text-right shrink-0 min-w-[130px]">
            <div className="text-[9px] font-mono uppercase tracking-wider text-[#5A6275] font-semibold">
              FEE PER CANDIDATE
            </div>
            <div className="text-lg font-mono font-bold text-[#1B2A4A] mt-0.5">
              ₹{batch.fee?.toLocaleString("en-IN")}
            </div>
            <div className="text-[9px] font-mono text-[#2F6E4F] font-semibold mt-0.5">
              INR Standard Tuition
            </div>
          </div>
        </div>

        {/* 3-Column Info Matrix: Faculty, Schedule, Roster Lock */}
        <div className="mt-4 pt-3 border-t border-[#E5E3DC]/70 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          {/* Faculty Lead */}
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#5A6275] block font-semibold">
              FACULTY LEAD
            </span>
            <div className="font-semibold text-[#1B2A4A] mt-1 truncate">
              {batch.teacher?.name || "Unassigned Faculty"}
            </div>
            <div className="text-[10px] text-[#5A6275] font-sans truncate">
              {batch.subject} Specialist
            </div>
          </div>

          {/* Schedule & Timing */}
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#5A6275] block font-semibold">
              SCHEDULE & TIMING
            </span>
            <div className="font-semibold text-[#1B2A4A] mt-1 font-mono text-[11px]">
              {batch.schedule?.days?.join(", ") || "Mon, Wed, Fri"}
            </div>
            <div className="text-[10px] text-[#5A6275] font-mono">
              {formatTime12h(batch.schedule?.startTime)} – {formatTime12h(batch.schedule?.endTime)} (
              {calculateDuration(batch.schedule?.startTime, batch.schedule?.endTime)})
            </div>
          </div>

          {/* Roster & Server Lock */}
          <div>
            <div className="flex items-center justify-between text-[10px] font-mono uppercase font-semibold text-[#5A6275]">
              <span>ROSTER & SERVER LOCK</span>
              <span className="text-[#1B2A4A] font-bold">{capacityPercent}%</span>
            </div>
            <div className="font-mono text-xs font-semibold text-[#1B2A4A] mt-1">
              {enrolledCount} / {batch.capacity} Enrolled
            </div>
            {/* Progress Bar */}
            <div className="w-full bg-[#EFECE6] h-1.5 rounded-full overflow-hidden mt-1.5">
              <div
                className={`h-full rounded-full transition-all ${
                  isFull ? "bg-[#B23A32]" : capacityPercent > 80 ? "bg-[#D99A2B]" : "bg-[#2F6E4F]"
                }`}
                style={{ width: `${capacityPercent}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Action Footer */}
      <div className="mt-4 pt-3 border-t border-[#E5E3DC] flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(`/enrollments?batchId=${batch._id}`)}
            className="px-2.5 py-1 bg-[#1B2A4A] hover:bg-[#253963] text-white rounded text-[11px] font-semibold transition-colors cursor-pointer"
          >
            Manage Roster ({enrolledCount})
          </button>
          <button
            type="button"
            onClick={() => navigate(`/attendance?batchId=${batch._id}`)}
            className="px-2.5 py-1 bg-white hover:bg-[#F7F6F2] text-[#1B2A4A] border border-[#E5E3DC] rounded text-[11px] font-semibold transition-colors cursor-pointer"
          >
            Attendance Register
          </button>
        </div>

        {/* Admin Management Controls (Edit, Status, Archive) */}
        {isAdmin && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onEdit(batch)}
              className="p-1.5 text-[#5A6275] hover:text-[#1B2A4A] hover:bg-[#F2F6FC] rounded border border-[#E5E3DC] transition-colors cursor-pointer"
              title="Edit Cohort Configuration"
            >
              <Edit2 size={13} />
            </button>

            {batch.status !== "archived" ? (
              <button
                type="button"
                onClick={() => onArchive(batch._id)}
                className="p-1.5 text-[#5A6275] hover:text-[#B23A32] hover:bg-[#FDF1F0] rounded border border-[#E5E3DC] transition-colors cursor-pointer"
                title="Soft Archive Cohort"
              >
                <Archive size={13} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onStatusChange(batch._id, "active")}
                className="px-2 py-1 text-[#2F6E4F] hover:bg-[#EDF7F2] rounded text-[10px] font-mono font-bold border border-[#A3D4BC] transition-colors cursor-pointer"
                title="Restore to Active"
              >
                RESTORE
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BatchCard;
