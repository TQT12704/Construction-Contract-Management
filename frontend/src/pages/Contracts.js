import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import { useAuth } from "../AuthContext";

/** ====== Helpers ====== **/
const TYPE_MAP = [
    { label: "Thi công", value: "CONSTRUCTION" },
    { label: "Dịch vụ", value: "SERVICE" },
];

// Việt hoá chuẩn: PENDING ≠ ACTIVE
const STATUS_MAP = [
    { label: "Chưa thực hiện", value: "PENDING" },
    { label: "Đang thực hiện", value: "ACTIVE" },
    { label: "Hoàn tất", value: "COMPLETED" },
    { label: "Hủy", value: "CANCELLED" },
];

const findLabel = (list, v) => list.find((x) => x.value === v)?.label || v || "-";
const fmtMoney = (n) => (n ?? 0).toLocaleString("vi-VN", { maximumFractionDigits: 0 });
const parseMoney = (s) => {
    if (typeof s === "number") return s;
    if (!s) return 0;
    const digits = String(s).replace(/[^\d]/g, "");
    return Number(digits || 0);
};
const pad2 = (n) => String(n).padStart(2, "0");
const fmtHuman = (d) => {
    if (!d) return "-";
    const x = new Date(d);
    if (isNaN(x)) return d;
    return `${pad2(x.getDate())}/${pad2(x.getMonth() + 1)}/${x.getFullYear()}`;
};
const toISO = (d) => {
    if (!d) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
    const m = String(d).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (m) return `${m[3]}-${m[2]}-${m[1]}`;
    try {
        const dt = new Date(d);
        if (!isNaN(dt)) return dt.toISOString().slice(0, 10);
    } catch {}
    return "";
};
const toISODateOnly = (d) => new Date(d).setHours(0, 0, 0, 0);
const daysDiffFromToday = (d) => {
    if (!d) return null;
    const today = toISODateOnly(new Date());
    const dd = toISODateOnly(d);
    return Math.round((dd - today) / (1000 * 60 * 60 * 24));
};

function useDebounce(v, delay = 450) {
    const [val, setVal] = useState(v);
    useEffect(() => {
        const t = setTimeout(() => setVal(v), delay);
        return () => clearTimeout(t);
    }, [v, delay]);
    return val;
}

const hasRole = (user, roles) => {
    const S = new Set();
    const add = (x) => {
        if (!x) return;
        if (Array.isArray(x)) return x.forEach(add);
        if (typeof x === "string") return S.add(x.toUpperCase());
        if (typeof x === "object") {
            ["role", "name", "authority", "code"].forEach((k) => x[k] && S.add(String(x[k]).toUpperCase()));
            ["roles", "authorities"].forEach((k) => add(x[k]));
        }
    };
    add(user?.role);
    add(user?.roles);
    add(user?.authorities);
    return roles.some((r) => S.has(r));
};

// ✅ lọc user SALE
function isSaleUser(u) {
    const bag = new Set();
    const add = (x) => {
        if (!x) return;
        if (Array.isArray(x)) return x.forEach(add);
        if (typeof x === "string") return bag.add(x.toUpperCase());
        if (typeof x === "object") {
            ["role", "name", "authority", "code"].forEach((k) => x[k] && bag.add(String(x[k]).toUpperCase()));
            ["roles", "authorities"].forEach((k) => add(x[k]));
        }
    };
    add(u?.roles);
    add(u?.authorities);
    add(u?.role);
    for (const v of bag) if (v.includes("SALE")) return true;
    return false;
}

// Badge trạng thái
const statusBadgeClass = (v) => {
    const s = String(v || "").toUpperCase();
    if (s === "COMPLETED") return "bg-emerald-100 text-emerald-700";
    if (s === "CANCELLED") return "bg-rose-100 text-rose-700";
    // PENDING / ACTIVE / mặc định
    return "bg-amber-100 text-amber-700";
};

// Ưu tiên trạng thái: ACTIVE → PENDING → CANCELLED → COMPLETED
const statusOrder = (s) => {
    const k = String(s || "").toUpperCase();
    if (k === "ACTIVE") return 0;
    if (k === "PENDING") return 1;
    if (k === "CANCELLED") return 2;
    if (k === "COMPLETED") return 3;
    return 99;
};

/** ====== Page ====== **/
export default function Contracts() {
    const { user } = useAuth();
    const canEdit = hasRole(user, ["ADMIN"]);

    const [rows, setRows] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [q, setQ] = useState("");
    const dq = useDebounce(q);
    const [type, setType] = useState("");
    const [status, setStatus] = useState("");
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");

    // View
    const [viewMode, setViewMode] = useState("cards"); // 'cards' | 'list'
    const [cardSize, setCardSize] = useState("md"); // 'lg' | 'md' | 'sm'

    // Modal HĐ
    const [show, setShow] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({
        contractCode: "",
        title: "",
        customerId: "",
        salesId: "",
        totalAmount: "",
        signedDate: "",
        dueDate: "",
        contractType: "CONSTRUCTION",
        status: "PENDING",
        note: "",
    });

    // Chia đợt
    const [splitsOpen, setSplitsOpen] = useState(false);
    const [installments, setInstallments] = useState([]); // [{no, amount, planDate, note}]

    // Phụ lục
    const [appendixOpen, setAppendixOpen] = useState(false);
    const [appendixSaving, setAppendixSaving] = useState(false);
    const [appendixContract, setAppendixContract] = useState(null);
    const [appendixForm, setAppendixForm] = useState({ title: "", note: "" });

    // ====== Extra info per contract (đợt & kỳ hạn) ======
    // cardExtra[contractId] = { countPaid, countUnpaid, nextDueStr, isOverdue }
    const [cardExtra, setCardExtra] = useState({});

    useEffect(() => {
        loadAll();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dq, type, status, from, to]);

    useEffect(() => {
        loadSales();
    }, []);

    async function loadAll() {
        setLoading(true);
        const params = {
            q: dq || undefined,
            type: type || undefined,
            status: status || undefined,
            from: toISO(from) || undefined,
            to: toISO(to) || undefined,
            page: 0,
            size: 50,
            // sort server-side vẫn để id desc; client sẽ sort lại theo trạng thái + hạn
            sort: "id,desc",
        };

        const [contractsRes, customersRes] = await Promise.allSettled([
            api.get("/api/contracts", { params }),
            api.get("/api/customers", { params: { page: 0, size: 100, sort: "name,asc" } }),
        ]);

        if (contractsRes.status === "fulfilled") {
            const data = contractsRes.value?.data;
            const list = Array.isArray(data) ? data : data?.content || [];
            const mapped = list.map((x) => ({
                id: x.id,
                contractCode: x.contractCode,
                title: x.title,
                contractType: x.contractType,
                customerId: x.customerId,
                customerName: x.customerName,
                salesId: x.salesId || x.saleId || x.sales?.id || x.sale?.id,
                salesName:
                    x.salesName ||
                    x.saleName ||
                    x.sales?.fullName ||
                    x.sales?.name ||
                    x.sales?.username ||
                    x.sale?.fullName ||
                    x.sale?.name ||
                    x.sale?.username ||
                    "",
                signedDate: x.signedDate,
                dueDate: x.dueDate,
                totalAmount: x.totalAmount,
                paidAmount: x.paidAmount,
                remainingAmount: x.remainingAmount,
                status: x.status,
                note: x.note || "",
            }));

            // ✅ SẮP XẾP CLIENT: ACTIVE → PENDING → CANCELLED → COMPLETED,
            // sau đó ưu tiên dueDate gần nhất rồi mới id giảm dần.
            const sorted = [...mapped].sort((a, b) => {
                const sa = statusOrder(a.status), sb = statusOrder(b.status);
                if (sa !== sb) return sa - sb;
                const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
                const db = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
                if (da !== db) return da - db;
                return (b.id ?? 0) - (a.id ?? 0);
            });

            setRows(sorted);

            // tải thông tin extra cho cards
            loadExtrasForContracts(sorted).catch(() => {});
        } else {
            console.warn("Contracts load failed:", contractsRes.reason);
            setRows([]);
            setCardExtra({});
        }

        if (customersRes.status === "fulfilled") {
            const data = customersRes.value?.data;
            const custList = Array.isArray(data) ? data : data?.content || [];
            setCustomers(custList.map((c) => ({ id: c.id, name: c.name })));
        } else {
            console.warn("Customers load failed:", customersRes.reason);
        }

        setLoading(false);
    }

    async function loadSales() {
        try {
            const tries = [
                { url: "/api/users", params: { page: 0, size: 1000, sort: "id,asc" } },
                { url: "/api/users", params: { role: "SALES", page: 0, size: 1000 } },
                { url: "/api/users/sales", params: {} },
            ];
            let users = [];
            for (const t of tries) {
                try {
                    const { data } = await api.get(t.url, { params: t.params });
                    users = Array.isArray(data) ? data : data?.content || [];
                    if (users.length) break;
                } catch {}
            }
            const saleUsers = users.filter(isSaleUser);
            setSales(
                saleUsers.map((u) => ({
                    id: u.id,
                    name: u.fullName || u.name || u.username || `User #${u.id}`,
                })),
            );
        } catch (e) {
            console.warn("Không lấy được danh sách SALE:", e);
            setSales([]);
        }
    }

    // ====== Extras loader (ROBUST) ======
    async function loadExtrasForContracts(contractList) {
        if (!Array.isArray(contractList) || contractList.length === 0) {
            setCardExtra({});
            return;
        }

        // thử nhiều URL và trả về cái đầu tiên chạy được
        async function fetchFirst(urls) {
            for (const u of urls) {
                try {
                    const { data } = await api.get(u.url, { params: u.params });
                    return data;
                } catch (_) {}
            }
            return null;
        }

        const concurrency = 6; // giới hạn để không spam server
        const chunks = [];
        for (let i = 0; i < contractList.length; i += concurrency) {
            chunks.push(contractList.slice(i, i + concurrency));
        }

        const today0 = new Date(); today0.setHours(0, 0, 0, 0);
        const toDateOnly = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };

        const isPaidLike = (r) => {
            const s = String(r?.status || "").toUpperCase();
            if (s === "PAID" || s === "DONE") return true;
            const amt = Number(r?.amount ?? r?.plannedAmount ?? r?.value ?? 0);
            const paid = Number(r?.paidAmount ?? r?.receivedAmount ?? 0);
            return Number.isFinite(amt) && Number.isFinite(paid) && paid >= amt && amt > 0;
        };

        const nextState = {};

        for (const group of chunks) {
            await Promise.all(
                group.map(async (c) => {
                    try {
                        // 1) lấy list đợt từ 1 trong các route có thể có
                        const listData = await fetchFirst([
                            { url: `/api/payments/by-contract/${c.id}` },
                            { url: `/api/contracts/${c.id}/payments` },
                            { url: `/api/payments`, params: { contractId: c.id, size: 1000, sort: "installmentNo,asc" } },
                        ]);
                        const rows = Array.isArray(listData) ? listData : (listData?.content || []);

                        // 2) tự tính countPaid/countUnpaid
                        let countPaid = 0;
                        let countUnpaid = 0;
                        for (const r of rows) {
                            if (isPaidLike(r)) countPaid++;
                            else countUnpaid++;
                        }

                        // 3) kỳ chưa trả đến hạn gần nhất
                        const unpaidRows = rows.filter((r) => !isPaidLike(r));
                        unpaidRows.sort((a, b) => {
                            const da = new Date(a.planDate || a.dueDate || a.paymentDate || 8640000000000000);
                            const db = new Date(b.planDate || b.dueDate || b.paymentDate || 8640000000000000);
                            return da - db;
                        });
                        const next = unpaidRows[0];
                        const nextDateRaw = next ? (next.planDate || next.dueDate || next.paymentDate) : null;
                        const nextDueStr = nextDateRaw ? fmtHuman(nextDateRaw) : "-";
                        const isOverdue = !!nextDateRaw && toDateOnly(nextDateRaw) < today0;

                        // 4) nếu có overview thì ghi đè (ưu tiên số liệu server)
                        try {
                            const ov = await api.get(`/api/payments/overview`, { params: { contractId: c.id } });
                            const p = Number(ov?.data?.countPaid);
                            const u = Number(ov?.data?.countUnpaid);
                            if (Number.isFinite(p)) countPaid = p;
                            if (Number.isFinite(u)) countUnpaid = u;
                        } catch (_) {}

                        if (!Number.isFinite(countPaid)) countPaid = 0;
                        if (!Number.isFinite(countUnpaid)) countUnpaid = 0;

                        nextState[c.id] = { countPaid, countUnpaid, nextDueStr, isOverdue };
                    } catch (e) {
                        nextState[c.id] = { countPaid: 0, countUnpaid: 0, nextDueStr: "-", isOverdue: false };
                    }
                }),
            );
        }

        setCardExtra((prev) => ({ ...prev, ...nextState }));
    }

    function openCreate() {
        setEditing(null);
        setForm({
            contractCode: autoCode(),
            title: "",
            customerId: "",
            salesId: "",
            totalAmount: "",
            signedDate: todayStr(),
            dueDate: "",
            contractType: "CONSTRUCTION",
            status: "PENDING",
            note: "",
        });
        setSplitsOpen(false);
        setInstallments([]);
        setShow(true);
    }

    function openEdit(row) {
        setEditing(row);
        setForm({
            contractCode: row.contractCode || "",
            title: row.title || "",
            customerId: row.customerId || "",
            salesId: row.salesId ? String(row.salesId) : "",
            totalAmount: fmtMoney(row.totalAmount || 0),
            signedDate: toISO(row.signedDate) || "",
            dueDate: toISO(row.dueDate) || "",
            contractType: row.contractType || "CONSTRUCTION",
            status: row.status || "PENDING",
            note: row.note || "",
        });
        setSplitsOpen(false);
        setInstallments([]);
        setShow(true);
    }

    function clean(obj) {
        const out = {};
        for (const [k, v] of Object.entries(obj)) {
            if (v !== undefined) out[k] = v;
        }
        return out;
    }

    function spreadEven(total, n) {
        const t = parseMoney(total);
        const base = Math.floor(t / n);
        const arr = Array(n).fill(base);
        let rem = t - base * n;
        for (let i = 0; i < n && rem > 0; i++, rem--) arr[i] += 1;
        return arr;
    }

    // ====== tiện ích cho đợt thanh toán (NEW) ======
    function addInstallment() {
        const n = installments.length + 1;
        const today = todayStr();
        setInstallments((arr) => [...arr, { no: n, amount: fmtMoney(0), planDate: today, note: "" }]);
    }
    function removeInstallment(idx) {
        setInstallments((arr) => arr.filter((_, i) => i !== idx).map((x, i) => ({ ...x, no: i + 1 })));
    }
    function updateInstallment(idx, patch) {
        setInstallments((arr) => arr.map((x, i) => (i === idx ? { ...x, ...patch } : x)));
    }
    function evenSplit() {
        const n = Math.max(1, installments.length || 2);
        const amounts = spreadEven(form.totalAmount, n);
        const today = todayStr();
        const out = Array.from({ length: n }).map((_, i) => ({
            no: i + 1,
            amount: fmtMoney(amounts[i]),
            planDate: installments[i]?.planDate || today,
            note: installments[i]?.note || "",
        }));
        setInstallments(out);
    }

    async function save(e) {
        e.preventDefault();
        try {
            const saleIdNum = form.salesId ? Number(form.salesId) : undefined;

            if (editing) {
                // UPDATE
                const payloadRaw = {
                    contractCode: form.contractCode?.trim() || null,
                    title: form.title?.trim() || null,
                    contractType: form.contractType || null,
                    signedDate: toISO(form.signedDate) || null,
                    dueDate: toISO(form.dueDate) || null,
                    totalAmount: parseMoney(form.totalAmount),
                    status: form.status || null,
                    salesId: saleIdNum,
                    saleId: saleIdNum,
                    note: form.note?.trim() || null,
                };
                const payload = clean(payloadRaw);

                try {
                    await api.patch(`/api/contracts/${editing.id}`, payload);
                } catch {
                    await api.put(`/api/contracts/${editing.id}`, payload);
                }
            } else {
                // CREATE (1)
                const saleIdNum2 = form.salesId ? Number(form.salesId) : undefined;
                const payloadCreate = clean({
                    contractCode: form.contractCode?.trim() || undefined,
                    title: form.title?.trim(),
                    contractType: form.contractType,
                    customerId: Number(form.customerId),
                    signedDate: toISO(form.signedDate) || null,
                    dueDate: toISO(form.dueDate) || null,
                    totalAmount: parseMoney(form.totalAmount),
                    salesId: saleIdNum2,
                    saleId: saleIdNum2,
                    note: form.note?.trim() || null,
                });

                const res = await api.post("/api/contracts", payloadCreate);
                const newId = res?.data?.id ?? res?.data;

                // (2) bulk installments nếu có
                if (splitsOpen && installments.length && newId) {
                    const bulkBody = {
                        items: installments.map((it) => ({
                            installmentNo: it.no,
                            amount: parseMoney(it.amount),
                            planDate: toISO(it.planDate) || null,
                            note: it.note?.trim() || null,
                        })),
                    };
                    await api.post(`/api/contracts/${newId}/payments/bulk`, bulkBody);
                }
            }

            setShow(false);
            await loadAll();
        } catch (err) {
            console.error("Save contract error:", err?.response || err);
            const data = err?.response?.data;
            let msg =
                data?.message ||
                data?.error ||
                (typeof data === "string" ? data : "") ||
                "Lưu hợp đồng thất bại";
            try {
                if (!msg && data) msg = JSON.stringify(data);
            } catch {}
            alert(msg);
        }
    }

    async function remove(row) {
        if (!window.confirm(`Xóa hợp đồng ${row.contractCode}?`)) return;
        try {
            await api.delete(`/api/contracts/${row.id}`);
            await loadAll();
        } catch (err) {
            const res = err?.response;
            const data = res?.data;
            const msg =
                data?.message ||
                data?.error ||
                (typeof data === "string" ? data : "") ||
                `Xóa hợp đồng thất bại (HTTP ${res?.status || "?"})`;
            console.error("Delete contract error:", res || err);
            alert(msg);
        }
    }

    /** ====== Appendix (phụ lục) ====== **/
    function openAppendix(c) {
        setAppendixContract(c);
        setAppendixForm({ title: "", note: "" });
        setAppendixOpen(true);
    }
    async function saveAppendix(e) {
        e.preventDefault();
        if (!appendixContract?.id) return;
        setAppendixSaving(true);
        try {
            await api.post(`/api/contracts/${appendixContract.id}/appendices`, {
                title: appendixForm.title?.trim(),
                note: appendixForm.note?.trim() || null,
            });
            setAppendixOpen(false);
            alert("Đã tạo phụ lục cho hợp đồng");
        } catch (err) {
            alert(err?.response?.data?.message || "Tạo phụ lục thất bại (cần API: POST /api/contracts/{id}/appendices)");
        } finally {
            setAppendixSaving(false);
        }
    }

    const customerOptions = useMemo(
        () => customers.map((c) => ({ value: String(c.id), label: c.name })),
        [customers],
    );
    const salesOptions = useMemo(
        () => sales.map((s) => ({ value: String(s.id), label: s.name })),
        [sales],
    );

    // responsive cho Cards
    const gridCols = useMemo(() => {
        if (cardSize === "lg") return "grid-cols-1 xl:grid-cols-2";
        if (cardSize === "sm") return "grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4";
        return "grid-cols-1 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3";
    }, [cardSize]);
    const cardPad = cardSize === "lg" ? "p-6" : cardSize === "sm" ? "p-4" : "p-5";

    return (
        <div className="space-y-8">
            {/* Header + Filters */}
            <div className="flex flex-col gap-3 md:gap-4">
                <div>
                    <h2 className="text-lg font-semibold text-slate-900">Hợp đồng</h2>
                    <p className="text-sm text-slate-500">Tìm kiếm, lọc và quản lý hợp đồng.</p>
                </div>

                <div className="flex flex-wrap items-end gap-2">
                    <div className="flex flex-col">
                        <label className="text-xs text-slate-500 mb-1">Tìm kiếm</label>
                        <input
                            className="w-72 md:w-80 px-3 py-2 rounded-lg border border-indigo-100 bg-white shadow"
                            placeholder="Mã/tiêu đề/KH/NVKD…"
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                        />
                    </div>

                    <div className="flex flex-col">
                        <label className="text-xs text-slate-500 mb-1">Loại HĐ</label>
                        <select
                            className="px-3 py-2 rounded-lg border border-indigo-100 bg-white shadow"
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                        >
                            <option value="">Tất cả</option>
                            {TYPE_MAP.map((t) => (
                                <option key={t.value} value={t.value}>
                                    {t.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex flex-col">
                        <label className="text-xs text-slate-500 mb-1">Trạng thái</label>
                        <select
                            className="px-3 py-2 rounded-lg border border-indigo-100 bg-white shadow"
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                        >
                            <option value="">Tất cả</option>
                            {STATUS_MAP.map((s) => (
                                <option key={s.value} value={s.value}>
                                    {s.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex flex-col">
                        <label className="text-xs text-slate-500 mb-1">Từ ngày</label>
                        <input
                            type="date"
                            className="px-3 py-2 rounded-lg border border-indigo-100 bg-white shadow"
                            value={from}
                            onChange={(e) => setFrom(e.target.value)}
                        />
                    </div>

                    <div className="flex flex-col">
                        <label className="text-xs text-slate-500 mb-1">Đến ngày</label>
                        <input
                            type="date"
                            className="px-3 py-2 rounded-lg border border-indigo-100 bg-white shadow"
                            value={to}
                            onChange={(e) => setTo(e.target.value)}
                        />
                    </div>

                    <div className="flex flex-col">
                        <label className="text-xs text-slate-500 mb-1">Hiển thị</label>
                        <div className="flex gap-2">
                            <select
                                className="px-3 py-2 rounded-lg border border-indigo-100 bg-white shadow"
                                value={viewMode}
                                onChange={(e) => setViewMode(e.target.value)}
                                title="Kiểu hiển thị"
                            >
                                <option value="cards">Cards</option>
                                <option value="list">List</option>
                            </select>
                            <select
                                className="px-3 py-2 rounded-lg border border-indigo-100 bg-white shadow"
                                value={cardSize}
                                onChange={(e) => setCardSize(e.target.value)}
                                title="Độ rộng thẻ"
                            >
                                <option value="lg">Rộng</option>
                                <option value="md">Vừa</option>
                                <option value="sm">Gọn</option>
                            </select>
                        </div>
                    </div>

                    {canEdit && (
                        <button
                            onClick={openCreate}
                            className="ml-auto px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                        >
                            Thêm hợp đồng
                        </button>
                    )}
                </div>
            </div>

            {/* Cards / List */}
            {viewMode === "cards" ? (
                <div className={`grid ${gridCols} gap-8`}>
                    {loading ? (
                        <div className="col-span-full text-slate-500">Đang tải…</div>
                    ) : rows.length === 0 ? (
                        <div className="col-span-full text-slate-500">Không có hợp đồng phù hợp</div>
                    ) : (
                        rows.map((c) => {
                            const code = c.contractCode || "(Không mã)";
                            const remain = c.remainingAmount ?? Math.max(0, (c.totalAmount || 0) - (c.paidAmount || 0));
                            const extra = cardExtra[c.id] || {};

                            // Badge hạn HĐ — chỉ hiện với ACTIVE
                            let dueBadge = null;
                            const statusUp = String(c.status || "").toUpperCase();
                            if (statusUp === "ACTIVE" && c.dueDate) {
                                const d = daysDiffFromToday(c.dueDate);
                                if (d < 0) {
                                    dueBadge = (
                                        <span className="px-2 py-0.5 rounded-full text-[11px] bg-rose-100 text-rose-700">
                      Quá hạn {Math.abs(d)} ngày
                    </span>
                                    );
                                } else if (d === 0) {
                                    dueBadge = (
                                        <span className="px-2 py-0.5 rounded-full text-[11px] bg-amber-100 text-amber-700">
                      Hết hạn hôm nay
                    </span>
                                    );
                                } else {
                                    dueBadge = (
                                        <span className="px-2 py-0.5 rounded-full text-[11px] bg-emerald-100 text-emerald-700">
                      Còn {d} ngày
                    </span>
                                    );
                                }
                            }

                            return (
                                <div
                                    key={c.id}
                                    className={`rounded-3xl border border-indigo-100 bg-white ${cardPad} shadow-md hover:shadow-lg transition h-full flex flex-col`}
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="text-lg md:text-xl font-semibold text-slate-900 truncate">
                                            {code}
                                        </div>
                                        <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${statusBadgeClass(c.status)}`}>
                      {findLabel(STATUS_MAP, c.status)}
                    </span>
                                    </div>

                                    <div className="mt-2 text-base text-slate-600">{c.title || "—"}</div>
                                    <div className="mt-1 text-sm text-slate-500">
                                        {findLabel(TYPE_MAP, c.contractType)} • Kh: {c.customerName || "—"}
                                        {c.salesName ? <> • Sale: {c.salesName}</> : null}
                                    </div>
                                    {c.note ? <div className="mt-1 text-sm text-slate-500">Ghi chú: {c.note}</div> : null}

                                    {/* === HÀNG THÔNG TIN NGÀY === */}
                                    <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <div className="rounded-xl bg-slate-50 px-4 py-3">
                                            <div className="text-xs text-slate-500">Ngày ký</div>
                                            <div className="font-medium">{fmtHuman(c.signedDate)}</div>
                                        </div>

                                        <div className="rounded-xl bg-slate-50 px-4 py-3">
                                            <div className="flex items-center justify-between">
                                                <div className="text-xs text-slate-500">Hết hạn HĐ</div>
                                                {dueBadge}
                                            </div>
                                            <div className="font-medium">{fmtHuman(c.dueDate)}</div>
                                        </div>

                                        <div className="rounded-xl bg-slate-50 px-4 py-3">
                                            <div className="flex items-center justify-between">
                                                <div className="text-xs text-slate-500">Kỳ thanh toán tiếp theo</div>
                                                {extra.isOverdue && (
                                                    <span className="px-2 py-0.5 rounded-full text-[11px] bg-rose-100 text-rose-700">
                            Quá hạn
                          </span>
                                                )}
                                            </div>
                                            <div className="font-medium">{extra.nextDueStr || "-"}</div>
                                        </div>
                                    </div>

                                    {/* Hàng số tiền */}
                                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <div className="rounded-xl bg-slate-50 px-4 py-3">
                                            <div className="text-xs text-slate-500">Giá trị</div>
                                            <div className="font-semibold tabular-nums tracking-tight text-base whitespace-nowrap">
                                                {fmtMoney(c.totalAmount)} đ
                                            </div>
                                        </div>
                                        <div className="rounded-xl bg-slate-50 px-4 py-3">
                                            <div className="text-xs text-slate-500">Đã thu</div>
                                            <div className="font-semibold tabular-nums tracking-tight text-base whitespace-nowrap">
                                                {fmtMoney(c.paidAmount)} đ
                                            </div>
                                        </div>
                                        <div className="rounded-xl bg-slate-50 px-4 py-3">
                                            <div className="text-xs text-slate-500">Còn lại</div>
                                            <div className="font-semibold tabular-nums tracking-tight text-base whitespace-nowrap">
                                                {fmtMoney(remain)} đ
                                            </div>
                                        </div>
                                    </div>

                                    {/* Hàng THÔNG TIN NGOÀI HỢP ĐỒNG: đợt & kỳ đến hạn */}
                                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="rounded-xl bg-slate-50 px-4 py-3">
                                            <div className="text-xs text-slate-500">Đợt thanh toán</div>
                                            <div className="font-medium">
                                                {(extra.countPaid ?? 0)} / {(extra.countPaid ?? 0) + (extra.countUnpaid ?? 0)}
                                            </div>
                                        </div>
                                        <div className="rounded-xl bg-slate-50 px-4 py-3 hidden sm:block" />
                                    </div>

                                    <div className="mt-5 flex-1" />
                                    <div className="mt-3 flex justify-end gap-2">
                                        <Link
                                            to={`/contracts/${c.id}`}
                                            className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                                            title="Xem chi tiết hợp đồng"
                                        >
                                            Xem chi tiết
                                        </Link>
                                        <button
                                            onClick={() => openAppendix(c)}
                                            className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                            title="Tạo phụ lục"
                                        >
                                            Tạo phụ lục
                                        </button>
                                        {canEdit && String(c.status).toUpperCase() !== "COMPLETED" && (
                                            <>
                                                <button
                                                    onClick={() => openEdit(c)}
                                                    className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                                                >
                                                    Sửa
                                                </button>
                                                <button
                                                    onClick={() => remove(c)}
                                                    className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100"
                                                >
                                                    Xóa
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-indigo-100 shadow overflow-hidden">
                    <div className="overflow-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-indigo-50 text-slate-600">
                            <tr>
                                <th className="px-4 py-3 text-left">Mã HĐ</th>
                                <th className="px-4 py-3 text-left">Tiêu đề</th>
                                <th className="px-4 py-3 text-left">KH</th>
                                <th className="px-4 py-3 text-left">Sale</th>
                                <th className="px-4 py-3 text-left">Loại</th>
                                <th className="px-4 py-3 text-left">Trạng thái</th>
                                <th className="px-4 py-3 text-left">Giá trị</th>
                                <th className="px-4 py-3 text-left">Đã thu</th>
                                <th className="px-4 py-3 text-left">Còn lại</th>
                                <th className="px-4 py-3 text-left">Ghi chú</th>
                                <th className="px-4 py-3 text-right">Thao tác</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y">
                            {loading ? (
                                <tr>
                                    <td className="px-4 py-6" colSpan={11}>
                                        Đang tải…
                                    </td>
                                </tr>
                            ) : rows.length === 0 ? (
                                <tr>
                                    <td className="px-4 py-6" colSpan={11}>
                                        Không có hợp đồng phù hợp
                                    </td>
                                </tr>
                            ) : (
                                rows.map((c) => {
                                    const code = c.contractCode || "(Không mã)";
                                    const remain =
                                        c.remainingAmount ?? Math.max(0, (c.totalAmount || 0) - (c.paidAmount || 0));
                                    return (
                                        <tr key={c.id} className="hover:bg-indigo-50/40">
                                            <td className="px-4 py-3 font-medium">{code}</td>
                                            <td className="px-4 py-3">{c.title || "-"}</td>
                                            <td className="px-4 py-3">{c.customerName || "-"}</td>
                                            <td className="px-4 py-3">{c.salesName || "-"}</td>
                                            <td className="px-4 py-3">{findLabel(TYPE_MAP, c.contractType)}</td>
                                            <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs ${statusBadgeClass(c.status)}`}>
                            {findLabel(STATUS_MAP, c.status)}
                          </span>
                                            </td>
                                            <td className="px-4 py-3 tabular-nums">{fmtMoney(c.totalAmount)} đ</td>
                                            <td className="px-4 py-3 tabular-nums">{fmtMoney(c.paidAmount)} đ</td>
                                            <td className="px-4 py-3 tabular-nums">{fmtMoney(remain)} đ</td>
                                            <td className="px-4 py-3">{c.note || "-"}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex justify-end gap-2">
                                                    <Link
                                                        to={`/contracts/${c.id}`}
                                                        className="px-2 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700"
                                                    >
                                                        Xem
                                                    </Link>
                                                    <button
                                                        onClick={() => openAppendix(c)}
                                                        className="px-2 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                                    >
                                                        Phụ lục
                                                    </button>
                                                    {canEdit && String(c.status).toUpperCase() !== "COMPLETED" && (
                                                        <>
                                                            <button
                                                                onClick={() => openEdit(c)}
                                                                className="px-2 py-1 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                                                            >
                                                                Sửa
                                                            </button>
                                                            <button
                                                                onClick={() => remove(c)}
                                                                className="px-2 py-1 rounded bg-rose-50 text-rose-700 hover:bg-rose-100"
                                                            >
                                                                Xóa
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal tạo/sửa hợp đồng */}
            {show && (
                <div className="fixed inset-0 z-40 bg-black/40 p-4 md:p-6">
                    <div className="mx-auto w-full max-w-4xl rounded-3xl bg-white shadow-2xl border border-indigo-100
                          max-h-[90vh] flex flex-col overflow-hidden">
                        {/* Header sticky */}
                        <div className="p-4 md:p-5 border-b sticky top-0 bg-white z-10 flex items-center justify-between">
                            <div className="text-base md:text-lg font-semibold">{editing ? "Sửa hợp đồng" : "Thêm hợp đồng"}</div>
                            <button className="text-slate-500 hover:text-slate-700" onClick={() => setShow(false)}>
                                Đóng
                            </button>
                        </div>

                        {/* Body scroll */}
                        <div className="flex-1 overflow-y-auto px-4 md:px-5 pb-4 md:pb-5">
                            <form onSubmit={save} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm text-slate-600">Mã hợp đồng</label>
                                    <input
                                        value={form.contractCode}
                                        onChange={(e) => setForm((f) => ({ ...f, contractCode: e.target.value }))}
                                        className="w-full px-4 py-2.5 rounded-xl border border-indigo-100 bg-white shadow-sm"
                                        placeholder="VD: HD-20250828-9154"
                                    />
                                </div>

                                {!editing && (
                                    <div>
                                        <label className="text-sm text-slate-600">Khách hàng</label>
                                        <select
                                            value={form.customerId}
                                            onChange={(e) => setForm((f) => ({ ...f, customerId: e.target.value }))}
                                            className="w-full px-4 py-2.5 rounded-xl border border-indigo-100 bg-white shadow-sm"
                                            required
                                        >
                                            <option value="">— Chọn khách hàng —</option>
                                            {customerOptions.map((opt) => (
                                                <option key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <div>
                                    <label className="text-sm text-slate-600">Phụ trách (Sale)</label>
                                    <select
                                        value={form.salesId}
                                        onChange={(e) => setForm((f) => ({ ...f, salesId: e.target.value }))}
                                        className="w-full px-4 py-2.5 rounded-xl border border-indigo-100 bg-white shadow-sm"
                                    >
                                        <option value="">— Chọn sale —</option>
                                        {salesOptions.map((opt) => (
                                            <option key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="text-sm text-slate-600">Tiêu đề</label>
                                    <input
                                        value={form.title}
                                        onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                                        className="w-full px-4 py-2.5 rounded-xl border border-indigo-100 bg-white shadow-sm"
                                        placeholder="VD: Thi công nhà xưởng B - Phase 2"
                                    />
                                </div>

                                <div>
                                    <label className="text-sm text-slate-600">Giá trị (đ)</label>
                                    <input
                                        inputMode="numeric"
                                        value={form.totalAmount}
                                        onChange={(e) =>
                                            setForm((f) => ({
                                                ...f,
                                                totalAmount: fmtMoney(parseMoney(e.target.value)),
                                            }))
                                        }
                                        className="w-full px-4 py-2.5 rounded-xl border border-indigo-100 bg-white shadow-sm tabular-nums"
                                        placeholder="VD: 2.000.000.000"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="text-sm text-slate-600">Ngày ký</label>
                                    <input
                                        type="date"
                                        value={form.signedDate}
                                        onChange={(e) => setForm((f) => ({ ...f, signedDate: e.target.value }))}
                                        className="w-full px-4 py-2.5 rounded-xl border border-indigo-100 bg-white shadow-sm"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="text-sm text-slate-600">Ngày hết hạn</label>
                                    <input
                                        type="date"
                                        value={form.dueDate}
                                        onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                                        className="w-full px-4 py-2.5 rounded-xl border border-indigo-100 bg-white shadow-sm"
                                    />
                                </div>

                                <div>
                                    <label className="text-sm text-slate-600">Loại hợp đồng</label>
                                    <select
                                        value={form.contractType}
                                        onChange={(e) => setForm((f) => ({ ...f, contractType: e.target.value }))}
                                        className="w-full px-4 py-2.5 rounded-xl border border-indigo-100 bg-white shadow-sm"
                                    >
                                        {TYPE_MAP.map((t) => (
                                            <option key={t.value} value={t.value}>
                                                {t.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {editing && (
                                    <div>
                                        <label className="text-sm text-slate-600">Trạng thái</label>
                                        <select
                                            value={form.status}
                                            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                                            className="w-full px-4 py-2.5 rounded-xl border border-indigo-100 bg-white shadow-sm"
                                        >
                                            {STATUS_MAP.map((s) => (
                                                <option key={s.value} value={s.value}>
                                                    {s.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <div className="md:col-span-2">
                                    <label className="text-sm text-slate-600">Ghi chú</label>
                                    <textarea
                                        rows={3}
                                        value={form.note}
                                        onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                                        className="w-full px-4 py-2.5 rounded-xl border border-indigo-100 bg-white shadow-sm"
                                        placeholder="Ghi chú nội bộ hoặc thông tin quan trọng…"
                                    />
                                </div>

                                {/* ===== Chia đợt thanh toán (chỉ khi tạo mới) ===== */}
                                {!editing && (
                                    <div className="md:col-span-2 border rounded-xl p-3 border-indigo-100">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="font-medium">Chia đợt thanh toán</div>
                                            <button
                                                type="button"
                                                className="text-indigo-600 text-sm"
                                                onClick={() => setSplitsOpen((v) => !v)}
                                            >
                                                {splitsOpen ? "Ẩn" : "Bật"}
                                            </button>
                                        </div>

                                        {splitsOpen && (
                                            <div className="mt-3 space-y-3">
                                                {/* Thanh công cụ */}
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <button
                                                        type="button"
                                                        className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200"
                                                        onClick={addInstallment}
                                                    >
                                                        + Thêm đợt
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200"
                                                        onClick={() => {
                                                            if (installments.length === 0) {
                                                                setInstallments([
                                                                    { no: 1, amount: fmtMoney(0), planDate: todayStr(), note: "" },
                                                                    { no: 2, amount: fmtMoney(0), planDate: todayStr(), note: "" },
                                                                ]);
                                                                setTimeout(evenSplit, 0);
                                                            } else {
                                                                evenSplit();
                                                            }
                                                        }}
                                                    >
                                                        Chia đều
                                                    </button>

                                                    <span className="ml-auto text-sm text-slate-500">
                            Giá trị HĐ:{" "}
                                                        <b className="tabular-nums">{fmtMoney(parseMoney(form.totalAmount))} đ</b>
                          </span>
                                                </div>

                                                {installments.length > 0 && (
                                                    <div className="overflow-auto max-h-[40vh]">
                                                        <table className="min-w-full text-sm">
                                                            <thead className="bg-indigo-50 sticky top-0">
                                                            <tr>
                                                                <th className="px-3 py-2 text-left w-16">Đợt</th>
                                                                <th className="px-3 py-2 text-left w-48">Số tiền (đ)</th>
                                                                <th className="px-3 py-2 text-left w-48">Ngày dự kiến</th>
                                                                <th className="px-3 py-2 text-left">Ghi chú</th>
                                                                <th className="px-3 py-2 text-right w-28"> </th>
                                                            </tr>
                                                            </thead>
                                                            <tbody className="divide-y">
                                                            {installments.map((it, idx) => (
                                                                <tr key={idx} className="hover:bg-indigo-50/30">
                                                                    <td className="px-3 py-2">{it.no}</td>
                                                                    <td className="px-3 py-2">
                                                                        <input
                                                                            className="w-44 px-2 py-1 rounded border border-indigo-100 tabular-nums"
                                                                            value={it.amount}
                                                                            inputMode="numeric"
                                                                            onChange={(e) =>
                                                                                updateInstallment(idx, { amount: fmtMoney(parseMoney(e.target.value)) })
                                                                            }
                                                                        />
                                                                    </td>
                                                                    <td className="px-3 py-2">
                                                                        <input
                                                                            type="date"
                                                                            className="w-44 px-2 py-1 rounded border border-indigo-100"
                                                                            value={it.planDate}
                                                                            onChange={(e) => updateInstallment(idx, { planDate: e.target.value })}
                                                                        />
                                                                    </td>
                                                                    <td className="px-3 py-2">
                                                                        <input
                                                                            className="w-full px-2 py-1 rounded border border-indigo-100"
                                                                            value={it.note || ""}
                                                                            onChange={(e) => updateInstallment(idx, { note: e.target.value })}
                                                                        />
                                                                    </td>
                                                                    <td className="px-3 py-2 text-right">
                                                                        <button
                                                                            type="button"
                                                                            className="px-2 py-1 rounded bg-rose-50 text-rose-700 hover:bg-rose-100"
                                                                            onClick={() => removeInstallment(idx)}
                                                                        >
                                                                            Xóa
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                            </tbody>
                                                        </table>

                                                        <div className="text-right mt-2 text-sm">
                                                            Tổng dự kiến:{" "}
                                                            <span className="font-semibold tabular-nums">
                                {fmtMoney(installments.reduce((s, x) => s + parseMoney(x.amount), 0))} đ
                              </span>
                                                            {installments.reduce((s, x) => s + parseMoney(x.amount), 0) !==
                                                                parseMoney(form.totalAmount) && (
                                                                    <span className="ml-2 text-amber-600">
                                  (khác giá trị HĐ – vẫn lưu được)
                                </span>
                                                                )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* footer buttons moved outside to sticky footer */}
                            </form>
                        </div>

                        {/* Footer sticky */}
                        <div className="p-4 md:p-5 border-t sticky bottom-0 bg-white z-10">
                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200"
                                    onClick={() => setShow(false)}
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={save}
                                    className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                                >
                                    Lưu
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal phụ lục */}
            {appendixOpen && appendixContract && (
                <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4">
                    <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl border border-indigo-100">
                        <div className="p-5 border-b flex items-center justify-between">
                            <div className="font-semibold">
                                Tạo phụ lục – {appendixContract.contractCode || `HD-${appendixContract.id}`}
                            </div>
                            <button className="text-slate-500 hover:text-slate-700" onClick={() => setAppendixOpen(false)}>
                                Đóng
                            </button>
                        </div>
                        <form onSubmit={saveAppendix} className="p-5 space-y-3">
                            <div>
                                <label className="text-sm text-slate-600">Tiêu đề phụ lục</label>
                                <input
                                    required
                                    value={appendixForm.title}
                                    onChange={(e) => setAppendixForm((f) => ({ ...f, title: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-lg border border-indigo-100 bg-white shadow"
                                />
                            </div>
                            <div>
                                <label className="text-sm text-slate-600">Ghi chú</label>
                                <textarea
                                    rows={3}
                                    value={appendixForm.note}
                                    onChange={(e) => setAppendixForm((f) => ({ ...f, note: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-lg border border-indigo-100 bg-white shadow"
                                />
                            </div>
                            <div className="flex items-center justify-end gap-2 pt-1">
                                <button
                                    type="button"
                                    className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200"
                                    onClick={() => setAppendixOpen(false)}
                                    disabled={appendixSaving}
                                >
                                    Hủy
                                </button>
                                <button
                                    className="px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                                    disabled={appendixSaving}
                                >
                                    {appendixSaving ? "Đang lưu…" : "Tạo phụ lục"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

function todayStr() {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${m}-${day}`;
}
function autoCode() {
    const d = new Date();
    const seg = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(
        d.getDate(),
    ).padStart(2, "0")}-${Math.floor(1000 + Math.random() * 9000)}`;
    return `HD-${seg}`;
}
