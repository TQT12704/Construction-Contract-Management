import { useEffect, useMemo, useState } from "react";
import api from "../api";
import { useAuth } from "../AuthContext";
import { toast } from "react-toastify";
import {
    ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip,
    PieChart, Pie, Cell, Legend
} from "recharts";

/** ===== Helpers ===== */
const VND = (v) => Number(v || 0).toLocaleString("vi-VN", { maximumFractionDigits: 0 });
const clampNum = (x) => (Number.isFinite(Number(x)) ? Number(x) : 0);

// Tạo mảng YYYY-MM của N tháng gần nhất (bao gồm tháng hiện tại)
function buildMonthBuckets(n) {
    const res = [];
    const d = new Date();
    d.setDate(1);
    for (let i = 0; i < n; i++) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        res.push(`${y}-${m}`);
        d.setMonth(d.getMonth() - 1);
    }
    return res.reverse();
}

// Chuẩn hoá nhãn tháng từ các dạng phổ biến
function normalizeMonthLabel(x) {
    if (!x) return null;
    if (/^\d{4}-\d{2}$/.test(x)) return x;            // "2025-08"
    if (/^\d{4}\/\d{2}$/.test(x)) return x.replace("/", "-");
    // "2025-08-01" -> "2025-08"
    const d = new Date(x);
    if (!isNaN(d)) return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    // "08/2025" -> "2025-08"
    const m = String(x).match(/^(\d{2})\/(\d{4})$/);
    if (m) return `${m[2]}-${m[1]}`;
    return String(x);
}

// Việt hoá trạng thái + thứ tự hiển thị
const STATUS_LABEL = {
    ACTIVE: "Đang thực hiện",
    PENDING: "Chưa thực hiện",
    COMPLETED: "Hoàn tất",
    CANCELLED: "Hủy",
};
const STATUS_ORDER = ["ACTIVE", "PENDING", "COMPLETED", "CANCELLED"];
const STATUS_COLORS = {
    ACTIVE: "#10b981",     // emerald
    PENDING: "#f59e0b",    // amber
    COMPLETED: "#3b82f6",  // blue
    CANCELLED: "#ef4444",  // red
};

export default function ReportsPage() {
    const { user } = useAuth();

    const isAdmin = useMemo(
        () => (user?.roles || []).some((r) => String(r).toUpperCase().includes("ADMIN")),
        [user]
    );
    const isAccountant = useMemo(
        () => (user?.roles || []).some((r) => String(r).toUpperCase().includes("ACCOUNTANT")),
        [user]
    );

    const [kpi, setKpi] = useState(null);
    const [rawSeries, setRawSeries] = useState([]);       // dữ liệu từ API (chưa chuẩn hoá)
    const [topCustomers, setTopCustomers] = useState([]);
    const [months, setMonths] = useState(12);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadAll();
        // eslint-disable-next-line
    }, [months]);

    async function loadAll() {
        try {
            setLoading(true);
            const [kpiRes, revRes, topRes] = await Promise.all([
                api.get("/api/reports/kpis"),
                api.get("/api/reports/revenue-by-month", { params: { months } }),
                api.get("/api/reports/top-customers", { params: { top: 10 } }),
            ]);
            setKpi(kpiRes.data);
            setRawSeries(Array.isArray(revRes.data) ? revRes.data : (revRes.data?.content || []));
            setTopCustomers(Array.isArray(topRes.data) ? topRes.data : (topRes.data?.content || []));
        } catch (e) {
            console.error(e);
            if (e?.response?.status === 403) {
                toast.error("Bạn không có quyền xem báo cáo");
            } else {
                toast.error("Tải báo cáo thất bại");
            }
        } finally {
            setLoading(false);
        }
    }

    /** ========== Doanh thu theo tháng (chuẩn hoá & lấp tháng thiếu) ========== */
    const revenueSeries = useMemo(() => {
        const buckets = buildMonthBuckets(months);              // ["2024-11", ..., "2025-10"]
        const map = new Map(buckets.map(m => [m, 0]));

        // Chấp nhận nhiều shape: {label,value} / {month,total} / {label,amount}...
        (rawSeries || []).forEach(r => {
            const label = normalizeMonthLabel(r.label ?? r.month ?? r.period ?? r.date);
            const val = clampNum(r.value ?? r.total ?? r.amount ?? r.sum);
            if (label) {
                const key = normalizeMonthLabel(label);
                if (map.has(key)) map.set(key, (map.get(key) || 0) + val);
            }
        });

        return buckets.map(m => ({ label: m, value: map.get(m) || 0 }));
    }, [rawSeries, months]);

    /** ========== Biểu đồ tròn trạng thái hợp đồng ========== */
    const statusPieData = useMemo(() => {
        const src = kpi?.contractsByStatus || {};
        // Build theo thứ tự cố định để legend đẹp và ổn định giữa các lần render
        return STATUS_ORDER.map(k => ({
            key: k,
            name: STATUS_LABEL[k],
            value: clampNum(src[k] ?? src[k?.toLowerCase?.()] ?? src[k?.toUpperCase?.()] ?? 0),
            fill: STATUS_COLORS[k],
        }));
    }, [kpi]);

    if (!(isAdmin || isAccountant)) {
        return (
            <div className="p-4">
                <h1 className="text-xl font-semibold mb-2">Báo cáo</h1>
                <div className="text-sm text-red-600">Bạn không có quyền xem trang này.</div>
            </div>
        );
    }

    return (
        <div className="p-4">
            <div className="mb-4 flex items-center justify-between">
                <h1 className="text-xl font-semibold">Báo cáo</h1>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Số tháng:</span>
                    <select
                        className="border rounded px-2 py-1 text-sm"
                        value={months}
                        onChange={(e) => setMonths(Number(e.target.value))}
                    >
                        {[6, 9, 12, 18, 24].map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                <KpiCard title="Khách hàng" value={kpi ? VND(kpi.totalCustomers) : (loading ? "…" : "0")} />
                <KpiCard title="Hợp đồng" value={kpi ? VND(kpi.totalContracts) : (loading ? "…" : "0")} />
                <KpiCard
                    title="Tổng giá trị HĐ"
                    value={kpi ? `${VND(kpi.totalContractValue)} ₫` : (loading ? "…" : "0 ₫")}
                />
                <KpiCard
                    title="Đã thu / Còn phải thu"
                    value={
                        kpi
                            ? `${VND(kpi.totalPaid)} ₫ / ${VND(kpi.receivable ?? Math.max(0, (kpi.totalContractValue || 0) - (kpi.totalPaid || 0)))} ₫`
                            : (loading ? "…" : "0 / 0")
                    }
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Doanh thu theo tháng */}
                <div className="border rounded p-3">
                    <div className="font-semibold mb-2">Doanh thu theo tháng</div>
                    <div style={{ width: "100%", height: 300 }}>
                        <ResponsiveContainer>
                            <LineChart data={revenueSeries} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                                <YAxis width={80} tickFormatter={(v) => (v === 0 ? "0" : VND(v))} />
                                <Tooltip
                                    formatter={(v) => [`${VND(v)} ₫`, "Thực thu"]}
                                    labelFormatter={(lbl) => `Tháng ${lbl}`}
                                />
                                <Line type="monotone" dataKey="value" name="Thực thu" stroke="#1f2937" dot />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* HĐ theo trạng thái */}
                <div className="border rounded p-3">
                    <div className="font-semibold mb-2">Phân bố hợp đồng theo trạng thái</div>
                    <div style={{ width: "100%", height: 300 }}>
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie
                                    data={statusPieData}
                                    dataKey="value"
                                    nameKey="name"
                                    outerRadius={110}
                                    // Ẩn nhãn khi value = 0 để tránh đè nhau
                                    label={({ name, value }) => (value > 0 ? `${name}: ${VND(value)}` : "")}
                                    labelLine={false}
                                    isAnimationActive={false}
                                >
                                    {statusPieData.map((entry, idx) => (
                                        <Cell key={`cell-${idx}`} fill={entry.fill} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(v, _n, p) => [`${VND(v)}`, p?.payload?.name || "Trạng thái"]}
                                />
                                <Legend
                                    verticalAlign="bottom"
                                    align="center"
                                    layout="horizontal"
                                    iconType="circle"
                                    formatter={(val, entry) => (
                                        <span style={{ color: entry?.payload?.fill }}>{val}</span>
                                    )}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    {statusPieData.every(d => d.value === 0) && (
                        <div className="text-xs text-gray-500 mt-2">Chưa có dữ liệu trạng thái trong khoảng thời gian chọn.</div>
                    )}
                </div>
            </div>

            {/* Top khách hàng */}
            <div className="mt-4 border rounded p-3">
                <div className="font-semibold mb-2">Top khách hàng theo tổng giá trị HĐ</div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                        <tr>
                            <th className="text-left p-2">#</th>
                            <th className="text-left p-2">Khách hàng</th>
                            <th className="text-right p-2">Tổng giá trị</th>
                        </tr>
                        </thead>
                        <tbody>
                        {(!topCustomers || topCustomers.length === 0) && (
                            <tr><td colSpan={3} className="p-3 text-center text-gray-500">Không có dữ liệu</td></tr>
                        )}
                        {topCustomers.map((row, i) => (
                            <tr key={i} className="border-t">
                                <td className="p-2">{i + 1}</td>
                                <td className="p-2">{row.customerName || row.name || `#${row.customerId || ""}`}</td>
                                <td className="p-2 text-right">{VND(row.totalValue ?? row.sum ?? row.value)} ₫</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
}

function KpiCard({ title, value }) {
    return (
        <div className="border rounded p-3">
            <div className="text-sm text-gray-500">{title}</div>
            <div className="text-xl font-semibold">{value}</div>
        </div>
    );
}
