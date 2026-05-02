// frontend/src/pages/Events.js — dùng endpoint chung /api/events cho cả ADMIN & SALES
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import api from "../api";
import { useAuth } from "../AuthContext";

/* ===== Helpers (đồng bộ phong cách Payments) ===== */
const pad2 = (n) => String(n).padStart(2, "0");
const fmtDmy = (d) => {
    if (!d) return "-";
    const x = new Date(d);
    if (isNaN(x)) return d;
    return `${pad2(x.getDate())}/${pad2(x.getMonth() + 1)}/${x.getFullYear()}`;
};
const fmtHm = (d) => {
    if (!d) return "";
    const x = new Date(d);
    if (isNaN(x)) return "";
    return `${pad2(x.getHours())}:${pad2(x.getMinutes())}`;
};
const fmtDateTimeVN = (d) => `${fmtDmy(d)} ${fmtHm(d)}`.trim();
const todayISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};
const addDays = (isoDate, delta) => {
    const d = new Date(isoDate);
    d.setDate(d.getDate() + delta);
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

function hasAnyRole(user, allow = []) {
    if (!user) return false;
    const S = new Set();
    const add = (x) => {
        if (!x) return;
        if (Array.isArray(x)) return x.forEach(add);
        if (typeof x === "string") return S.add(x.toUpperCase());
        if (typeof x === "object")
            return ["role", "name", "authority"].forEach((k) => x[k] && S.add(String(x[k]).toUpperCase()));
    };
    add(user?.role);
    add(user?.roles);
    add(user?.authorities);
    return allow.some((r) => S.has(r));
}

/* ===== API — dùng endpoint chung /api/events ===== */
const API = {
    LIST_ALL: "/api/events",
    CREATE: "/api/events",
    UPDATE: (id) => `/api/events/${id}`,
    DELETE: (id) => `/api/events/${id}`,
};

const mapIn = (raw) => ({
    id: raw.id,
    title: raw.title,
    type: raw.type,
    description: raw.description,
    customerId: raw.customerId,
    customerName: raw.customerName,
    contractId: raw.contractId,
    contractCode: raw.contractCode,
    assigneeId: raw.assigneeId,
    assigneeName: raw.assigneeName,
    startAt: raw.startAt,
    endAt: raw.endAt,
    status: raw.status,
    notifyByEmail: raw.notifyByEmail,
    notifyInApp: raw.notifyInApp,
});

const mapOutCreate = (f, currentUserId) => ({
    title: f.title.trim(),
    type: f.type || "MEETING",
    description: f.description?.trim() || null,
    customerId: f.customerId ? Number(f.customerId) : null,
    contractId: f.contractId ? Number(f.contractId) : null,
    assigneeUserId: currentUserId || null,
    startAt: f.startAt,
    endAt: f.endAt || null,
    status: f.status || "SCHEDULED",
    notifyByEmail: Boolean(f.notifyByEmail),
    notifyInApp: Boolean(f.notifyInApp ?? true),
});
const mapOutUpdate = (f) => ({
    title: f.title.trim(),
    description: f.description?.trim() || null,
    startAt: f.startAt,
    endAt: f.endAt || null,
    status: f.status || "SCHEDULED",
    notifyByEmail: Boolean(f.notifyByEmail),
    notifyInApp: Boolean(f.notifyInApp ?? true),
});

/* ===== Toast ===== */
const toneClass = (type) =>
    type === "error" ? "bg-rose-600"
        : type === "warn" ? "bg-amber-600"
            : "bg-emerald-600";

function ToastItem({ id, type, children, onDone, duration = 2000 }) {
    const [visible, setVisible] = useState(false);
    const hideTimer = useRef(null);
    const removeTimer = useRef(null);

    useEffect(() => {
        const t = setTimeout(() => setVisible(true), 20);
        hideTimer.current = setTimeout(() => {
            setVisible(false);
            removeTimer.current = setTimeout(() => onDone(id), 180);
        }, duration);
        return () => {
            clearTimeout(t);
            clearTimeout(hideTimer.current);
            clearTimeout(removeTimer.current);
        };
    }, [duration, id, onDone]);

    return (
        <div
            className={[
                "rounded-xl shadow-lg text-white px-4 py-2 select-none",
                toneClass(type),
                "pointer-events-auto",
                "transition-all duration-180",
                visible ? "opacity-100 translate-y-0 scale-100"
                    : "opacity-0 translate-y-2 scale-[0.98]"
            ].join(" ")}
            style={{ willChange: "transform, opacity" }}
            role="status"
            aria-live="polite"
        >
            <div className="flex items-center gap-3">
                <span className="text-sm">{children}</span>
                <button
                    className="ml-1 rounded px-2 py-0.5 text-xs bg-white/10 hover:bg-white/20"
                    onClick={() => {
                        clearTimeout(hideTimer.current);
                        setVisible(false);
                        removeTimer.current = setTimeout(() => onDone(id), 180);
                    }}
                >
                    Đóng
                </button>
            </div>
        </div>
    );
}

function ToastHost({ items, onDone }) {
    if (!items.length) return null;
    return createPortal(
        <div className="fixed top-4 right-4 z-[1000] flex flex-col gap-2 pointer-events-none">
            {items.map(t => (
                <ToastItem key={t.id} {...t} onDone={onDone}>
                    {t.msg}
                </ToastItem>
            ))}
        </div>,
        document.body
    );
}

/* ===== Page ===== */
export default function Events() {
    const { user } = useAuth();
    const canView = hasAnyRole(user, ["ADMIN", "SALES"]);
    const canEdit = hasAnyRole(user, ["ADMIN", "SALES"]);
    const currentUserId = user?.id || user?.userId || null;

    // Data
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [fromDate, setFromDate] = useState(addDays(todayISO(), -7));
    const [toDate, setToDate] = useState(addDays(todayISO(), 30));
    const [status, setStatus] = useState("ALL");
    const [type, setType] = useState("ALL");
    const [q, setQ] = useState("");

    // Modal create/edit
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({
        title: "",
        type: "MEETING",
        customerId: "",
        contractId: "",
        startAt: `${todayISO()}T09:00`,
        endAt: `${todayISO()}T10:00`,
        description: "",
        status: "SCHEDULED",
        notifyByEmail: false,
        notifyInApp: true,
    });

    // Dropdown data
    const [customers, setCustomers] = useState([]);
    const [contracts, setContracts] = useState([]);

    // Toasts
    const [toasts, setToasts] = useState([]);
    const toastId = useRef(0);
    const openToast = (msg, type = "success", duration = 2000) => {
        const id = ++toastId.current;
        setToasts(arr => [...arr, { id, msg, type, duration }]);
    };
    const removeToast = (id) => setToasts(arr => arr.filter(t => t.id !== id));

    /* -------- load dropdowns -------- */
    useEffect(() => {
        (async () => {
            try {
                const [cusRes, ctRes] = await Promise.all([
                    api.get("/api/customers", { params: { page: 0, size: 1000, sort: "name,asc" } }),
                    api.get("/api/contracts", { params: { page: 0, size: 1000, sort: "id,desc" } }),
                ]);
                const cus = Array.isArray(cusRes.data) ? cusRes.data : cusRes.data?.content || [];
                const cts = Array.isArray(ctRes.data) ? ctRes.data : ctRes.data?.content || [];
                setCustomers(cus);
                setContracts(cts);
            } catch (e) {/* im lặng nếu fail */}
        })();
    }, []);

    /* -------- load events -------- */
    async function loadEvents() {
        setLoading(true);
        try {
            const params = {
                from: fromDate,
                to: toDate,
                q: q || undefined,                 // nếu backend chưa hỗ trợ q thì server sẽ bỏ qua
                status: status !== "ALL" ? status : undefined,
                type: type !== "ALL" ? type : undefined,
                page: 0,
                size: 1000,
                sort: "startAt,asc",
            };
            const { data } = await api.get(API.LIST_ALL, { params }); // ⬅️ dùng endpoint chung
            const list = Array.isArray(data) ? data : data?.content || [];
            setRows(list.map(mapIn));
        } catch (e) {
            openToast("Tải sự kiện thất bại", "error");
            setRows([]);
        } finally {
            setLoading(false);
        }
    }
    useEffect(() => {
        if (canView) loadEvents();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fromDate, toDate, status, type]);

    /* -------- CRUD -------- */
    function openCreate() {
        setEditing(null);
        setForm({
            title: "",
            type: "MEETING",
            customerId: customers[0]?.id ? String(customers[0].id) : "",
            contractId: "",
            startAt: `${todayISO()}T09:00`,
            endAt: `${todayISO()}T10:00`,
            description: "",
            status: "SCHEDULED",
            notifyByEmail: false,
            notifyInApp: true,
        });
        setShowModal(true);
    }

    function openEdit(row) {
        setEditing(row);
        setForm({
            title: row.title || "",
            type: row.type || "MEETING",
            customerId: String(row.customerId || ""),
            contractId: String(row.contractId || ""),
            startAt: (row.startAt || "").slice(0, 16),
            endAt: (row.endAt || "").slice(0, 16),
            description: row.description || "",
            status: row.status || "SCHEDULED",
            notifyByEmail: Boolean(row.notifyByEmail),
            notifyInApp: Boolean(row.notifyInApp ?? true),
        });
        setShowModal(true);
    }

    async function save(e) {
        e.preventDefault();
        if (!canEdit) return;
        if (!form.title?.trim()) return openToast("Vui lòng nhập tiêu đề", "warn");
        if (!form.startAt) return openToast("Vui lòng nhập thời gian bắt đầu", "warn");

        setSaving(true);
        try {
            if (editing?.id) {
                await api.put(API.UPDATE(editing.id), mapOutUpdate(form));
                openToast("Đã cập nhật sự kiện");
            } else {
                await api.post(API.CREATE, mapOutCreate(form, currentUserId));
                openToast("Đã tạo sự kiện mới");
            }
            setShowModal(false);
            await loadEvents();
        } catch (err) {
            openToast(err?.response?.data?.message || "Lưu sự kiện thất bại", "error");
        } finally {
            setSaving(false);
        }
    }

    async function markDone(row) {
        if (!canEdit) return;
        try {
            await api.put(API.UPDATE(row.id), { status: "DONE" });
            await loadEvents();
            openToast("Đã đánh dấu hoàn thành");
        } catch (e) {
            openToast("Cập nhật trạng thái thất bại", "error");
        }
    }

    async function cancelEvent(row) {
        if (!canEdit) return;
        try {
            await api.put(API.UPDATE(row.id), { status: "CANCELED" });
            await loadEvents();
            openToast("Đã hủy sự kiện");
        } catch (e) {
            openToast("Cập nhật trạng thái thất bại", "error");
        }
    }

    async function removeRow(row) {
        if (!canEdit) return;
        if (!window.confirm("Xóa sự kiện này?")) return;
        try {
            await api.delete(API.DELETE(row.id));
            await loadEvents();
            openToast("Đã xóa sự kiện");
        } catch (e) {
            openToast("Xóa sự kiện thất bại", "error");
        }
    }

    /* -------- derived -------- */
    const grouped = useMemo(() => {
        const g = new Map();
        rows.forEach((ev) => {
            const k = (ev.startAt || "").slice(0, 10) || "Khác";
            if (!g.has(k)) g.set(k, []);
            g.get(k).push(ev);
        });
        const arr = Array.from(g.entries()).map(([date, items]) => ({ date, items }));
        arr.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
        return arr;
    }, [rows]);

    /* -------- render -------- */
    if (!canView) {
        return (
            <div className="space-y-3">
                <h2 className="text-lg font-semibold">Sự kiện</h2>
                <p className="text-sm text-slate-500">Bạn không có quyền truy cập trang này.</p>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <ToastHost items={toasts} onDone={removeToast} />

            {/* Header */}
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h2 className="text-lg font-semibold">Sự kiện</h2>
                    <p className="text-sm text-slate-500">Quản lý lịch hẹn & nhắc nhở với khách hàng</p>
                </div>
                <div className="flex items-center gap-2">
                    {canEdit && (
                        <button
                            onClick={openCreate}
                            className="px-3 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"
                        >
                            Thêm sự kiện
                        </button>
                    )}
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl border border-indigo-100 shadow p-4 grid grid-cols-1 md:grid-cols-6 gap-3">
                <div>
                    <div className="text-xs text-slate-500">Từ ngày</div>
                    <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
                           className="w-full px-3 py-2 rounded-lg border border-indigo-100 bg-white shadow"/>
                </div>
                <div>
                    <div className="text-xs text-slate-500">Đến ngày</div>
                    <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
                           className="w-full px-3 py-2 rounded-lg border border-indigo-100 bg-white shadow"/>
                </div>
                <div>
                    <div className="text-xs text-slate-500">Trạng thái</div>
                    <select value={status} onChange={(e) => setStatus(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-indigo-100 bg-white shadow">
                        <option value="ALL">Tất cả</option>
                        <option value="SCHEDULED">Dự kiến</option>
                        <option value="DONE">Hoàn thành</option>
                        <option value="CANCELED">Hủy</option>
                    </select>
                </div>
                <div>
                    <div className="text-xs text-slate-500">Loại</div>
                    <select value={type} onChange={(e) => setType(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-indigo-100 bg-white shadow">
                        <option value="ALL">Tất cả</option>
                        <option value="MEETING">Gặp khách hàng</option>
                        <option value="PAYMENT_REMINDER">Nhắc thanh toán</option>
                        <option value="CONTRACT_RENEWAL">Gia hạn hợp đồng</option>
                        <option value="OTHER">Khác</option>
                    </select>
                </div>
                <div className="md:col-span-2">
                    <div className="text-xs text-slate-500">Tìm kiếm</div>
                    <input placeholder="Tiêu đề / Mô tả / KH"
                           value={q}
                           onChange={(e) => setQ(e.target.value)}
                           onKeyDown={(e)=>{ if(e.key==='Enter') loadEvents(); }}
                           className="w-full px-3 py-2 rounded-lg border border-indigo-100 bg-white shadow"/>
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="bg-white rounded-2xl border border-indigo-100 shadow p-6 text-sm">Đang tải…</div>
            ) : rows.length === 0 ? (
                <div className="bg-white rounded-2xl border border-indigo-100 shadow p-6 text-sm">Không có sự kiện</div>
            ) : (
                <div className="space-y-4">
                    {grouped.map((grp) => (
                        <div key={grp.date} className="bg-white rounded-2xl border border-indigo-100 shadow overflow-hidden">
                            <div className="px-4 py-3 border-b flex items-center justify-between">
                                <div className="font-medium">{fmtDmy(grp.date)}</div>
                                <div className="text-xs text-slate-500">{grp.items.length} mục</div>
                            </div>
                            <div className="overflow-auto">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-indigo-50 text-slate-600">
                                    <tr>
                                        <th className="px-4 py-3 text-left">Thời gian</th>
                                        <th className="px-4 py-3 text-left">Tiêu đề</th>
                                        <th className="px-4 py-3 text-left">Khách hàng / Hợp đồng</th>
                                        <th className="px-4 py-3 text-left">Phụ trách</th>
                                        <th className="px-4 py-3 text-left">Loại</th>
                                        <th className="px-4 py-3 text-left">Trạng thái</th>
                                        <th className="px-4 py-3 text-left">Mô tả</th>
                                        <th className="px-4 py-3 text-right">Thao tác</th>
                                    </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                    {grp.items.map((ev) => {
                                        const statusTone = ev.status === "DONE"
                                            ? "bg-emerald-100 text-emerald-700"
                                            : ev.status === "CANCELED"
                                                ? "bg-rose-100 text-rose-700"
                                                : "bg-amber-100 text-amber-700";
                                        return (
                                            <tr key={ev.id} className="hover:bg-indigo-50/40">
                                                <td className="px-4 py-3 whitespace-nowrap">{fmtDateTimeVN(ev.startAt)}{ev.endAt ? ` → ${fmtHm(ev.endAt)}` : ""}</td>
                                                <td className="px-4 py-3">{ev.title || "-"}</td>
                                                <td className="px-4 py-3">
                                                    {(ev.customerName || "-")}
                                                    {ev.contractCode ? <span className="text-slate-500"> • {ev.contractCode}</span> : null}
                                                </td>
                                                <td className="px-4 py-3">{ev.assigneeName || "-"}</td>
                                                <td className="px-4 py-3">{ev.type || "-"}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-0.5 rounded-full text-xs ${statusTone}`}>{ev.status || "-"}</span>
                                                </td>
                                                <td className="px-4 py-3">{ev.description || "-"}</td>
                                                <td className="px-4 py-3 text-right">
                                                    {canEdit ? (
                                                        <div className="inline-flex gap-2">
                                                            {ev.status !== "DONE" && (
                                                                <button onClick={() => markDone(ev)}
                                                                        className="px-2 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100">
                                                                    Hoàn thành
                                                                </button>
                                                            )}
                                                            {ev.status !== "CANCELED" && (
                                                                <button onClick={() => cancelEvent(ev)}
                                                                        className="px-2 py-1 rounded bg-amber-50 text-amber-700 hover:bg-amber-100">
                                                                    Hủy
                                                                </button>
                                                            )}
                                                            <button onClick={() => openEdit(ev)}
                                                                    className="px-2 py-1 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100">
                                                                Sửa
                                                            </button>
                                                            <button onClick={() => removeRow(ev)}
                                                                    className="px-2 py-1 rounded bg-rose-50 text-rose-700 hover:bg-rose-100">
                                                                Xóa
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-400">—</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal create/edit */}
            {showModal && (
                <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4">
                    <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl border border-indigo-100">
                        <div className="p-5 border-b flex items-center justify-between">
                            <div className="font-semibold">{editing ? "Cập nhật sự kiện" : "Thêm sự kiện"}</div>
                            <button className="text-slate-500 hover:text-slate-700" onClick={() => setShowModal(false)}>Đóng</button>
                        </div>

                        <form onSubmit={save} className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="text-sm text-slate-600">Tiêu đề</label>
                                <input required value={form.title}
                                       onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                                       className="w-full px-3 py-2 rounded-lg border border-indigo-100 bg-white shadow"/>
                            </div>

                            <div>
                                <label className="text-sm text-slate-600">Khách hàng</label>
                                <select value={form.customerId} onChange={(e) => setForm((f) => ({ ...f, customerId: e.target.value }))}
                                        className="w-full px-3 py-2 rounded-lg border border-indigo-100 bg-white shadow">
                                    <option value="">— Chọn khách hàng —</option>
                                    {customers.map((c) => (
                                        <option key={c.id} value={c.id}>{c.name || c.customerName || `KH-${c.id}`}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-sm text-slate-600">Hợp đồng (tùy chọn)</label>
                                <select value={form.contractId} onChange={(e) => setForm((f) => ({ ...f, contractId: e.target.value }))}
                                        className="w-full px-3 py-2 rounded-lg border border-indigo-100 bg-white shadow">
                                    <option value="">— Không liên kết —</option>
                                    {contracts.map((ct) => {
                                        const code = ct.contractCode || ct.code || `HD-${ct.id}`;
                                        const cus = ct.customer?.name || ct.customerName || "";
                                        return (
                                            <option key={ct.id} value={ct.id}>{code} {cus ? `- ${cus}` : ""}</option>
                                        );
                                    })}
                                </select>
                            </div>

                            <div>
                                <label className="text-sm text-slate-600">Loại sự kiện</label>
                                <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                                        className="w-full px-3 py-2 rounded-lg border border-indigo-100 bg-white shadow">
                                    <option value="MEETING">Gặp khách hàng</option>
                                    <option value="PAYMENT_REMINDER">Nhắc thanh toán</option>
                                    <option value="CONTRACT_RENEWAL">Gia hạn hợp đồng</option>
                                    <option value="OTHER">Khác</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-sm text-slate-600">Trạng thái</label>
                                <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                                        className="w-full px-3 py-2 rounded-lg border border-indigo-100 bg-white shadow">
                                    <option value="SCHEDULED">Dự kiến</option>
                                    <option value="DONE">Hoàn thành</option>
                                    <option value="CANCELED">Hủy</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-sm text-slate-600">Bắt đầu</label>
                                <input type="datetime-local" value={form.startAt}
                                       onChange={(e) => setForm((f) => ({ ...f, startAt: e.target.value }))}
                                       className="w-full px-3 py-2 rounded-lg border border-indigo-100 bg-white shadow"/>
                            </div>

                            <div>
                                <label className="text-sm text-slate-600">Kết thúc (tùy chọn)</label>
                                <input type="datetime-local" value={form.endAt}
                                       onChange={(e) => setForm((f) => ({ ...f, endAt: e.target.value }))}
                                       className="w-full px-3 py-2 rounded-lg border border-indigo-100 bg-white shadow"/>
                            </div>

                            <div className="md:col-span-2">
                                <label className="text-sm text-slate-600">Mô tả</label>
                                <input value={form.description}
                                       onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                                       className="w-full px-3 py-2 rounded-lg border border-indigo-100 bg-white shadow"/>
                            </div>

                            <div className="md:col-span-2 flex items-center gap-6">
                                <label className="inline-flex items-center gap-2">
                                    <input type="checkbox" className="accent-indigo-600 scale-110" checked={!!form.notifyInApp}
                                           onChange={(e) => setForm((f) => ({ ...f, notifyInApp: e.target.checked }))} />
                                    <span className="text-sm">Hiển thị thông báo trong ứng dụng</span>
                                </label>
                                <label className="inline-flex items-center gap-2">
                                    <input type="checkbox" className="accent-indigo-600 scale-110" checked={!!form.notifyByEmail}
                                           onChange={(e) => setForm((f) => ({ ...f, notifyByEmail: e.target.checked }))} />
                                    <span className="text-sm">Gửi email nhắc</span>
                                </label>
                            </div>

                            <div className="md:col-span-2 flex items-center justify-end gap-2 pt-2">
                                <button type="button" className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200"
                                        onClick={() => setShowModal(false)} disabled={saving}>Hủy</button>
                                <button className="px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                                        disabled={saving}>{saving ? "Đang lưu..." : (editing ? "Cập nhật" : "Lưu")}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
