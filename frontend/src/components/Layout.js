import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import { useAuth } from "../AuthContext";
import { useEffect, useState } from "react";

const LS_KEY = "sidebar_collapsed";

export default function Layout() {
    const { user, logout } = useAuth();
    const [collapsed, setCollapsed] = useState(false);

    // nhớ trạng thái thu gọn
    useEffect(() => {
        try {
            const saved = localStorage.getItem(LS_KEY);
            if (saved != null) setCollapsed(saved === "1");
        } catch {}
    }, []);
    useEffect(() => {
        try {
            localStorage.setItem(LS_KEY, collapsed ? "1" : "0");
        } catch {}
    }, [collapsed]);

    return (
        <div className="flex min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 text-slate-800">
            <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
            <main className="flex-1 flex flex-col">
                {/* Header */}
                <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-indigo-100">
                    {/* NỚI RỘNG: max-w-[1760px] (rộng hơn screen-2xl một chút) */}
                    <div className="max-w-[1760px] mx-auto w-full px-4 lg:px-8 py-4 flex items-center justify-end">
                        {/* Box tài khoản bên phải */}
                        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white shadow border border-indigo-100">
                            <div className="h-9 w-9 rounded-full bg-indigo-100 grid place-items-center font-semibold text-indigo-700">
                                {String(user?.username || "A").slice(0, 1).toUpperCase()}
                            </div>
                            <div>
                                <div className="text-sm font-semibold">{user?.username || "admin"}</div>
                                <div className="text-xs text-slate-500">
                                    {Array.isArray(user?.roles) ? user.roles.join(", ") : ""}
                                </div>
                            </div>
                            <button
                                onClick={logout}
                                className="ml-2 text-sm px-3 py-1.5 rounded bg-slate-100 hover:bg-slate-200"
                            >
                                Đăng xuất
                            </button>
                        </div>
                    </div>
                </header>

                {/* Content */}
                {/* NỚI RỘNG: max-w-[1760px] */}
                <section className="max-w-[1760px] mx-auto w-full px-4 lg:px-8 py-6">
                    <Outlet />
                </section>
            </main>
        </div>
    );
}
