import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  CreditCard,
  ClipboardCheck,
  Bell,
  Settings,
  LogOut,
  Search,
  Menu,
  X,
  ShieldCheck,
  Building2,
  GraduationCap,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const DashboardLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const getDashboardHome = () => {
    if (user?.role === "admin") return "/admin";
    if (user?.role === "teacher") return "/teacher";
    return "/student";
  };

  const navItems = [
    {
      name: "Institutional Overview",
      path: getDashboardHome(),
      icon: LayoutDashboard,
      roles: ["admin", "teacher", "student"],
    },
    {
      name: "Batch Registry",
      path: "/admin/batches",
      icon: CalendarDays,
      roles: ["admin"],
    },
    {
      name: "Enrollment & Roster",
      path: "/enrollments",
      icon: Users,
      roles: ["admin", "teacher"],
    },
    {
      name: "Attendance Register",
      path: "/attendance",
      icon: ClipboardCheck,
      roles: ["admin", "teacher", "student"],
    },
  ];

  const filteredNavItems = navItems.filter(
    (item) => !item.roles || item.roles.includes(user?.role)
  );

  const getRoleDisplayName = () => {
    if (user?.role === "admin") return "PRINCIPAL ADMIN";
    if (user?.role === "teacher") return "FACULTY LEAD";
    return "CANDIDATE";
  };

  return (
    <div className="min-h-screen bg-[#F7F6F2] flex flex-col antialiased text-[#22242B]">
      {/* Top Administrative Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#E5E3DC] shadow-xs px-3 sm:px-6 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Mobile hamburger menu toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-1.5 rounded-md text-[#1B2A4A] hover:bg-[#F2F6FC] transition-colors"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          {/* Institutional Brand */}
          <Link to={getDashboardHome()} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-[#1B2A4A] text-white flex items-center justify-center font-bold text-base shadow-xs">
              <GraduationCap size={18} className="text-[#D99A2B]" />
            </div>
            <div>
              <div className="text-base font-serif font-bold text-[#1B2A4A] tracking-tight leading-none">
                EduBatch
              </div>
              <div className="text-[10px] font-mono tracking-widest text-[#5A6275] uppercase mt-0.5">
                Academic Console
              </div>
            </div>
          </Link>

          {/* Academic Session Badges (hidden on small mobile) */}
          <div className="hidden sm:flex items-center gap-2 ml-4">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#EDF7F2] border border-[#A3D4BC] text-[11px] font-mono font-medium text-[#1E4934]">
              <span className="w-2 h-2 rounded-full bg-[#2F6E4F] animate-pulse"></span>
              AY 2025–26
            </div>
            <div className="hidden md:inline-flex items-center px-2 py-1 rounded bg-[#F7F6F2] border border-[#E5E3DC] text-[11px] font-mono text-[#5A6275]">
              v1.0.0 (Port 5000)
            </div>
          </div>
        </div>

        {/* Global Search Bar (Responsive: collapses on narrow screens) */}
        <div className="hidden md:flex flex-1 max-w-md mx-6">
          <div className="relative w-full">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]"
            />
            <input
              type="text"
              placeholder="Search batch ID, roll no., candidate... [⌘K]"
              className="w-full pl-9 pr-4 py-1.5 bg-[#F7F6F2] border border-[#E5E3DC] rounded text-xs font-sans placeholder-[#64748B] focus:outline-none focus:border-[#1B2A4A] focus:bg-white transition-colors"
            />
          </div>
        </div>

        {/* Right Section: Role Pills, Notifications, Profile & Logout */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Role Indicator Pills */}
          <div className="hidden sm:flex items-center bg-[#F7F6F2] p-0.5 rounded border border-[#E5E3DC] text-[10px] font-mono">
            <span
              className={`px-2 py-0.5 rounded ${
                user?.role === "admin"
                  ? "bg-[#1B2A4A] text-white font-semibold"
                  : "text-[#64748B]"
              }`}
            >
              ADMIN
            </span>
            <span
              className={`px-2 py-0.5 rounded ${
                user?.role === "teacher"
                  ? "bg-[#1B2A4A] text-white font-semibold"
                  : "text-[#64748B]"
              }`}
            >
              FACULTY
            </span>
            <span
              className={`px-2 py-0.5 rounded ${
                user?.role === "student"
                  ? "bg-[#1B2A4A] text-white font-semibold"
                  : "text-[#64748B]"
              }`}
            >
              CANDIDATE
            </span>
          </div>

          {/* Notifications button */}
          <button
            type="button"
            className="relative p-1.5 rounded text-[#5A6275] hover:text-[#1B2A4A] hover:bg-[#F2F6FC] transition-colors"
            title="Institutional Bulletins & Alerts"
          >
            <Bell size={18} />
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#B23A32] text-white rounded-full text-[9px] font-bold flex items-center justify-center">
              4
            </span>
          </button>

          {/* User Profile Chip */}
          <div className="flex items-center gap-2 pl-2 border-l border-[#E5E3DC]">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-semibold text-[#1B2A4A] leading-tight">
                {user?.name || "User"}
              </div>
              <div className="text-[10px] font-mono text-[#D99A2B] font-bold">
                {getRoleDisplayName()}
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-[#1B2A4A] text-white flex items-center justify-center text-xs font-bold font-mono uppercase ring-2 ring-[#E5E3DC]">
              {user?.name ? user.name.slice(0, 2) : "ED"}
            </div>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="p-1.5 rounded text-[#B23A32] hover:bg-[#FDF1F0] transition-colors"
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Framework Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Mobile Backdrop Overlay */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 bg-[#1B2A4A]/50 z-40 lg:hidden backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar Navigation */}
        <aside
          className={`fixed lg:static top-0 bottom-0 left-0 z-50 w-64 bg-[#101B30] text-slate-300 flex flex-col justify-between border-r border-[#1B2A4A] transition-transform duration-200 ease-in-out ${
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }`}
        >
          <div>
            {/* Sidebar header (visible in mobile drawer) */}
            <div className="p-4 border-b border-[#1B2A4A]/60 flex items-center justify-between lg:hidden">
              <div className="flex items-center gap-2 text-white">
                <GraduationCap size={20} className="text-[#D99A2B]" />
                <span className="font-serif font-bold text-lg">EduBatch</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {/* Sub-label */}
            <div className="px-5 pt-5 pb-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono tracking-wider text-slate-400 font-semibold uppercase">
                  REGISTRY LEDGER
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#1B2A4A] text-[#D99A2B] border border-[#253963]">
                  ACAD 25-26
                </span>
              </div>
            </div>

            {/* Navigation List */}
            <nav className="px-3 py-2 space-y-1">
              {filteredNavItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  location.pathname === item.path ||
                  (item.path !== getDashboardHome() &&
                    location.pathname.startsWith(item.path));

                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded text-xs font-sans transition-colors ${
                      isActive
                        ? "bg-[#1B2A4A] text-white font-semibold border-l-3 border-[#D99A2B] shadow-xs"
                        : "text-slate-300 hover:text-white hover:bg-[#162440]"
                    }`}
                  >
                    <Icon
                      size={16}
                      className={isActive ? "text-[#D99A2B]" : "text-slate-400"}
                    />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Sidebar Institutional Footer */}
          <div className="p-4 border-t border-[#1B2A4A] text-[11px] font-mono text-slate-400 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-white font-medium flex items-center gap-1.5">
                <Building2 size={13} className="text-[#D99A2B]" />
                KOTA SCIENCE ACADEMY
              </span>
              <span className="text-[9px] bg-[#1B2A4A] px-1 py-0.5 rounded text-slate-300">
                #KSA-402
              </span>
            </div>
            <div className="flex items-center justify-between text-[10px] pt-1">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2F6E4F]"></span>
                Atlas DB
              </span>
              <span className="text-slate-400">24ms (Sync)</span>
            </div>
          </div>
        </aside>

        {/* Dynamic Workspace Container */}
        <main className="flex-1 overflow-y-auto bg-[#F7F6F2] p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
