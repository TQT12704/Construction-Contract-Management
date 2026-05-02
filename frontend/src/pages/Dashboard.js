// frontend/src/pages/Dashboard.js
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import { useAuth } from "../AuthContext";

/* ========== Helpers ========== */
const pad2 = (n) => String(n).padStart(2, "0");
const fmtMoney = (n) => (Number(n || 0)).toLocaleString("vi-VN", { maximumFractionDigits: 0 });
const toISODate = (d) => {
    const x = new Date(d);
    if (isNaN(x)) return "";
    return `${x.getFullYear()}-${pad2(x.getMonth() + 1)}-${pad2(x.getDate())}`;
};
const todayISO = () => toISODate(new Date());
const addDays = (isoDate, delta) => {
    const d = new Date(isoDate);
    d.setDate(d.getDate() + delta);
    return toISODate(d);
};
const fmtDmy = (d) => {
    if (!d) return "-";
    const x = new Date(d);
    if (isNaN(x)) return d;
    return `${pad2(x.getDate())}/${pad2(x.getMonth() + 1)}/${x.getFullYear()}`;
};
const hasRole = (user, allow) => {
    const S = new Set();
    const add = (x) => {
        if (!x) return;
        if (Array.isArray(x)) return x.forEach(add);
        if (typeof x === "string") return S.add(x.toUpperCase());
        if (typeof x === "object") {
            ["role", "name", "authority", "code"].forEach(k => x[k] && S.add(String(x[k]).toUpperCase()));
            ["roles", "authorities"].forEach(k => add(x[k]));
        }
    };
    add(user?.role); add(user?.roles); add(user?.authorities);
    return allow.some(r => S.has(r));
};

/* ========== API endpoints dựa trên BE hiện có ========== */
const CONTRACTS_API = "/api/contracts";
const CUSTOMERS_API = "/api/customers";
const PAY_OVERVIEW_API = "/api/payments/overview"; // tổng đã thu/còn lại
const EVENTS_ME = "/api/events/me";
const EVENTS_ADMIN = "/api/events/admin";

export default function Dashboard() {
    const { user } = useAuth();
    const isAdmin = hasRole(user, ["ADMIN"]);
    const canViewEvents = hasRole(user, ["ADMIN", "SALES", "ACCOUNTANT"]);

    // topline
    const [countCustomers, setCountCustomers] = useState(null);
    const [countContracts, setCountContracts] = useState(null);
    const [sumPaid, setSumPaid] = useState(null);
    const [sumRemain, setSumRemain] = useState(null);

    // recent contracts
    const [recentContracts, setRecentContracts] = useState([]);
    const [loadingContracts, setLoadingContracts] = useState(true);

    // upcoming events
    const [events, setEvents] = useState([]);
    const [loadingEvents, setLoadingEvents] = useState(true);

    const DAYS_AHEAD = 30; // đổi nếu muốn hiển thị rộng hơn

    useEffect(() => {
        loadTopline();
        loadRecentContracts();
        if (canViewEvents) loadUpcomingEvents();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    /* ---------- Load topline ---------- */
    async function loadTopline() {
        // KH (ưu tiên /count; fallback lấy pageable totalElements; cuối cùng là length)
        try {
            let c = null;
            try {
                const r = await api.get(`${CUSTOMERS_API}/count`);
                c = Number(r.data);
            } catch {
                const r2 = await api.get(CUSTOMERS_API, { params: { page: 0, size: 1 } });
                const data = r2.data;
                if (data && Number.isFinite(data.totalElements)) c = data.totalElements;
                else c = Array.isArray(data) ? data.length : (data?.content?.length ?? 0);
            }
            setCountCustomers(c);
        } catch {
            setCountCustomers(0);
        }

        // HĐ (tương tự)
        try {
            let n = null;
            try {
                const r = await api.get(`${CONTRACTS_API}/count`);
                n = Number(r.data);
            } catch {
                const r2 = await api.get(CONTRACTS_API, { params: { page: 0, size: 1, sort: "id,desc" } });
                const data = r2.data;
                if (data && Number.isFinite(data.totalElements)) n = data.totalElements;
                else n = Array.isArray(data) ? data.length : (data?.content?.length ?? 0);
            }
            setCountContracts(n);
        } catch {
            setCountContracts(0);
        }

        // Tổng đã thu / còn lại (BE payments/overview tổng hệ thống khi không truyền contractId)
        try {
            const r = await api.get(PAY_OVERVIEW_API);
            const paid = r?.data?.totalPaid ?? r?.data?.sumPaid ?? r?.data?.paidAmount ?? r?.data?.paid ?? 0;
            const remain = r?.data?.totalRemaining ?? r?.data?.sumRemaining ?? r?.data?.remainingAmount ?? r?.data?.remaining ?? 0;
            setSumPaid(paid);
            setSumRemain(remain);
        } catch {
            setSumPaid(0);
            setSumRemain(0);
        }
    }

    /* ---------- Load recent contracts ---------- */
    async function loadRecentContracts() {
        setLoadingContracts(true);
        try {
            const { data } = await api.get(CONTRACTS_API, {
                params: { page: 0, size: 5, sort: "id,desc" },
            });
            const list = Array.isArray(data) ? data : data?.content || [];
            const mapped = list.map((x) => ({
                id: x.id,
                code: x.contractCode || `HD-${x.id}`,
                customer: x.customerName || "-",
                signedDate: x.signedDate,
                total: x.totalAmount,
                status: x.status,
            }));
            setRecentContracts(mapped);
        } catch {
            setRecentContracts([]);
        } finally {
            setLoadingContracts(false);
        }
    }

    /* ---------- Load upcoming events ---------- */
    async function loadUpcomingEvents() {
        setLoadingEvents(true);
        try {
            const from = todayISO();
            const to = addDays(from, DAYS_AHEAD);
            const url = isAdmin ? EVENTS_ADMIN : EVENTS_ME;
            const { data } = await api.get(url, {
                params: {
                    from, to,
                    status: "SCHEDULED",
                    page: 0, size: 5, sort: "startAt,asc",
                },
            });
            const list = Array.isArray(data) ? data : data?.content || [];
            const mapped = list.map((raw) => ({
                id: raw.id,
                title: raw.title,
                customerName: raw.customerName,
                startAt: raw.startAt,
                endAt: raw.endAt,
                type: raw.type,
                status: raw.status,
            }));
            setEvents(mapped);
        } catch {
            setEvents([]);
        } finally {
            setLoadingEvents(false);
        }
    }

    const cards = useMemo(() => ([
        { label: "Khách hàng", val: countCustomers ?? "—" },
        { label: "Hợp đồng",  val: countContracts ?? "—" },
        { label: "Đã thu",    val: (sumPaid == null ? "—" : `${fmtMoney(sumPaid)} đ`) },
        { label: "Còn lại",   val: (sumRemain == null ? "—" : `${fmtMoney(sumRemain)} đ`) },
    ]), [countCustomers, countContracts, sumPaid, sumRemain]);

    return (
        <div className="space-y-6">
            {/* Topline */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {cards.map((m, i) => (
                    <div key={i} className="p-5 rounded-2xl bg-white shadow border border-indigo-100">
                        <div className="text-sm text-slate-500">{m.label}</div>
                        <div className="mt-1 text-2xl font-bold tabular-nums">{m.val}</div>
                    </div>
                ))}
            </div>

            {/* Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent contracts */}
                <div className="lg:col-span-2 p-5 rounded-2xl bg-white shadow border border-indigo-100">
                    <div className="flex items-center justify-between mb-3">
                        <div className="font-semibold">Hợp đồng gần đây</div>
                        <Link to="/contracts" className="text-sm text-indigo-600">Xem tất cả</Link>
                    </div>

                    <div className="overflow-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-indigo-50 text-slate-600">
                            <tr>
                                <th className="px-4 py-2 text-left">Mã</th>
                                <th className="px-4 py-2 text-left">Khách hàng</th>
                                <th className="px-4 py-2 text-left">Ngày ký</th>
                                <th className="px-4 py-2 text-left">Giá trị</th>
                                <th className="px-4 py-2 text-left">Trạng thái</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y">
                            {loadingContracts ? (
                                <tr><td className="px-4 py-4 text-slate-500" colSpan={5}>Đang tải…</td></tr>
                            ) : recentContracts.length === 0 ? (
                                <tr><td className="px-4 py-4 text-slate-500" colSpan={5}>Sẽ hiển thị khi bạn thêm dữ liệu.</td></tr>
                            ) : recentContracts.map((c) => (
                                <tr key={c.id} className="hover:bg-indigo-50/40">
                                    <td className="px-4 py-2">
                                        <Link to={`/contracts/${c.id}`} className="text-indigo-600 hover:underline">{c.code}</Link>
                                    </td>
                                    <td className="px-4 py-2">{c.customer}</td>
                                    <td className="px-4 py-2 whitespace-nowrap">{fmtDmy(c.signedDate)}</td>
                                    <td className="px-4 py-2 tabular-nums whitespace-nowrap">{fmtMoney(c.total)} đ</td>
                                    <td className="px-4 py-2">{c.status || "-"}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Upcoming events */}
                <div className="p-5 rounded-2xl bg-white shadow border border-indigo-100">
                    <div className="flex items-center justify-between mb-3">
                        <div className="font-semibold">Sự kiện sắp tới</div>
                        {canViewEvents && <Link to="/events" className="text-sm text-indigo-600">Xem tất cả</Link>}
                    </div>

                    {loadingEvents ? (
                        <div className="text-slate-500 text-sm">Đang tải…</div>
                    ) : events.length === 0 ? (
                        <div className="text-slate-500 text-sm">
                            Không có sự kiện trong {DAYS_AHEAD} ngày tới (hoặc đã ở trạng thái khác <code>SCHEDULED</code>).
                        </div>
                    ) : (
                        <ul className="space-y-2">
                            {events.map((ev) => (
                                <li key={ev.id} className="p-3 rounded-xl border border-indigo-100 bg-slate-50">
                                    <div className="font-medium">{ev.title || "(Không tiêu đề)"}</div>
                                    <div className="text-sm text-slate-600">
                                        {fmtDmy(ev.startAt)}{ev.endAt ? ` • ${new Date(ev.startAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}–${new Date(ev.endAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}` : ""}
                                        {ev.customerName ? ` • KH: ${ev.customerName}` : ""}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}
