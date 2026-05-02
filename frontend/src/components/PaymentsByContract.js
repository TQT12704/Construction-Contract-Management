// src/components/PaymentsByContract.jsx
import { useEffect, useMemo, useState } from "react";
import { payments } from "../api";

const VND = (v) => (Number(v || 0)).toLocaleString("vi-VN");
const todayStr = () => {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${m}-${day}`;
};

const METHOD_OPTS = [
    { label: "Chuyển khoản", value: "BANK_TRANSFER" },
    { label: "Tiền mặt", value: "CASH" },
    { label: "Khác", value: "OTHER" },
];
const findLabel = (opts, v) => opts.find(o => o.value === v)?.label || v || "-";

export default function PaymentsByContract({ contractId, contractTotal, canCreate, canMarkPaid, canDelete }) {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [amount, setAmount] = useState("");
    const [planDate, setPlanDate] = useState(todayStr());
    const [method, setMethod] = useState("BANK_TRANSFER");
    const [note, setNote] = useState("");

    const paidSum = useMemo(() => rows.filter(r => r.status === "PAID")
        .reduce((s, r) => s + Number(r.amount || 0), 0), [rows]);
    const remaining = useMemo(() => Number(contractTotal || 0) - paidSum, [contractTotal, paidSum]);

    async function load() {
        setLoading(true);
        try {
            const data = await payments.listByContract(contractId);
            setRows(Array.isArray(data) ? data : []);
        } finally {
            setLoading(false);
        }
    }
    useEffect(() => { if (contractId) load(); /* eslint-disable-next-line */ }, [contractId]);

    async function onCreate(e) {
        e.preventDefault();
        const amt = Number(String(amount).replace(/[^\d]/g, "") || 0);
        if (!amt) return alert("Số tiền phải > 0");
        await payments.create(contractId, { amount: amt, planDate, method, note });
        setAmount(""); setNote("");
        await load();
    }

    async function onMarkPaid(p) {
        if (!window.confirm("Đánh dấu đã thanh toán đợt này?")) return;
        await payments.markPaid(p.id, { paidDate: todayStr(), method: p.method, note: p.note });
        await load();
    }

    async function onDelete(p) {
        if (p.status === "PAID") return alert("Không xoá đợt đã thanh toán");
        if (!window.confirm("Xoá đợt thanh toán này?")) return;
        await payments.remove(p.id);
        await load();
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Đợt thanh toán</h3>
                <div className="text-sm">
                    <span className="mr-4">Đã thu: <b>{VND(paidSum)} ₫</b></span>
                    <span>Còn lại: <b>{VND(remaining)} ₫</b></span>
                </div>
            </div>

            {canCreate && (
                <form onSubmit={onCreate} className="grid md:grid-cols-5 gap-3 p-3 rounded-lg border">
                    <div>
                        <label className="block text-sm mb-1">Số tiền</label>
                        <input className="w-full border rounded px-3 py-2"
                               placeholder="50.000.000"
                               value={amount}
                               onChange={(e) => setAmount(e.target.value)}
                               inputMode="numeric" />
                    </div>
                    <div>
                        <label className="block text-sm mb-1">Ngày dự kiến</label>
                        <input type="date" className="w-full border rounded px-3 py-2"
                               value={planDate} onChange={(e) => setPlanDate(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm mb-1">Phương thức</label>
                        <select className="w-full border rounded px-3 py-2"
                                value={method} onChange={(e) => setMethod(e.target.value)}>
                            {METHOD_OPTS.map(x => <option key={x.value} value={x.value}>{x.label}</option>)}
                        </select>
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm mb-1">Ghi chú</label>
                        <input className="w-full border rounded px-3 py-2"
                               placeholder="Đợt 1"
                               value={note} onChange={(e) => setNote(e.target.value)} />
                    </div>
                    <div className="md:col-span-5">
                        <button className="px-4 py-2 rounded bg-blue-600 text-white hover:opacity-90">
                            Thêm đợt thanh toán
                        </button>
                    </div>
                </form>
            )}

            <div className="overflow-auto rounded border">
                <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                    <tr>
                        <th className="text-left p-3">#</th>
                        <th className="text-right p-3">Số tiền</th>
                        <th className="text-left p-3">Trạng thái</th>
                        <th className="text-left p-3">Ngày trả / dự kiến</th>
                        <th className="text-left p-3">Phương thức</th>
                        <th className="text-left p-3">Ghi chú</th>
                        <th className="text-right p-3">Thao tác</th>
                    </tr>
                    </thead>
                    <tbody>
                    {rows.map((r, idx) => {
                        const dateShown = r.paymentDate ?? r.planDate;
                        return (
                            <tr key={r.id} className="border-t">
                                <td className="p-3">{idx + 1}</td>
                                <td className="p-3 text-right">{VND(r.amount)} ₫</td>
                                <td className="p-3">
                                    {r.status === "PAID"
                                        ? <span className="px-2 py-1 rounded-full bg-green-100 text-green-700">Đã thanh toán</span>
                                        : <span className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">Chưa thanh toán</span>}
                                </td>
                                <td className="p-3">{dateShown || "-"}</td>
                                <td className="p-3">{findLabel(METHOD_OPTS, r.method)}</td>
                                <td className="p-3">{r.note || "-"}</td>
                                <td className="p-3 text-right space-x-2">
                                    {r.status !== "PAID" && canMarkPaid && (
                                        <button onClick={() => onMarkPaid(r)}
                                                className="px-3 py-1 rounded bg-emerald-600 text-white hover:opacity-90">
                                            Đánh dấu đã trả
                                        </button>
                                    )}
                                    {r.status !== "PAID" && canDelete && (
                                        <button onClick={() => onDelete(r)}
                                                className="px-3 py-1 rounded bg-rose-600 text-white hover:opacity-90">
                                            Xoá
                                        </button>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                    {rows.length === 0 && !loading && (
                        <tr><td className="p-4 text-center text-gray-500" colSpan={7}>Chưa có đợt thanh toán</td></tr>
                    )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
