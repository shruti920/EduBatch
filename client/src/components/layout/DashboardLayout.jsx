import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
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
import { Logo } from "../brand/Logo";
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

/**
 * Navigation list. The active item is marked the way a student marks a page:
 * with a highlighter stroke, which slides to the new item on navigation.
 * `scope` keeps the desktop and mobile highlighters from animating between each other.
 */
const NavList = ({ role, unread, scope, onNavigate }) => {
  const reduce = useReducedMotion();
  return (
    <nav aria-label="Main" className="space-y-0.5 px-3">
      {navFor(role).map(({ label, to, icon: Icon, badge }) => (
        <NavLink key={label} to={to} end onClick={onNavigate} className="group relative block rounded-md">
          {({ isActive }) => (
            <span
              className={`relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                isActive ? "font-semibold text-ink-900" : "text-ink-muted group-hover:bg-ink-100/60 group-hover:text-ink"
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId={`nav-highlight-${scope}`}
                  className="absolute inset-y-1 -right-1 left-0 -skew-x-6 rounded-[5px] bg-marigold/75"
                  transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 480, damping: 38 }}
                  aria-hidden="true"
                />
              )}
              <Icon size={17} aria-hidden="true" className="relative" />
              <span className="relative flex-1">{label}</span>
              {badge === "notices" && unread > 0 && (
                <span className="relative rounded-full bg-attention px-1.5 py-0.5 text-[11px] leading-none font-semibold text-white tabular-nums">
                  {unread > 99 ? "99+" : unread}
                  <span className="sr-only"> unread</span>
                </span>
              )}
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  );
};

const DashboardLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const reduce = useReducedMotion();
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

  // Close the drawer with Escape
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (e) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const account = (
    <div className="mx-3 mb-3 rounded-[var(--radius-card)] border border-paper-border/80 bg-white/70 p-3">
      <div className="flex items-center gap-3">
        <Avatar name={user?.name} src={user?.avatar} />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink-text">{user?.name}</p>
          <p className="text-xs text-ink-muted">{ROLE_LABEL[user?.role]}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={handleLogout}
        className="mt-2 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-ink-muted hover:bg-attention-bg hover:text-attention"
      >
        <LogOut size={16} aria-hidden="true" />
        Log out
      </button>
    </div>
  );

  // Frosted notebook margin: translucent over the ruled page, red margin rule on its edge
  const sidebarSurface = "margin-rule-right bg-white/60 backdrop-blur-xl backdrop-saturate-150";

  return (
    <div className="paper-ruled-faint min-h-screen lg:flex">
      {/* Desktop sidebar */}
      <aside className={`hidden w-64 shrink-0 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col ${sidebarSurface}`}>
        <div className="px-6 pt-6 pb-7">
          <Logo size={30} />
        </div>
        <div className="flex-1 overflow-y-auto pr-2">
          <NavList role={user?.role} unread={unread} scope="desktop" />
        </div>
        <div className="pr-2">{account}</div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-paper-border/80 bg-white/70 px-4 py-3 backdrop-blur-xl lg:hidden">
        <Logo size={26} textClassName="text-lg" />
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="relative rounded-md p-1.5 text-ink hover:bg-paper-muted"
          aria-label={unread > 0 ? `Open menu, ${unread} unread notices` : "Open menu"}
          aria-expanded={menuOpen}
        >
          <Menu size={22} />
          {unread > 0 && <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-attention" aria-hidden="true" />}
        </button>
      </header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {menuOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <motion.div
              className="absolute inset-0 bg-ink-900/35 backdrop-blur-[2px]"
              onClick={() => setMenuOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              aria-hidden="true"
            />
            <motion.aside
              className={`absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-white/85 backdrop-blur-xl margin-rule-right`}
              initial={reduce ? { opacity: 0 } : { x: "-100%" }}
              animate={reduce ? { opacity: 1 } : { x: 0 }}
              exit={reduce ? { opacity: 0 } : { x: "-100%" }}
              transition={{ type: "spring", stiffness: 420, damping: 40 }}
              aria-label="Menu"
            >
              <div className="flex items-center justify-between px-5 pt-5 pb-6">
                <Logo size={26} textClassName="text-lg" />
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  className="mr-2 rounded-md p-1 text-ink-muted hover:bg-paper-muted hover:text-ink"
                  aria-label="Close menu"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto pr-2">
                <NavList role={user?.role} unread={unread} scope="mobile" onNavigate={() => setMenuOpen(false)} />
              </div>
              <div className="pr-2">{account}</div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-9">
        <div className="mx-auto max-w-6xl space-y-6">{children}</div>
      </main>
    </div>
  );
};

export default DashboardLayout;
