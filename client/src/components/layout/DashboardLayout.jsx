import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Layers,
  Users,
  UserCog,
  ClipboardCheck,
  IndianRupee,
  Megaphone,
  CircleUser,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useAuth, homePathFor } from "../../context/AuthContext";
import Avatar from "../Avatar";
import { NOTICES_SEEN_EVENT, getUnreadNoticeCount } from "../../api/noticeApi";

const ROLE_LABEL = { admin: "Admin", teacher: "Teacher", student: "Student" };

const navFor = (role) =>
  [
    { label: "Dashboard", to: homePathFor(role), icon: LayoutDashboard, roles: ["admin", "teacher", "student"] },
    { label: "Batches", to: "/admin/batches", icon: Layers, roles: ["admin"] },
    { label: "Enrollments", to: "/enrollments", icon: Users, roles: ["admin"] },
    { label: "Rosters", to: "/enrollments", icon: Users, roles: ["teacher"] },
    { label: "Attendance", to: "/attendance", icon: ClipboardCheck, roles: ["admin", "teacher", "student"] },
    { label: "Payments", to: "/payments", icon: IndianRupee, roles: ["admin", "student"] },
    { label: "Notices", to: "/notices", icon: Megaphone, roles: ["admin", "teacher", "student"], badge: "notices" },
    { label: "Users", to: "/admin/users", icon: UserCog, roles: ["admin"] },
    { label: "Profile", to: "/profile", icon: CircleUser, roles: ["admin", "teacher", "student"] },
  ].filter((item) => item.roles.includes(role));

const Wordmark = ({ light = false }) => (
  <span className={`font-serif text-xl font-semibold ${light ? "text-white" : "text-ink"}`}>EduBatch</span>
);

const DashboardLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const [unread, setUnread] = useState(0);

  // Unread notices badge: refreshed on every page change and when the feed marks them read
  useEffect(() => {
    let active = true;
    const refresh = () =>
      getUnreadNoticeCount()
        .then((count) => active && setUnread(count))
        .catch(() => {});
    refresh();
    window.addEventListener(NOTICES_SEEN_EVENT, refresh);
    return () => {
      active = false;
      window.removeEventListener(NOTICES_SEEN_EVENT, refresh);
    };
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const nav = (
    <nav aria-label="Main" className="space-y-1 px-3">
      {navFor(user?.role).map(({ label, to, icon: Icon, badge }) => (
        <NavLink
          key={label}
          to={to}
          end
          onClick={() => setMenuOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded px-3 py-2 text-sm transition-colors ${
              isActive
                ? "bg-white/10 font-medium text-white shadow-[inset_3px_0_0_var(--color-marigold)]"
                : "text-ink-100/80 hover:bg-white/5 hover:text-white"
            }`
          }
        >
          <Icon size={17} aria-hidden="true" />
          <span className="flex-1">{label}</span>
          {badge === "notices" && unread > 0 && (
            <span className="rounded-full bg-marigold px-1.5 py-0.5 text-xs font-semibold leading-none text-ink tabular-nums">
              {unread > 99 ? "99+" : unread}
              <span className="sr-only"> unread</span>
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  );

  const account = (
    <div className="border-t border-white/10 p-4">
      <div className="flex items-center gap-3">
        <Avatar name={user?.name} src={user?.avatar} />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white">{user?.name}</p>
          <p className="text-xs text-ink-100/70">{ROLE_LABEL[user?.role]}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={handleLogout}
        className="mt-3 flex w-full items-center gap-2 rounded px-3 py-2 text-sm text-ink-100/80 hover:bg-white/5 hover:text-white"
      >
        <LogOut size={16} aria-hidden="true" />
        Log out
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-paper lg:flex">
      {/* Desktop sidebar: fixed height, stays in place while content scrolls */}
      <aside className="hidden w-60 shrink-0 bg-ink lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
        <div className="px-6 py-6">
          <Wordmark light />
        </div>
        <div className="flex-1 overflow-y-auto">{nav}</div>
        {account}
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-paper-border bg-white px-4 py-3 lg:hidden">
        <Wordmark />
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="relative rounded p-1.5 text-ink hover:bg-paper-muted"
          aria-label={unread > 0 ? `Open menu, ${unread} unread notices` : "Open menu"}
          aria-expanded={menuOpen}
        >
          <Menu size={22} />
          {unread > 0 && (
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-marigold" aria-hidden="true" />
          )}
        </button>
      </header>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink-900/50" onClick={() => setMenuOpen(false)} aria-hidden="true" />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col bg-ink">
            <div className="flex items-center justify-between px-6 py-5">
              <Wordmark light />
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="rounded p-1 text-ink-100 hover:text-white"
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">{nav}</div>
            {account}
          </aside>
        </div>
      )}

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        <div className="mx-auto max-w-6xl space-y-6">{children}</div>
      </main>
    </div>
  );
};

export default DashboardLayout;
