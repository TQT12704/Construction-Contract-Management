import { NavLink } from "react-router-dom";
import { useAuth } from "../AuthContext";

/* ---- Helpers: lấy roles linh hoạt từ user ---- */
function getRoles(user) {
    const set = new Set();
    const add = (x) => {
        if (!x) return;
        if (Array.isArray(x)) return x.forEach(add);
        if (typeof x === "string") return set.add(x.toUpperCase());
        if (typeof x === "object")
            ["role", "name", "authority"].forEach((k) => x[k] && set.add(String(x[k]).toUpperCase()));
    };
    add(user?.role);
    add(user?.roles);
    add(user?.authorities);
    return set;
}
function hasAnyRole(user, allow = []) {
    if (!user) return false;
    const roles = getRoles(user);
    return allow.some((r) => roles.has(r.toUpperCase()) || roles.has("ROLE_" + r.toUpperCase()));
}

/** Item nav: hỗ trợ collapsed + icon đổi màu theo isActive */
function Item({ to, label, icon, collapsed }) {
    return (
        <NavLink
            to={to}
            className={({ isActive }) =>
                "flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-indigo-50 " +
                (isActive ? "bg-indigo-600 text-white hover:bg-indigo-600" : "text-slate-700")
            }
            title={collapsed ? label : undefined}
        >
            {({ isActive }) => (
                <>
          <span
              className={
                  "w-6 h-6 grid place-content-center rounded " +
                  (isActive ? "bg-indigo-600 text-white" : "bg-indigo-100 text-indigo-700")
              }
              aria-hidden
          >
            {icon}
          </span>
                    {!collapsed && <span className="text-sm truncate">{label}</span>}
                </>
            )}
        </NavLink>
    );
}

/** Sidebar có thể thu gọn (collapsed) và có onToggle để Layout điều khiển */
export default function Sidebar({ collapsed = false, onToggle = () => {} }) {
    const { user } = useAuth();

    // Cấu hình menu + vai trò được phép
    const MENU = [
        { to: "/dashboard", label: "Tổng quan", icon: "🏠", roles: ["ADMIN", "SALES", "ACCOUNTANT"] },
        { to: "/customers", label: "Khách hàng", icon: "👥", roles: ["ADMIN", "SALES"] },
        { to: "/contracts", label: "Hợp đồng", icon: "📑", roles: ["ADMIN", "SALES", "ACCOUNTANT"] }, // accountant xem được
        { to: "/payments", label: "Thanh toán", icon: "💳", roles: ["ADMIN", "ACCOUNTANT"] },         // accountant tạo/thu/… theo BE
        { to: "/events", label: "Sự kiện", icon: "📅", roles: ["ADMIN", "SALES"] },
        { to: "/users", label: "Người dùng", icon: "🛠", roles: ["ADMIN"] },
        { to: "/reports", label: "Báo cáo", icon: "📈", roles: ["ADMIN", "ACCOUNTANT"] },
    ];

    const visibleItems = MENU.filter((m) => hasAnyRole(user, m.roles));

    return (
        <aside
            className={
                "bg-white/80 backdrop-blur shadow-xl border-r border-indigo-100 hidden lg:flex flex-col " +
                (collapsed ? "w-16" : "w-72")
            }
        >
            {/* Header + nút toggle */}
            <div
                className={
                    "p-4 border-b border-indigo-100 flex items-center " +
                    (collapsed ? "justify-center" : "justify-between")
                }
            >
                <div className={"flex items-center gap-3 " + (collapsed ? "hidden" : "")}>
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white grid place-content-center font-bold">
                        CT
                    </div>
                    <div className="font-bold text-slate-900">Quản lý KH & Hợp đồng</div>
                </div>

                <button
                    onClick={onToggle}
                    aria-label={collapsed ? "Mở rộng thanh bên" : "Thu gọn thanh bên"}
                    className="ml-auto inline-flex items-center justify-center h-9 w-9 rounded-lg border border-indigo-100 bg-white hover:bg-indigo-50 text-slate-600"
                    title={collapsed ? "Mở rộng" : "Thu gọn"}
                >
                    <span className={"transition-transform " + (collapsed ? "" : "rotate-180")}>❮</span>
                </button>
            </div>

            {/* Nav */}
            <nav className={"flex-1 overflow-auto p-3 space-y-2 " + (collapsed ? "px-2" : "px-3")}>
                {visibleItems.map((m) => (
                    <Item key={m.to} to={m.to} label={m.label} icon={m.icon} collapsed={collapsed} />
                ))}
            </nav>
        </aside>
    );
}
