import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  CreditCard,
  ClipboardCheck,
  ShieldCheck,
  Plus,
  UserPlus,
  Link as LinkIcon,
  Printer,
  AlertTriangle,
  Bell,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { useAuth } from "../../context/AuthContext";

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

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
              Academic Year 2025–26 • Term 1 Operational Snapshot • Official Registry Record
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
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-[#F7F6F2] text-[#1B2A4A] border border-[#E5E3DC] text-xs font-semibold rounded shadow-2xs transition-colors cursor-pointer"
            >
              <LinkIcon size={14} />
              <span className="hidden sm:inline">Generate Razorpay Link</span>
            </button>
            <button
              type="button"
              className="p-2 bg-white hover:bg-[#F7F6F2] text-[#5A6275] border border-[#E5E3DC] rounded shadow-2xs transition-colors cursor-pointer"
              title="Print Ledger Report"
            >
              <Printer size={15} />
            </button>
          </div>
        </div>

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
                  CAP-92.6%
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-serif font-bold text-[#1B2A4A]">482</span>
                <span className="text-xs font-mono text-[#64748B]">/ 520 Registered</span>
              </div>
              {/* Progress bar */}
              <div className="w-full bg-[#EFECE6] h-1.5 rounded-full overflow-hidden mt-3">
                <div className="bg-[#1B2A4A] h-full rounded-full" style={{ width: "92.6%" }}></div>
              </div>
            </div>
            <div className="mt-4 pt-2.5 border-t border-[#E5E3DC] flex items-center justify-between text-[11px] font-mono">
              <span className="text-[#B23A32] font-semibold">JEE-M: 100% (Locked)</span>
              <span className="text-[#2F6E4F] font-semibold">NEET-E: 85% (Avail)</span>
            </div>
          </div>

          {/* Card 2: Tuition & Revenue */}
          <div className="bg-white border border-[#E5E3DC] rounded-lg p-4 shadow-2xs relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider font-semibold text-[#5A6275]">
                  TERM 1 REALIZED TUITION
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#EDF7F2] text-[#1E4934] border border-[#A3D4BC] font-bold">
                  89.7% Clrd
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-serif font-bold text-[#1B2A4A]">₹48,60,000</span>
              </div>
              <div className="text-[11px] font-mono text-[#64748B] mt-0.5">
                Target ₹54,20,000 (Razorpay Settled)
              </div>
            </div>
            <div className="mt-4 pt-2.5 border-t border-[#E5E3DC] flex items-center justify-between text-[11px] font-mono">
              <span className="text-[#B23A32]">₹5,60,000 Dues Pending</span>
              <span className="text-[#5A6275]">56 Candidates</span>
            </div>
          </div>

          {/* Card 3: Daily Activity */}
          <div className="bg-white border border-[#E5E3DC] rounded-lg p-4 shadow-2xs relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider font-semibold text-[#5A6275]">
                  DAILY INSTITUTIONAL ACTIVITY
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#F7F6F2] text-[#5A6275] border border-[#E5E3DC] font-bold">
                  Today
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-3xl font-serif font-bold text-[#2F6E4F]">94.2%</span>
                <span className="text-xs font-sans text-[#5A6275]">Class Attendance</span>
              </div>
              <div className="text-[11px] font-sans text-[#5A6275] mt-1">
                454 Students verified present via Biometric Gate.
              </div>
            </div>
            <div className="mt-4 pt-2.5 border-t border-[#E5E3DC] flex items-center justify-between text-[11px] font-mono">
              <span className="text-[#1B2A4A]">Active Batches: 8 Today</span>
              <span className="text-[#2F6E4F]">7/8 Register Locked</span>
            </div>
          </div>

          {/* Card 4: Gateway & Security Audit */}
          <div className="bg-white border border-[#E5E3DC] rounded-lg p-4 shadow-2xs relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider font-semibold text-[#5A6275]">
                  GATEWAY & RBAC AUDIT
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#EDF7F2] text-[#1E4934] border border-[#A3D4BC] font-bold">
                  Secured
                </span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <ShieldCheck size={24} className="text-[#1B2A4A]" />
                <span className="text-lg font-mono font-bold text-[#1B2A4A]">HMAC-SHA256</span>
              </div>
              <div className="text-[11px] font-sans text-[#5A6275] mt-1">
                Strict signature check enabled on Razorpay webhook port.
              </div>
            </div>
            <div className="mt-4 pt-2.5 border-t border-[#E5E3DC] flex items-center justify-between text-[11px] font-mono">
              <span className="text-[#5A6275]">JWT Validated (256-bit)</span>
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
                  Live Batch Registry & Seat Utilization
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-[#5A6275] font-mono text-[11px]">FILTER:</span>
                <select className="bg-white border border-[#E5E3DC] rounded px-2.5 py-1 text-xs text-[#22242B] font-sans focus:outline-none focus:border-[#1B2A4A]">
                  <option>All Divisions (JEE, NEET, Foundation)</option>
                  <option>JEE Advanced Stream</option>
                  <option>NEET Pre-Med Stream</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans">
                <thead className="bg-[#F7F6F2] border-b border-[#E5E3DC] text-[10px] font-mono uppercase text-[#5A6275]">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">Batch Code</th>
                    <th className="py-2.5 px-3 font-semibold">Program & Subject</th>
                    <th className="py-2.5 px-3 font-semibold">Faculty</th>
                    <th className="py-2.5 px-3 font-semibold">Schedule</th>
                    <th className="py-2.5 px-3 font-semibold">Fee / Head</th>
                    <th className="py-2.5 px-3 font-semibold">Seating</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E3DC] text-[12px]">
                  <tr className="hover:bg-[#F9F8F5] transition-colors">
                    <td className="py-3 px-3 font-mono font-semibold text-[#1B2A4A]">
                      #JEE-2026-M1
                      <div className="text-[10px] text-[#5A6275] font-normal">SEC-A (ADVANCED)</div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-medium text-[#1B2A4A]">Physics & Pure Math</div>
                      <div className="text-[10px] text-[#5A6275]">Classroom Hall-301</div>
                    </td>
                    <td className="py-3 px-3 text-[#22242B]">Prof. A. Shrivastava</td>
                    <td className="py-3 px-3 text-[11px] font-mono text-[#5A6275]">
                      Mon/Wed/Fri
                      <div>07:00 – 09:30 AM</div>
                    </td>
                    <td className="py-3 px-3 font-mono font-medium text-[#1B2A4A]">₹35,000</td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#FDF1F0] text-[#B23A32] border border-[#F3AAA5]">
                        40/40 LOCKED
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button className="px-2 py-1 bg-[#F7F6F2] hover:bg-[#E6EDF8] text-[#1B2A4A] rounded text-[11px] font-medium border border-[#E5E3DC]">
                        Roster
                      </button>
                    </td>
                  </tr>

                  <tr className="hover:bg-[#F9F8F5] transition-colors">
                    <td className="py-3 px-3 font-mono font-semibold text-[#1B2A4A]">
                      #NEET-ADV-E2
                      <div className="text-[10px] text-[#5A6275] font-normal">SEC-B (PRE-MED)</div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-medium text-[#1B2A4A]">Human Physiology & Org. Chem</div>
                      <div className="text-[10px] text-[#5A6275]">Bio-Lab 102</div>
                    </td>
                    <td className="py-3 px-3 text-[#22242B]">Dr. Sunita Roy</td>
                    <td className="py-3 px-3 text-[11px] font-mono text-[#5A6275]">
                      Tue/Thu/Sat
                      <div>04:30 – 07:00 PM</div>
                    </td>
                    <td className="py-3 px-3 font-mono font-medium text-[#1B2A4A]">₹32,500</td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#FEF8EC] text-[#A67119] border border-[#F3D28E]">
                        38/40 (2 SEATS)
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button className="px-2 py-1 bg-[#F7F6F2] hover:bg-[#E6EDF8] text-[#1B2A4A] rounded text-[11px] font-medium border border-[#E5E3DC]">
                        Roster
                      </button>
                    </td>
                  </tr>

                  <tr className="hover:bg-[#F9F8F5] transition-colors">
                    <td className="py-3 px-3 font-mono font-semibold text-[#1B2A4A]">
                      #FOUND-MATH-09
                      <div className="text-[10px] text-[#5A6275] font-normal">OLYMPIAD GRADE 9</div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-medium text-[#1B2A4A]">Number Theory & Geometry</div>
                      <div className="text-[10px] text-[#5A6275]">Lecture Hall-104</div>
                    </td>
                    <td className="py-3 px-3 text-[#22242B]">Prof. M. K. Chandel</td>
                    <td className="py-3 px-3 text-[11px] font-mono text-[#5A6275]">
                      Mon/Thu
                      <div>05:30 – 07:30 PM</div>
                    </td>
                    <td className="py-3 px-3 font-mono font-medium text-[#1B2A4A]">₹18,000</td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#EDF7F2] text-[#1E4934] border border-[#A3D4BC]">
                        25/30 (5 SEATS)
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button className="px-2 py-1 bg-[#F7F6F2] hover:bg-[#E6EDF8] text-[#1B2A4A] rounded text-[11px] font-medium border border-[#E5E3DC]">
                        Roster
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div className="p-3 border-t border-[#E5E3DC] bg-[#FCFBF8] flex items-center justify-between text-[11px] font-mono text-[#5A6275]">
              <span>Displaying 3 active cohorts • Aggregate quota: 103 / 110 seats occupied (93.6%)</span>
              <button
                type="button"
                onClick={() => navigate("/admin/batches")}
                className="text-[#1B2A4A] font-semibold hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                Complete Batch Master Ledger <ChevronRight size={13} />
              </button>
            </div>
          </div>

          {/* Right Column: Operational Alerts & Bulletins */}
          <div className="space-y-4">
            {/* Operational Alerts Card */}
            <div className="bg-white border border-[#E5E3DC] rounded-lg p-4 shadow-2xs">
              <div className="flex items-center justify-between pb-3 border-b border-[#E5E3DC]">
                <div className="flex items-center gap-1.5 font-serif font-bold text-[#1B2A4A] text-sm">
                  <AlertTriangle size={15} className="text-[#B23A32]" />
                  <span>Operational Alerts</span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#FDF1F0] text-[#B23A32] border border-[#F3AAA5] font-bold">
                  3 Action Req.
                </span>
              </div>
              <div className="space-y-3 mt-3">
                <div className="p-2.5 bg-[#FEF8EC] border-l-3 border-[#D99A2B] rounded-r text-xs">
                  <div className="flex items-center justify-between font-mono text-[10px] text-[#A67119] font-bold">
                    <span>CAPACITY REACHED • P0</span>
                    <span>10m ago</span>
                  </div>
                  <div className="text-[11px] text-[#22242B] mt-1 font-sans">
                    Batch #JEE-2026-M1 has 0 remaining seats. 4 waitlist requests pending administrative override.
                  </div>
                </div>

                <div className="p-2.5 bg-[#FDF1F0] border-l-3 border-[#B23A32] rounded-r text-xs">
                  <div className="flex items-center justify-between font-mono text-[10px] text-[#B23A32] font-bold">
                    <span>ATTENDANCE GAP</span>
                    <span>1h ago</span>
                  </div>
                  <div className="text-[11px] text-[#22242B] mt-1 font-sans">
                    Session register for NEET-ADV-E2 has not been submitted by Dr. Roy.
                  </div>
                </div>
              </div>
            </div>

            {/* Official Academic Bulletins */}
            <div className="bg-white border border-[#E5E3DC] rounded-lg p-4 shadow-2xs">
              <div className="flex items-center justify-between pb-3 border-b border-[#E5E3DC]">
                <div className="flex items-center gap-1.5 font-serif font-bold text-[#1B2A4A] text-sm">
                  <Bell size={15} className="text-[#1B2A4A]" />
                  <span>Official Academic Bulletins</span>
                </div>
                <button className="text-[10px] font-mono text-[#1B2A4A] font-semibold hover:underline">
                  + NEW BULLETIN
                </button>
              </div>
              <div className="mt-3 space-y-2.5">
                <div className="border border-[#E5E3DC] rounded p-2.5">
                  <div className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#1B2A4A] text-white inline-block uppercase font-bold">
                    PINNED NOTICE • REF #GAZ-2025-44
                  </div>
                  <div className="text-xs font-serif font-bold text-[#1B2A4A] mt-1.5">
                    Dussehra & Diwali Revision Class Schedules (23–26 Oct)
                  </div>
                  <div className="text-[11px] text-[#5A6275] mt-1">
                    Normal classroom sessions will remain suspended. High-yield doubt clinics scheduled.
                  </div>
                </div>
              </div>
            </div>

            {/* Node Infrastructure Status */}
            <div className="bg-[#101B30] text-slate-300 rounded-lg p-3 text-[11px] font-mono space-y-2">
              <div className="flex items-center justify-between text-white font-semibold text-xs border-b border-[#1B2A4A] pb-1.5">
                <span>NODE INFRASTRUCTURE</span>
                <span className="text-[#2F6E4F] font-bold">99.98% SLA</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Express Backend:</span>
                <span className="text-slate-200">142ms latency (Operational)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">MongoDB Replica:</span>
                <span className="text-slate-200">Primary (Sync 24ms)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Razorpay Webhook:</span>
                <span className="text-[#2F6E4F]">Listening (0 drops)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
