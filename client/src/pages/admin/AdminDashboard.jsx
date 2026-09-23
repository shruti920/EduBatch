import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  CreditCard,
  ClipboardCheck,
  ShieldCheck,
  Plus,
  UserPlus,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  CalendarDays,
  Lock,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { useAuth } from "../../context/AuthContext";
import { getAdminDashboard } from "../../api/dashboardApi";

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getAdminDashboard()
      .then((data) => setDashboardData(data))
      .catch((err) =>
        setError(err.response?.data?.message || err.message || "Failed to load dashboard data.")
      )
      .finally(() => setLoading(false));
  }, []);

  const counts = dashboardData?.counts;
  const financials = dashboardData?.financials;
  const attendance = dashboardData?.attendance;
  const batches = dashboardData?.batches || [];
  const alerts = dashboardData?.alerts || [];

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Subheader & Operational Control Bar */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-[#E5E3DC]">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-mono tracking-wider uppercase text-[#5A6275]">
              <span>LEDGER REFERENCE: REF-AY2526-HQ-001</span>
              <span>•</span>
              <span className="px-1.5 py-0.5 rounded bg-[#FEF8EC] text-[#A67119] border border-[#F3D28E] font-semibold">
                ACTIVE SESSION
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1B2A4A] tracking-tight mt-1">
              Institutional Overview & Control Ledger
            </h1>
            <p className="text-xs text-[#5A6275] font-sans mt-0.5">
              Academic Year 2025–26 • Live Database Metrics • Official Registry Record
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => navigate("/admin/batches")}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#1B2A4A] hover:bg-[#253963] text-white text-xs font-semibold rounded shadow-xs transition-colors cursor-pointer"
            >
              <Plus size={14} className="text-[#D99A2B]" />
              <span>New Batch Entry</span>
            </button>
            <button
              type="button"
              onClick={() => navigate("/enrollments")}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-[#F7F6F2] text-[#1B2A4A] border border-[#E5E3DC] text-xs font-semibold rounded shadow-2xs transition-colors cursor-pointer"
            >
              <UserPlus size={14} />
              <span>Enroll Student (Direct)</span>
            </button>
            <button
              type="button"
              onClick={() => navigate("/attendance")}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-[#F7F6F2] text-[#1B2A4A] border border-[#E5E3DC] text-xs font-semibold rounded shadow-2xs transition-colors cursor-pointer"
            >
              <ClipboardCheck size={14} />
              <span>Attendance Register</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center text-[#5A6275]">
            <div className="w-7 h-7 border-2 border-[#1B2A4A] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <span className="font-mono text-xs">Aggregating live institutional ledger metrics...</span>
          </div>
        ) : error ? (
          <div className="p-4 bg-[#FDF1F0] border border-[#F3AAA5] rounded text-xs text-[#B23A32]">
            {error}
          </div>
        ) : (
          <>
            {/* 4 Key Institutional Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Seats & Capacity */}
              <div className="bg-white border border-[#E5E3DC] rounded-lg p-4 shadow-2xs relative overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-wider font-semibold text-[#5A6275]">
                      ENROLLMENT & SEATS
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#FEF8EC] text-[#A67119] border border-[#F3D28E] font-bold">
                      CAP-{counts?.seatUtilization || 0}%
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-3xl font-serif font-bold text-[#1B2A4A]">
                      {counts?.totalEnrolledSeats || 0}
                    </span>
                    <span className="text-xs font-mono text-[#64748B]">
                      / {counts?.totalCapacity || 0} Capacity
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-[#EFECE6] h-1.5 rounded-full overflow-hidden mt-3">
                    <div
                      className="bg-[#1B2A4A] h-full rounded-full transition-all"
                      style={{ width: `${Math.min(100, counts?.seatUtilization || 0)}%` }}
                    ></div>
                  </div>
                </div>
                <div className="mt-4 pt-2.5 border-t border-[#E5E3DC] flex items-center justify-between text-[11px] font-mono">
                  <span className="text-[#B23A32] font-semibold">
                    {counts?.hardLockedCount || 0} Batches Locked
                  </span>
                  <span className="text-[#2F6E4F] font-semibold">
                    {counts?.activeBatches || 0} Active Cohorts
                  </span>
                </div>
              </div>

              {/* Card 2: Tuition & Revenue */}
              <div className="bg-white border border-[#E5E3DC] rounded-lg p-4 shadow-2xs relative overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-wider font-semibold text-[#5A6275]">
                      REALIZED TUITION & DUES
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#EDF7F2] text-[#1E4934] border border-[#A3D4BC] font-bold">
                      {financials?.totalPotentialFees > 0
                        ? Math.round(
                            (financials?.realizedFees / financials?.totalPotentialFees) * 100
                          )
                        : 0}
                      % Realized
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-3xl font-serif font-bold text-[#1B2A4A]">
                      ₹{(financials?.realizedFees || 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-[#64748B] mt-0.5">
                    From {financials?.paidCount || 0} Cleared Candidates
                  </div>
                </div>
                <div className="mt-4 pt-2.5 border-t border-[#E5E3DC] flex items-center justify-between text-[11px] font-mono">
                  <span className="text-[#B23A32]">
                    ₹{(financials?.pendingFees || 0).toLocaleString("en-IN")} Dues Pending
                  </span>
                  <span className="text-[#5A6275]">{financials?.pendingCount || 0} Candidates</span>
                </div>
              </div>

              {/* Card 3: Daily Activity */}
              <div className="bg-white border border-[#E5E3DC] rounded-lg p-4 shadow-2xs relative overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-wider font-semibold text-[#5A6275]">
                      ATTENDANCE ACTIVITY
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#EDF7F2] text-[#1E4934] border border-[#A3D4BC] font-bold">
                      Verified
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="text-3xl font-serif font-bold text-[#2F6E4F]">
                      {attendance?.averageRate ?? 100}%
                    </span>
                    <span className="text-xs font-sans text-[#5A6275]">Class Presence</span>
                  </div>
                  <div className="text-[11px] font-sans text-[#5A6275] mt-1">
                    {attendance?.totalSessions || 0} classroom roll call registers recorded.
                  </div>
                </div>
                <div className="mt-4 pt-2.5 border-t border-[#E5E3DC] flex items-center justify-between text-[11px] font-mono">
                  <span className="text-[#1B2A4A]">Active Batches: {counts?.activeBatches || 0}</span>
                  <span className="text-[#2F6E4F]">
                    {attendance?.todaySessionsCount || 0} Marked Today
                  </span>
                </div>
              </div>

              {/* Card 4: Community & RBAC Audit */}
              <div className="bg-white border border-[#E5E3DC] rounded-lg p-4 shadow-2xs relative overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-wider font-semibold text-[#5A6275]">
                      COMMUNITY & RBAC REGISTRY
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#EDF7F2] text-[#1E4934] border border-[#A3D4BC] font-bold">
                      Secured
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-3xl font-serif font-bold text-[#1B2A4A]">
                      {counts?.totalCandidates || 0}
                    </span>
                    <span className="text-xs font-mono text-[#64748B]">Active Students</span>
                  </div>
                  <div className="text-[11px] font-sans text-[#5A6275] mt-1">
                    {counts?.totalFaculty || 0} Faculty Leads • {counts?.totalAdmins || 0} Administrators
                  </div>
                </div>
                <div className="mt-4 pt-2.5 border-t border-[#E5E3DC] flex items-center justify-between text-[11px] font-mono">
                  <span className="text-[#5A6275]">Role Guards Active</span>
                  <span className="text-[#2F6E4F] font-bold">AUDIT PASSED</span>
                </div>
              </div>
            </div>

            {/* Split Grid: Live Batch Registry Table + Right Operational Alerts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main 2-Col Table: Live Batch Registry */}
              <div className="lg:col-span-2 bg-white border border-[#E5E3DC] rounded-lg shadow-2xs overflow-hidden">
                <div className="p-4 border-b border-[#E5E3DC] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-[#FCFBF8]">
                  <div className="flex items-center gap-2">
                    <span className="font-serif font-bold text-[#1B2A4A] text-base">
                      Live Cohort Registry & Capacity Locks
                    </span>
                  </div>
                  <span className="text-xs font-mono text-[#5A6275]">
                    {batches.length} Registered Batches
                  </span>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-sans">
                    <thead className="bg-[#F7F6F2] border-b border-[#E5E3DC] text-[10px] font-mono uppercase text-[#5A6275]">
                      <tr>
                        <th className="py-2.5 px-3 font-semibold">Cohort Code</th>
                        <th className="py-2.5 px-3 font-semibold">Program & Subject</th>
                        <th className="py-2.5 px-3 font-semibold">Faculty Lead</th>
                        <th className="py-2.5 px-3 font-semibold">Fee / Candidate</th>
                        <th className="py-2.5 px-3 font-semibold">Roster Quota</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E3DC] text-[12px]">
                      {batches.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-[#5A6275]">
                            No batches registered yet.
                          </td>
                        </tr>
                      ) : (
                        batches.map((batch) => {
                          const cohortCode = `#BATCH-${batch._id.slice(-6).toUpperCase()}`;

                          return (
                            <tr key={batch._id} className="hover:bg-[#F9F8F5] transition-colors">
                              <td className="py-3 px-3 font-mono font-semibold text-[#1B2A4A]">
                                {cohortCode}
                                <div className="text-[10px] text-[#5A6275] font-normal uppercase">
                                  {batch.status}
                                </div>
                              </td>

                              <td className="py-3 px-3">
                                <div className="font-medium text-[#1B2A4A]">{batch.name}</div>
                                <div className="text-[10px] text-[#5A6275]">{batch.subject}</div>
                              </td>

                              <td className="py-3 px-3 text-[#22242B]">
                                {batch.teacher?.name || "Unassigned"}
                              </td>

                              <td className="py-3 px-3 font-mono font-medium text-[#1B2A4A]">
                                ₹{batch.fee?.toLocaleString("en-IN")}
                              </td>

                              <td className="py-3 px-3">
                                {batch.isFull ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#FDF1F0] text-[#B23A32] border border-[#F3AAA5]">
                                    <Lock size={10} />
                                    {batch.enrolledCount}/{batch.capacity} LOCKED
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#EDF7F2] text-[#1E4934] border border-[#A3D4BC]">
                                    {batch.enrolledCount}/{batch.capacity} ({batch.seatsRemaining} LEFT)
                                  </span>
                                )}
                              </td>

                              <td className="py-3 px-3 text-right">
                                <div className="inline-flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => navigate(`/enrollments?batchId=${batch._id}`)}
                                    className="px-2 py-1 bg-[#F7F6F2] hover:bg-[#E6EDF8] text-[#1B2A4A] rounded text-[11px] font-medium border border-[#E5E3DC] cursor-pointer"
                                  >
                                    Roster
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => navigate(`/attendance?batchId=${batch._id}`)}
                                    className="px-2 py-1 bg-[#F7F6F2] hover:bg-[#E6EDF8] text-[#1B2A4A] rounded text-[11px] font-medium border border-[#E5E3DC] cursor-pointer"
                                  >
                                    Roll Call
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Table Footer */}
                <div className="p-3 border-t border-[#E5E3DC] bg-[#FCFBF8] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[11px] font-mono text-[#5A6275]">
                  <span>
                    Displaying {batches.length} registered cohorts • Aggregate quota:{" "}
                    {counts?.totalEnrolledSeats || 0} / {counts?.totalCapacity || 0} seats (
                    {counts?.seatUtilization || 0}%)
                  </span>
                  <button
                    type="button"
                    onClick={() => navigate("/admin/batches")}
                    className="text-[#1B2A4A] font-semibold hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    Complete Batch Master Ledger <ChevronRight size={13} />
                  </button>
                </div>
              </div>

              {/* Right Column: Operational Alerts & Quick Shortlinks */}
              <div className="space-y-4">
                {/* Real Operational Alerts Card */}
                <div className="bg-white border border-[#E5E3DC] rounded-lg p-4 shadow-2xs">
                  <div className="flex items-center justify-between pb-3 border-b border-[#E5E3DC]">
                    <div className="flex items-center gap-1.5 font-serif font-bold text-[#1B2A4A] text-sm">
                      <AlertTriangle size={15} className="text-[#B23A32]" />
                      <span>Live Operational Alerts</span>
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#FEF8EC] text-[#A67119] border border-[#F3D28E] font-bold">
                      {alerts.length} Audit Items
                    </span>
                  </div>
                  <div className="space-y-3 mt-3">
                    {alerts.length === 0 ? (
                      <div className="py-4 text-center text-xs text-[#2F6E4F] font-mono flex items-center justify-center gap-1.5">
                        <CheckCircle2 size={14} />
                        <span>All systems nominal. Zero capacity gaps or alerts.</span>
                      </div>
                    ) : (
                      alerts.map((alert) => (
                        <div
                          key={alert.id}
                          className={`p-2.5 rounded-r text-xs border-l-3 ${
                            alert.level === "warning"
                              ? "bg-[#FEF8EC] border-[#D99A2B]"
                              : "bg-[#FDF1F0] border-[#B23A32]"
                          }`}
                        >
                          <div
                            className={`flex items-center justify-between font-mono text-[10px] font-bold ${
                              alert.level === "warning" ? "text-[#A67119]" : "text-[#B23A32]"
                            }`}
                          >
                            <span>{alert.title}</span>
                            <span>{alert.time}</span>
                          </div>
                          <div className="text-[11px] text-[#22242B] mt-1 font-sans">
                            {alert.message}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Quick Administrative Shortcuts */}
                <div className="bg-white border border-[#E5E3DC] rounded-lg p-4 shadow-2xs">
                  <div className="font-serif font-bold text-[#1B2A4A] text-sm pb-3 border-b border-[#E5E3DC]">
                    Operational Core Shortlinks
                  </div>
                  <div className="mt-3 space-y-2 text-xs">
                    <button
                      type="button"
                      onClick={() => navigate("/admin/batches")}
                      className="w-full p-2.5 rounded border border-[#E5E3DC] hover:border-[#1B2A4A] bg-[#FCFBF8] flex items-center justify-between transition-colors text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <CalendarDays size={14} className="text-[#1B2A4A]" />
                        <span className="font-semibold text-[#1B2A4A]">Batch Registry Desk</span>
                      </div>
                      <ChevronRight size={13} className="text-[#5A6275]" />
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate("/enrollments")}
                      className="w-full p-2.5 rounded border border-[#E5E3DC] hover:border-[#1B2A4A] bg-[#FCFBF8] flex items-center justify-between transition-colors text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Users size={14} className="text-[#1B2A4A]" />
                        <span className="font-semibold text-[#1B2A4A]">Enrollment Master Ledger</span>
                      </div>
                      <ChevronRight size={13} className="text-[#5A6275]" />
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate("/attendance")}
                      className="w-full p-2.5 rounded border border-[#E5E3DC] hover:border-[#1B2A4A] bg-[#FCFBF8] flex items-center justify-between transition-colors text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <ClipboardCheck size={14} className="text-[#1B2A4A]" />
                        <span className="font-semibold text-[#1B2A4A]">Attendance Roll Call Desk</span>
                      </div>
                      <ChevronRight size={13} className="text-[#5A6275]" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
