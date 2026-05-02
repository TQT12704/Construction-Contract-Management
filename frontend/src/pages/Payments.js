// frontend/src/pages/Payments.js
import { useEffect, useMemo, useState } from "react";
import api from "../api";
import { useAuth } from "../AuthContext";

/* ===== Helpers ===== */
const VND = (v) => Number(v || 0).toLocaleString("vi-VN");
const pad2 = (n) => String(n).padStart(2, "0");
const fmtDmy = (d) => {
    if (!d) return "-";
    const x = new Date(d);
    if (isNaN(x)) return d;
    return `${pad2(x.getDate())}/${pad2(x.getMonth() + 1)}/${x.getFullYear()}`;
};
const todayStr = () => {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${m}-${day}`;
};
const parseNumberText = (s) => Number(String(s ?? "").replace(/[^\d]/g, "") || 0);
const normStatus = (st) => String(st || "").toUpperCase();
const isValidDate = (d) => {
    if (!d) return false;
    const x = new Date(d);
    return !isNaN(x);
};
const toISODate = (d) => (isValidDate(d) ? new Date(d).toISOString().slice(0, 10) : null);

// Nhận diện đã thanh toán (khoan dung)
const norm = (s) => String(s || "").trim().toUpperCase();
const isPaidLike = (status, fallbackBool) => {
    const t = norm(status);
    return (
        fallbackBool === true ||
        t === "PAID" ||
        t.includes("PAID") ||
        (t.includes("ĐÃ") && t.includes("THANH TOÁN"))
    );
};

// Lấy số thực thu “an toàn”: nếu actualAmount > 0 dùng actual, ngược lại dùng amount
const getActualPaid = (p) => {
    const paid = isPaidLike(p.status || p.paymentStatus, p.isPaid === true);
    if (!paid) return 0;
    const actual = parseNumberText(p.actualAmount ?? 0);
    const amt = parseNumberText(p.amount ?? 0);
    return actual > 0 ? actual : amt;
};

const METHOD_OPTS = [
    { label: "Chuyển khoản", value: "BANK_TRANSFER" },
    { label: "Tiền mặt", value: "CASH" },
    { label: "Khác", value: "OTHER" },
];
const STATUS_OPTS = [
    { label: "Chưa thanh toán", value: "UNPAID" },
    { label: "Đã thanh toán", value: "PAID" },
];
const toLabel = (opts, v) => opts.find((o) => o.value === v || o.label === v)?.label || v || "";
const toValue = (opts, l) => opts.find((o) => o.label === l || o.value === l)?.value || l;

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

/* ===== Tiny toast (auto-dismiss) ===== */
function Toast({ show, type = "success", duration = 3000, children, onClose }) {
    const tone =
        type === "error" ? "bg-rose-600" :
            type === "warn"  ? "bg-amber-600" :
                "bg-emerald-600";

    useEffect(() => {
        if (!show) return;
        const t = setTimeout(() => onClose?.(), duration);
        return () => clearTimeout(t);
    }, [show, duration, onClose]);

    if (!show) return null;

    return (
        <div className="fixed top-4 right-4 z-[60]">
            <div className={`${tone} text-white px-4 py-2 rounded-lg shadow-lg`}>
                <div className="flex items-center gap-3">
                    <span className="text-sm">{children}</span>
                    <button className="text-white/80 hover:text-white text-xs" onClick={onClose}>
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ===== Page ===== */
export default function Payments() {
    const { user } = useAuth();
    const canCreate = hasAnyRole(user, ["ADMIN", "SALES"]);
    const canMarkPaid = hasAnyRole(user, ["ADMIN", "ACCOUNTANT"]);
    const canDelete = hasAnyRole(user, ["ADMIN", "ACCOUNTANT"]);
    const canView = hasAnyRole(user, ["ADMIN", "ACCOUNTANT", "SALES"]);

    const [contracts, setContracts] = useState([]);
    const [rows, setRows] = useState([]); // payments of selected contract OR overview
    const [historyRows, setHistoryRows] = useState([]);
    const [activeTab, setActiveTab] = useState("payments"); // 'payments' | 'history'
    const [selectedContractId, setSelectedContractId] = useState(""); // "ALL" means all
    const [loading, setLoading] = useState(true);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // summary
    const [summary, setSummary] = useState(null);

    // Modal tạo đợt
    const [showCreate, setShowCreate] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        contractId: "",
        dueDate: todayStr(),
        amount: "",
        method: "Chuyển khoản",
        note: "",
    });

    // Modal xác nhận đã thu
    const [showPaid, setShowPaid] = useState(false);
    const [paying, setPaying] = useState(false);
    const [activeRow, setActiveRow] = useState(null);
    const [paidForm, setPaidForm] = useState({
        amountText: "",
        paidDate: todayStr(),
        method: "Chuyển khoản",
        note: "",
    });

    // toast
    const [toast, setToast] = useState({ show: false, type: "success", msg: "", duration: 3000 });
    const openToast = (msg, type = "success", duration = 3000) =>
        setToast({ show: true, type, msg, duration });
    const closeToast = () => setToast((t) => ({ ...t, show: false }));

    // Nhắc nhở
    const [scanLoading, setScanLoading] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    const loadUnreadCount = async () => {
        try {
            const res = await api.get(`/api/notifications/unread-count`);
            setUnreadCount(Number(res.data || 0));
        } catch {}
    };

    const scanRemindersNow = async () => {
        try {
            setScanLoading(true);
            const res = await api.post(`/api/notifications/scan?daysAhead=7`);
            const msg = typeof res.data === "string" ? res.data : "Đã quét nhắc nhở thanh toán.";
            openToast(msg, "success", 2500);
            await loadUnreadCount();
        } catch (e) {
            openToast("Quét nhắc nhở thất bại", "error", 5000);
        } finally {
            setScanLoading(false);
        }
    };

    /* ---------- load contracts ---------- */
    useEffect(() => {
        (async () => {
            try {
                const { data } = await api.get("/api/contracts", {
                    params: { page: 0, size: 1000, sort: "id,desc" },
                });
                const list = Array.isArray(data) ? data : data?.content || [];
                setContracts(list);
                if (!selectedContractId) setSelectedContractId("ALL");
            } catch (e) {
                console.error("Load contracts failed:", e);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // badge
    useEffect(() => {
        loadUnreadCount();
    }, []);

    /* ---------- load by tab ---------- */
    useEffect(() => {
        if (!selectedContractId) {
            setRows([]);
            setHistoryRows([]);
            setSummary(null);
            return;
        }
        if (activeTab === "payments") {
            if (selectedContractId === "ALL") loadOverviewWithFallback();
            else loadPaymentsSummary(selectedContractId);
        } else {
            if (selectedContractId === "ALL") setHistoryRows([]);
            else loadHistoryByContract(selectedContractId);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedContractId, activeTab]);

    /* ---------- loaders ---------- */
    async function loadOverviewWithFallback() {
        setLoading(true);
        try {
            const { data } = await api.get(`/api/payments/overview`);
            setRows(Array.isArray(data?.payments) ? data.payments : []);
            setSummary({
                total: data?.totalAmount || 0,
                paid: data?.totalPaid || 0,
                remain: data?.remaining ?? Math.max(0, (data?.totalAmount || 0) - (data?.totalPaid || 0)),
                code: "ALL",
                customer: "",
                salesName: "",
                paidCount: data?.paidCount ?? null,
                pendingCount: data?.pendingCount ?? null,
                cancelledCount: data?.cancelledCount ?? null,
                firstPaymentDate: data?.firstPaymentDate || null,
                lastPaymentDate: data?.lastPaymentDate || null,
            });
        } catch (e) {
            try {
                const { data: list } = await api.get("/api/payments/installments");
                const items = Array.isArray(list) ? list : list?.content || [];
                setRows(items);

                const agg = items.reduce(
                    (acc, it) => {
                        const amt = parseNumberText(it.amount ?? 0);
                        const paidAmt = getActualPaid(it);
                        if (paidAmt > 0) acc.paid += paidAmt;
                        else acc.pendingCount += 1;
                        acc.total += amt;
                        const d = it.paymentDate || it.dueDate || it.planDate;
                        if (d) {
                            const t = new Date(d).getTime();
                            if (isFinite(t)) {
                                acc.first = acc.first == null || t < acc.first ? t : acc.first;
                                acc.last = acc.last == null || t > acc.last ? t : acc.last;
                            }
                        }
                        return acc;
                    },
                    { total: 0, paid: 0, paidCount: 0, pendingCount: 0, cancelledCount: null, first: null, last: null }
                );

                const dateOrDash = (ts) => (ts ? fmtDmy(new Date(ts)) : null);

                setSummary({
                    total: agg.total,
                    paid: agg.paid,
                    remain: Math.max(0, agg.total - agg.paid),
                    code: "ALL",
                    customer: "",
                    salesName: "",
                    paidCount: null,
                    pendingCount: agg.pendingCount,
                    cancelledCount: null,
                    firstPaymentDate: dateOrDash(agg.first) || null,
                    lastPaymentDate: dateOrDash(agg.last) || null,
                });

                openToast("Tải tổng hợp thất bại — đã chuyển sang chế độ dự phòng", "warn", 4000);
            } catch (e2) {
                console.error("overview & fallback both failed:", e2?.response || e2);
                openToast("Tải tổng hợp tất cả hợp đồng thất bại", "error", 5000);
                setRows([]);
                setSummary(null);
            }
        } finally {
            setLoading(false);
        }
    }

    async function loadPaymentsSummary(contractId) {
        const id = Number(contractId);
        if (!id) {
            setRows([]);
            setSummary(null);
            return;
        }
        setLoading(true);
        try {
            const { data } = await api.get(`/api/contracts/${id}/payments/summary`);
            const list = Array.isArray(data?.payments) ? data.payments : [];
            setRows(list);

            // Reconcile totals từ rows (sửa case actualAmount = 0)
            const fixed = list.reduce(
                (acc, p) => {
                    acc.total += parseNumberText(p.amount ?? 0);
                    acc.paid += getActualPaid(p);
                    return acc;
                },
                { total: 0, paid: 0 }
            );

            setSummary({
                total: fixed.total || data?.totalAmount || 0,
                paid: fixed.paid || data?.totalPaid || 0,
                remain: Math.max(0, (fixed.total || data?.totalAmount || 0) - (fixed.paid || data?.totalPaid || 0)),
                code: data?.contractCode || data?.code || `HD-${id}`,
                customer: data?.customerName || "",
                salesName: data?.salesName || "",
                paidCount: data?.paidCount ?? null,
                pendingCount: data?.pendingCount ?? null,
                cancelledCount: data?.cancelledCount ?? null,
                firstPaymentDate: data?.firstPaymentDate || null,
                lastPaymentDate: data?.lastPaymentDate || null,
            });
        } catch (e) {
            console.error("loadPaymentsSummary error:", e?.response || e);
            openToast("Tải tổng hợp & đợt thanh toán thất bại", "error", 5000);
            setRows([]);
            setSummary(null);
        } finally {
            setLoading(false);
        }
    }

    async function loadHistoryByContract(contractId) {
        const id = Number(contractId);
        if (!id) return setHistoryRows([]);
        setLoadingHistory(true);
        try {
            const { data } = await api.get(`/api/contracts/${id}/payments/history`);
            setHistoryRows(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error("loadHistory error:", e?.response || e);
            openToast("Tải lịch sử thanh toán thất bại", "error", 5000);
            setHistoryRows([]);
        } finally {
            setLoadingHistory(false);
        }
    }

    /* ---------- derived ---------- */
    const contractMap = useMemo(() => {
        const m = new Map();
        contracts.forEach((ct) => m.set(String(ct.id), ct));
        return m;
    }, [contracts]);

    const currentContract = selectedContractId ? contractMap.get(String(selectedContractId)) : null;

    // nhóm rows theo hợp đồng để vẽ card
    const grouped = useMemo(() => {
        const g = new Map();
        rows.forEach((p) => {
            const id = String(p.contractId ?? p.contract?.id ?? p.contract?.contractId ?? "unknown");
            const code =
                p.contractCode || p.contract?.contractCode || p.contract?.code || (p.contractId ? `HD-${p.contractId}` : "—");
            const customer = p.contract?.customer?.name || p.customerName || "";
            if (!g.has(id)) g.set(id, { id, code, customer, items: [] });
            g.get(id).items.push(p);
        });
        return Array.from(g.values());
    }, [rows]);

    /* ---------- create installment ---------- */
    function openCreate() {
        // Cho phép mở modal ở mọi chế độ; nếu đang ALL thì pick HĐ đầu tiên (nếu có)
        const defaultContractId =
            selectedContractId && selectedContractId !== "ALL"
                ? String(selectedContractId)
                : (contracts[0]?.id ? String(contracts[0].id) : "");
        setForm({
            contractId: defaultContractId,
            dueDate: todayStr(),
            amount: "",
            method: "Chuyển khoản",
            note: "",
        });
        setShowCreate(true);
    }

    async function save(e) {
        e.preventDefault();
        const contractIdNum = Number(form.contractId);
        if (!contractIdNum) return openToast("Vui lòng chọn hợp đồng", "warn", 3500);

        const amountNum = parseNumberText(form.amount);
        if (!amountNum || amountNum <= 0) return openToast("Số tiền phải lớn hơn 0", "warn", 3500);

        const payload = {
            amount: amountNum,
            dueDate: form.dueDate || null,
            method: toValue(METHOD_OPTS, form.method),
            note: form.note?.trim() || null,
        };

        setSaving(true);
        try {
            await api.post(`/api/payments/by-contract/${contractIdNum}`, payload);
            setShowCreate(false);
            if (selectedContractId === "ALL") await loadOverviewWithFallback();
            else await loadPaymentsSummary(contractIdNum);
            openToast("Tạo đợt thanh toán thành công", "success", 2500);
            await loadUnreadCount();
        } catch (err) {
            const data = err?.response?.data;
            openToast(data?.message || data?.error || "Lưu thanh toán thất bại", "error", 5000);
        } finally {
            setSaving(false);
        }
    }

    async function removeRow(row) {
        if (!canDelete) return;
        const paid = isPaidLike(row.status || row.paymentStatus, row.isPaid === true);
        if (paid) return openToast("Không xoá được đợt đã thanh toán", "warn", 3500);
        if (!window.confirm("Xoá đợt thanh toán này? (Chỉ xoá khi CHƯA THU)")) return;
        try {
            await api.delete(`/api/payments/${row.id}`);
            if (selectedContractId === "ALL") await loadOverviewWithFallback();
            else await loadPaymentsSummary(selectedContractId);
            openToast("Đã xoá đợt thanh toán", "success", 2500);
            await loadUnreadCount();
        } catch (err) {
            openToast(err?.response?.data?.message || "Xoá thanh toán thất bại", "error", 5000);
        }
    }

    /* ---------- mark paid (modal) ---------- */
    function openPaid(row) {
        setActiveRow(row);
        setPaidForm({
            amountText: VND(parseNumberText(row.actualAmount ?? row.amount ?? 0)),
            paidDate: todayStr(),
            method: "Chuyển khoản",
            note: "",
        });
        setShowPaid(true);
    }

    async function doMarkPaid(e) {
        e.preventDefault();
        if (!activeRow?.id) return;
        setPaying(true);
        try {
            const actual = parseNumberText(paidForm.amountText);
            await api.patch(`/api/payments/${activeRow.id}/mark-paid`, {
                actualAmount: actual || null,
                paidDate: paidForm.paidDate || todayStr(),
                method: toValue(METHOD_OPTS, paidForm.method),
                note: paidForm.note?.trim() || null,
            });
            setShowPaid(false);
            if (selectedContractId === "ALL") await loadOverviewWithFallback();
            else await loadPaymentsSummary(selectedContractId);
            openToast("Đã cập nhật trạng thái: Đã thanh toán", "success", 2500);
            await loadUnreadCount();
        } catch (err) {
            const data = err?.response?.data;
            openToast(data?.message || data?.error || "Cập nhật trạng thái 'Đã thanh toán' thất bại", "error", 5000);
        } finally {
            setPaying(false);
        }
    }

    /* ---------- render ---------- */
    if (!canView) {
        return (
            <div className="space-y-3">
                <h2 className="text-lg font-semibold">Thanh toán</h2>
                <p className="text-sm text-slate-500">Bạn không có quyền xem trang này.</p>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <Toast show={toast.show} type={toast.type} duration={toast.duration} onClose={closeToast}>
                {toast.msg}
            </Toast>

            {/* Header */}
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h2 className="text-lg font-semibold">Thanh toán</h2>
                    <p className="text-sm text-slate-500">Quản lý các đợt thanh toán theo hợp đồng</p>
                </div>

                <div className="flex items-center gap-3">
                    <select
                        value={selectedContractId}
                        onChange={(e) => setSelectedContractId(e.target.value)}
                        className="px-3 py-2 rounded-xl border border-indigo-100 bg-white shadow min-w-[320px]"
                        title="Chọn hợp đồng"
                    >
                        <option value="ALL">— Tất cả hợp đồng —</option>
                        {contracts.map((ct) => {
                            const code = ct.contractCode || ct.code || `HD-${ct.id}`;
                            const cus = ct.customer?.name || ct.customerName || "";
                            return (
                                <option key={ct.id} value={ct.id}>
                                    {code} - {cus}
                                </option>
                            );
                        })}
                    </select>

                    {/* 🔔 Nhắc nhở */}
                    <button
                        onClick={scanRemindersNow}
                        disabled={scanLoading}
                        className="px-3 py-2 rounded-xl border border-indigo-100 bg-white hover:bg-indigo-50 shadow inline-flex items-center gap-2 disabled:opacity-50"
                        title="Quét và tạo nhắc nhở cho các đợt UNPAID quá hạn / sắp đến hạn"
                    >
                        <span role="img" aria-label="bell">🔔</span>
                        <span>Nhắc nhở</span>
                        {unreadCount > 0 && (
                            <span className="ml-1 inline-flex items-center justify-center text-xs min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white">
                                {unreadCount}
                            </span>
                        )}
                    </button>

                    {canCreate && (
                        <button
                            onClick={openCreate}
                            className="px-3 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"
                            title="Thêm đợt thanh toán (có thể chọn hợp đồng trong modal)"
                        >
                            Thêm đợt thanh toán
                        </button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-4 border-b">
                <button
                    className={`pb-2 ${activeTab === "payments" ? "border-b-2 border-indigo-600 font-medium" : "text-slate-500"}`}
                    onClick={() => setActiveTab("payments")}
                >
                    Đợt thanh toán
                </button>
                <button
                    className={`pb-2 ${activeTab === "history" ? "border-b-2 border-indigo-600 font-medium" : "text-slate-500"}`}
                    onClick={() => setActiveTab("history")}
                >
                    Lịch sử thanh toán
                </button>
            </div>

            {/* Summary */}
            {summary && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-2xl bg-white border border-indigo-100 shadow p-4">
                        <div className="text-xs text-slate-500">Tổng giá trị</div>
                        <div className="text-lg font-semibold tabular-nums">{VND(summary.total)} đ</div>
                    </div>
                    <div className="rounded-2xl bg-white border border-indigo-100 shadow p-4">
                        <div className="text-xs text-slate-500">Đã thu</div>
                        <div className="text-lg font-semibold tabular-nums">{VND(summary.paid)} đ</div>
                    </div>
                    <div className="rounded-2xl bg-white border border-indigo-100 shadow p-4">
                        <div className="text-xs text-slate-500">Còn lại</div>
                        <div className="text-lg font-semibold tabular-nums">{VND(summary.remain)} đ</div>
                    </div>

                    {(summary.paidCount != null ||
                        summary.pendingCount != null ||
                        summary.cancelledCount != null ||
                        summary.firstPaymentDate ||
                        summary.lastPaymentDate ||
                        summary.salesName ||
                        summary.customer) && (
                        <div className="sm:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="rounded-2xl bg-white border border-indigo-100 shadow p-3">
                                <div className="text-xs text-slate-500">
                                    {selectedContractId === "ALL" ? "Toàn hệ thống" : "Khách hàng / Phụ trách"}
                                </div>
                                <div className="text-sm">
                                    {selectedContractId === "ALL"
                                        ? "Tất cả hợp đồng"
                                        : (summary.customer || "-") + (summary.salesName ? ` • ${summary.salesName}` : "")}
                                </div>
                            </div>
                            <div className="rounded-2xl bg-white border border-indigo-100 shadow p-3">
                                <div className="text-xs text-slate-500">Số đợt theo trạng thái</div>
                                <div className="text-sm">
                                    {[
                                        summary.paidCount != null ? `Đã thu: ${summary.paidCount}` : null,
                                        summary.pendingCount != null ? `Chờ thu: ${summary.pendingCount}` : null,
                                        summary.cancelledCount != null ? `Huỷ: ${summary.cancelledCount}` : null,
                                    ]
                                        .filter(Boolean)
                                        .join(" • ") || "-"}
                                </div>
                            </div>
                            <div className="rounded-2xl bg-white border border-indigo-100 shadow p-3">
                                <div className="text-xs text-slate-500">Khoảng thời gian thu</div>
                                <div className="text-sm">
                                    {summary.firstPaymentDate && summary.lastPaymentDate
                                        ? `${summary.firstPaymentDate} → ${summary.lastPaymentDate}`
                                        : summary.firstPaymentDate || summary.lastPaymentDate || "-"}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Cards: ĐỢT THANH TOÁN */}
            {activeTab === "payments" && (
                <div className="space-y-4">
                    {loading ? (
                        <div className="bg-white rounded-2xl border border-indigo-100 shadow p-6 text-sm">Đang tải…</div>
                    ) : rows.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-indigo-100 shadow p-6 text-sm">Chưa có dữ liệu</div>
                    ) : (
                        (selectedContractId === "ALL"
                                ? grouped
                                : [
                                    {
                                        id: String(currentContract?.id || "single"),
                                        code: currentContract?.contractCode || currentContract?.code || summary?.code || "—",
                                        customer:
                                            summary?.customer ||
                                            currentContract?.customer?.name ||
                                            currentContract?.customerName ||
                                            "",
                                        items: rows,
                                    },
                                ]
                        ).map((ct) => {
                            // Tính tổng/đã thu theo getActualPaid (sửa case actual=0)
                            const agg = ct.items.reduce(
                                (acc, p) => {
                                    const amt = parseNumberText(p.amount ?? 0);
                                    acc.total += amt;
                                    acc.paid += getActualPaid(p);
                                    const d = p.paymentDate || p.dueDate || p.planDate;
                                    if (d && isValidDate(d)) {
                                        const iso = toISODate(d);
                                        if (!acc.from || iso < acc.from) acc.from = iso;
                                        if (!acc.to || iso > acc.to) acc.to = iso;
                                    }
                                    return acc;
                                },
                                { total: 0, paid: 0, from: null, to: null }
                            );
                            const remain = Math.max(0, agg.total - agg.paid);

                            return (
                                <div key={ct.id} className="bg-white rounded-2xl border border-indigo-100 shadow overflow-hidden">
                                    {/* Card header */}
                                    <div className="p-4 border-b">
                                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                                            <div className="font-semibold">
                                                {ct.code} {ct.customer ? `— ${ct.customer}` : ""}
                                                <span className="ml-2 text-xs text-slate-500">{ct.items?.length || 0} đợt</span>
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 w-full md:w-auto">
                                                <MiniStat title="Tổng" value={`${VND(agg.total)} đ`} />
                                                <MiniStat title="Đã thu" value={`${VND(agg.paid)} đ`} />
                                                <MiniStat title="Còn lại" value={`${VND(remain)} đ`} />
                                                <MiniStat
                                                    title="Khoảng thời gian"
                                                    value={
                                                        agg.from && agg.to
                                                            ? `${fmtDmy(agg.from)} → ${fmtDmy(agg.to)}`
                                                            : agg.from || agg.to
                                                                ? fmtDmy(agg.from || agg.to)
                                                                : "—"
                                                    }
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Card body */}
                                    <div className="overflow-x-auto">
                                        <table className="min-w-[1120px] w-full text-sm table-fixed">
                                            <colgroup>
                                                <col style={{ width: "16%" }} />
                                                <col style={{ width: "14%" }} />
                                                <col style={{ width: "12%" }} />
                                                <col style={{ width: "12%" }} />
                                                <col style={{ width: "18%" }} />
                                                <col style={{ width: "20%" }} />
                                                <col style={{ width: "8%"  }} />
                                            </colgroup>

                                            <thead className="bg-indigo-50 text-slate-600 sticky top-0">
                                            <tr>
                                                <th className="px-4 py-3 text-left">Ngày trả / dự kiến</th>
                                                <th className="px-4 py-3 text-left">Số tiền</th>
                                                <th className="px-4 py-3 text-left">Phương thức</th>
                                                <th className="px-4 py-3 text-left">Trạng thái</th>
                                                <th className="px-4 py-3 text-left">Người xác nhận</th>
                                                <th className="px-4 py-3 text-left">Ghi chú</th>
                                                <th className="px-4 py-3 text-right">Thao tác</th>
                                            </tr>
                                            </thead>

                                            <tbody className="divide-y">
                                            {ct.items.map((p) => {
                                                const method = p.method || p.paymentMethod;
                                                const mLabel = toLabel(METHOD_OPTS, method);
                                                const paid = isPaidLike(p.status ?? p.paymentStatus ?? "", p.isPaid === true);
                                                const sLabel = paid ? "Đã thanh toán" : "Chưa thanh toán";
                                                const dateDisplay = fmtDmy(p.paymentDate ?? p.dueDate ?? p.planDate ?? "-");
                                                const confirmer = p.confirmedByName || p.confirmedBy || "-";

                                                const dueISO = toISODate(p.dueDate || p.planDate);
                                                const todayISO = todayStr();
                                                const isOverdue = !paid && dueISO && dueISO < todayISO;

                                                return (
                                                    <tr key={p.id} className={`hover:bg-indigo-50/40 ${isOverdue ? "bg-rose-50/40" : ""}`}>
                                                        <td className="px-4 py-3 whitespace-nowrap">{dateDisplay}</td>
                                                        <td className="px-4 py-3 tabular-nums whitespace-nowrap">{VND(parseNumberText(p.amount ?? 0))} đ</td>
                                                        <td className="px-4 py-3 whitespace-nowrap">{mLabel || "-"}</td>
                                                        <td className="px-4 py-3 whitespace-nowrap">
                                <span
                                    className={
                                        "px-2 py-0.5 rounded-full text-xs " +
                                        (paid ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")
                                    }
                                >
                                  {sLabel}
                                </span>
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap">{confirmer}</td>
                                                        <td className="px-4 py-3 break-words">{p.note || "-"}</td>
                                                        <td className="px-4 py-3 text-right whitespace-nowrap">
                                                            <div className="inline-flex gap-2">
                                                                {!paid && canMarkPaid && (
                                                                    <button
                                                                        onClick={() => openPaid(p)}
                                                                        className="px-2 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                                                        title="Xác nhận đã thanh toán"
                                                                    >
                                                                        Xác nhận đã thu
                                                                    </button>
                                                                )}
                                                                {!paid && canDelete && (
                                                                    <button
                                                                        onClick={() => removeRow(p)}
                                                                        className="px-2 py-1 rounded bg-rose-50 text-rose-700 hover:bg-rose-100"
                                                                        title="Xóa đợt thanh toán (chỉ khi CHƯA THU)"
                                                                    >
                                                                        Xóa
                                                                    </button>
                                                                )}
                                                                {paid && <span className="text-slate-400">—</span>}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {/* Table: LỊCH SỬ THANH TOÁN */}
            {activeTab === "history" && (
                <div className="bg-white rounded-2xl border border-indigo-100 shadow overflow-hidden">
                    <div className="overflow-auto">
                        {selectedContractId === "ALL" ? (
                            <div className="p-6 text-sm text-slate-600">
                                Chọn <b>một hợp đồng</b> cụ thể để xem lịch sử thanh toán.
                            </div>
                        ) : (
                            <table className="min-w-full text-sm table-fixed">
                                <colgroup>
                                    <col className="w-44" />
                                    <col className="w-40" />
                                    <col className="w-28" />
                                    <col className="w-44" />
                                    <col className="w-36" />
                                    <col className="w-40" />
                                    <col className="w-36" />
                                    <col className="w-36" />
                                    <col />
                                </colgroup>
                                <thead className="bg-indigo-50 text-slate-600">
                                <tr>
                                    <th className="px-4 py-3 text-left">Thời điểm</th>
                                    <th className="px-4 py-3 text-left">Hành động</th>
                                    <th className="px-4 py-3 text-left">Đợt</th>
                                    <th className="px-4 py-3 text-left">Trước → Sau</th>
                                    <th className="px-4 py-3 text-left">Thực thu</th>
                                    <th className="px-4 py-3 text-left">Trạng thái</th>
                                    <th className="px-4 py-3 text-left">Phương thức</th>
                                    <th className="px-4 py-3 text-left">Người thực hiện</th>
                                    <th className="px-4 py-3 text-left">Ghi chú</th>
                                </tr>
                                </thead>
                                <tbody className="divide-y">
                                {loadingHistory ? (
                                    <tr>
                                        <td className="px-4 py-6" colSpan={9}>
                                            Đang tải…
                                        </td>
                                    </tr>
                                ) : historyRows.length === 0 ? (
                                    <tr>
                                        <td className="px-4 py-6" colSpan={9}>
                                            Chưa có lịch sử
                                        </td>
                                    </tr>
                                ) : (
                                    historyRows.map((h) => (
                                        <tr key={h.id} className="hover:bg-indigo-50/40">
                                            <td className="px-4 py-3">
                                                {h.createdAt ? new Date(h.createdAt).toLocaleString("vi-VN") : "-"}
                                            </td>
                                            <td className="px-4 py-3">{h.action}</td>
                                            <td className="px-4 py-3">{h.paymentId || "-"}</td>
                                            <td className="px-4 py-3 tabular-nums">
                                                {VND(parseNumberText(h.amountBefore || 0))} → {VND(parseNumberText(h.amountAfter || 0))}
                                            </td>
                                            <td className="px-4 py-3 tabular-nums">
                                                {h.actualAmount != null ? `${VND(parseNumberText(h.actualAmount))} đ` : "-"}
                                            </td>
                                            <td className="px-4 py-3">
                                                {(h.statusBefore || "-") + " → " + (h.statusAfter || "-")}
                                            </td>
                                            <td className="px-4 py-3">{toLabel(METHOD_OPTS, h.method) || "-"}</td>
                                            <td className="px-4 py-3">{h.actor || "-"}</td>
                                            <td className="px-4 py-3">{h.note || "-"}</td>
                                        </tr>
                                    ))
                                )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}

            {/* Modal tạo đợt */}
            {showCreate && canCreate && (
                <div className="fixed inset-0 z-40 bg-black/40 grid place-items-center p-4">
                    <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl border border-indigo-100">
                        <div className="p-5 border-b flex items-center justify-between">
                            <div className="font-semibold">Thêm đợt thanh toán</div>
                            <button className="text-slate-500 hover:text-slate-700" onClick={() => setShowCreate(false)}>
                                Đóng
                            </button>
                        </div>

                        <form onSubmit={save} className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="text-sm text-slate-600">Hợp đồng</label>
                                <select
                                    required
                                    value={form.contractId}
                                    onChange={(e) => setForm((f) => ({ ...f, contractId: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-lg border border-indigo-100 bg-white shadow"
                                >
                                    {contracts.map((ct) => {
                                        const code = ct.contractCode || ct.code || `HD-${ct.id}`;
                                        const cus = ct.customer?.name || ct.customerName || "";
                                        return (
                                            <option key={ct.id} value={ct.id}>
                                                {code} - {cus}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>

                            <div>
                                <label className="text-sm text-slate-600">Ngày dự kiến thu</label>
                                <input
                                    type="date"
                                    value={form.dueDate}
                                    onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-lg border border-indigo-100 bg-white shadow"
                                />
                            </div>

                            <div>
                                <label className="text-sm text-slate-600">Số tiền (đ)</label>
                                <input
                                    required
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9\.]*"
                                    placeholder="VD: 200.000.000"
                                    value={form.amount}
                                    onChange={(e) =>
                                        setForm((f) => ({
                                            ...f,
                                            amount: e.target.value.replace(/[^\d]/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, "."),
                                        }))
                                    }
                                    className="w-full px-3 py-2 rounded-lg border border-indigo-100 bg-white shadow tabular-nums"
                                />
                            </div>

                            <div>
                                <label className="text-sm text-slate-600">Phương thức</label>
                                <select
                                    value={form.method}
                                    onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-lg border border-indigo-100 bg-white shadow"
                                >
                                    {METHOD_OPTS.map((o) => (
                                        <option key={o.value} value={o.label}>
                                            {o.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="md:col-span-2">
                                <label className="text-sm text-slate-600">Ghi chú</label>
                                <input
                                    placeholder="VD: Thu đợt 1"
                                    value={form.note}
                                    onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-lg border border-indigo-100 bg-white shadow"
                                />
                            </div>

                            <div className="md:col-span-2 flex items-center justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200"
                                    onClick={() => setShowCreate(false)}
                                    disabled={saving}
                                >
                                    Hủy
                                </button>
                                <button
                                    className="px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                                    disabled={saving}
                                >
                                    {saving ? "Đang lưu..." : "Lưu"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal xác nhận đã thu */}
            {showPaid && activeRow && (
                <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4">
                    <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-indigo-100">
                        <div className="p-5 border-b flex items-center justify-between">
                            <div className="font-semibold">Xác nhận đã thu</div>
                            <button className="text-slate-500 hover:text-slate-700" onClick={() => setShowPaid(false)}>
                                Đóng
                            </button>
                        </div>

                        <form onSubmit={doMarkPaid} className="p-5 space-y-3">
                            <div>
                                <label className="text-sm text-slate-600">Số tiền THỰC THU (đ)</label>
                                <input
                                    value={paidForm.amountText}
                                    readOnly
                                    className="w-full px-3 py-2 rounded-lg border border-indigo-100 bg-slate-50 shadow tabular-nums"
                                />
                                <div className="text-xs text-slate-500 mt-1">
                                    * Hệ thống sẽ ghi nhận số tiền hiển thị này làm thực thu (không cần nhập).
                                </div>
                            </div>

                            <div>
                                <label className="text-sm text-slate-600">Ngày thu</label>
                                <input
                                    type="date"
                                    value={paidForm.paidDate}
                                    onChange={(e) => setPaidForm((f) => ({ ...f, paidDate: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-lg border border-indigo-100 bg-white shadow"
                                />
                            </div>

                            <div>
                                <label className="text-sm text-slate-600">Phương thức</label>
                                <select
                                    value={paidForm.method}
                                    onChange={(e) => setPaidForm((f) => ({ ...f, method: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-lg border border-indigo-100 bg-white shadow"
                                >
                                    {METHOD_OPTS.map((o) => (
                                        <option key={o.value} value={o.label}>
                                            {o.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-sm text-slate-600">Ghi chú</label>
                                <input
                                    placeholder="VD: Thu đủ đợt 2"
                                    value={paidForm.note}
                                    onChange={(e) => setPaidForm((f) => ({ ...f, note: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-lg border border-indigo-100 bg-white shadow"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-1">
                                <button
                                    type="button"
                                    className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200"
                                    onClick={() => setShowPaid(false)}
                                    disabled={paying}
                                >
                                    Hủy
                                </button>
                                <button
                                    className="px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                                    disabled={paying}
                                >
                                    {paying ? "Đang cập nhật..." : "Xác nhận đã thu"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ===== Small UI bits ===== */
function MiniStat({ title, value }) {
    return (
        <div className="bg-indigo-50 rounded-lg px-3 py-2">
            <div className="text-[11px] text-slate-500">{title}</div>
            <div className="text-sm font-medium">{value}</div>
        </div>
    );
}
