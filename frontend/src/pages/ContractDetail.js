import { useEffect, useState, useMemo } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import api from "../api";

/** ===== Helpers & Maps ===== **/
const TYPE_MAP = [
    { label: "Thi công", value: "CONSTRUCTION" },
    { label: "Dịch vụ", value: "SERVICE" },
];

const STATUS_MAP = [
    { label: "Chưa thực hiện", value: "PENDING" },
    { label: "Đang thực hiện", value: "ACTIVE" },
    { label: "Hoàn tất", value: "COMPLETED" },
    { label: "Hủy", value: "CANCELLED" },
];

const findLabel = (list, v) => list.find((x) => x.value === v)?.label || v || "-";
const fmtMoney = (n) => (n ?? 0).toLocaleString("vi-VN", { maximumFractionDigits: 0 });
const statusBadgeClass = (v) => {
    const s = String(v || "").toUpperCase();
    if (s === "COMPLETED") return "bg-emerald-100 text-emerald-700";
    if (s === "CANCELLED") return "bg-rose-100 text-rose-700";
    return "bg-amber-100 text-amber-700"; // PENDING/ACTIVE
};

/** ===== Page ===== **/
export default function ContractDetail() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [detail, setDetail] = useState(null);
    const [summary, setSummary] = useState(null);
    const [appendices, setAppendices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState("");

    const [appendixOpen, setAppendixOpen] = useState(false);
    const [appendixSaving, setAppendixSaving] = useState(false);
    const [appendixForm, setAppendixForm] = useState({ title: "", note: "" });

    useEffect(() => {
        loadAll();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    async function loadAll() {
        setLoading(true);
        setErr("");
        try {
            const [dRes, sRes, aRes] = await Promise.allSettled([
                api.get(`/api/contracts/${id}`),
                api.get(`/api/contracts/${id}/payments/summary`),
                api.get(`/api/contracts/${id}/appendices`),
            ]);

            if (dRes.status === "fulfilled") setDetail(dRes.value.data);
            else throw dRes.reason;

            if (sRes.status === "fulfilled") setSummary(sRes.value.data);
            else setSummary(null);

            if (aRes.status === "fulfilled") setAppendices(Array.isArray(aRes.value.data) ? aRes.value.data : []);
            else setAppendices([]);
        } catch (e) {
            setErr(e?.response?.data?.message || "Không tải được dữ liệu hợp đồng");
        } finally {
            setLoading(false);
        }
    }

    const code = detail?.contractCode || detail?.code || `HD-${id}`;
    const totalAmount = detail?.totalAmount ?? summary?.totalAmount ?? 0;
    const paidAmount = detail?.paidAmount ?? summary?.totalPaid ?? 0;
    const remaining =
        detail?.remainingAmount ?? summary?.remaining ?? Math.max(0, (totalAmount || 0) - (paidAmount || 0));

    const metaRows = useMemo(
        () => [
            ["Mã hợp đồng", code],
            ["Tiêu đề", detail?.title || "—"],
            ["Loại", findLabel(TYPE_MAP, detail?.contractType || detail?.contracttype)],
            [
                "Trạng thái",
                <span key="st" className={`px-2 py-0.5 rounded-full text-xs ${statusBadgeClass(detail?.status)}`}>
                    {findLabel(STATUS_MAP, detail?.status)}
                </span>,
            ],
            ["Khách hàng", detail?.customerName || `#${detail?.customerId || "-"}`],
            ["Phụ trách (Sale)", detail?.salesName || (detail?.salesId ? `#${detail.salesId}` : "—")],
            ["Ngày ký", detail?.signedDate || "—"],
            ["Ngày hết hạn", detail?.dueDate || "—"],
        ],
        [code, detail]
    );

    async function saveAppendix(e) {
        e.preventDefault();
        setAppendixSaving(true);
        try {
            await api.post(`/api/contracts/${id}/appendices`, {
                title: appendixForm.title?.trim(),
                note: appendixForm.note?.trim() || null,
            });
            setAppendixOpen(false);
            setAppendixForm({ title: "", note: "" });
            await loadAll();
            alert("Đã tạo phụ lục");
        } catch (err) {
            alert(err?.response?.data?.message || "Tạo phụ lục thất bại");
        } finally {
            setAppendixSaving(false);
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2">
                <button
                    onClick={() => navigate(-1)}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200"
                >
                    ← Quay lại
                </button>
                <h2 className="text-lg font-semibold text-slate-900">Chi tiết hợp đồng</h2>
            </div>

            {loading ? (
                <div className="text-slate-500">Đang tải…</div>
            ) : err ? (
                <div className="text-rose-600">{err}</div>
            ) : !detail ? (
                <div className="text-slate-500">Không tìm thấy hợp đồng</div>
            ) : (
                <>
                    {/* Header card */}
                    <div className="rounded-3xl border border-indigo-100 bg-white p-5 shadow">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <div className="text-xl font-semibold text-slate-900">{code}</div>
                                <div className="mt-1 text-slate-600">{detail.title || "—"}</div>
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${statusBadgeClass(detail.status)}`}>
                                {findLabel(STATUS_MAP, detail.status)}
                            </span>
                        </div>

                        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="rounded-xl bg-slate-50 px-4 py-3">
                                <div className="text-xs text-slate-500">Giá trị</div>
                                <div className="font-semibold tabular-nums">{fmtMoney(totalAmount)} đ</div>
                            </div>
                            <div className="rounded-xl bg-slate-50 px-4 py-3">
                                <div className="text-xs text-slate-500">Đã thu</div>
                                <div className="font-semibold tabular-nums">{fmtMoney(paidAmount)} đ</div>
                            </div>
                            <div className="rounded-xl bg-slate-50 px-4 py-3">
                                <div className="text-xs text-slate-500">Còn lại</div>
                                <div className="font-semibold tabular-nums">{fmtMoney(remaining)} đ</div>
                            </div>
                        </div>
                    </div>

                    {/* Meta */}
                    <div className="rounded-3xl border border-indigo-100 bg-white p-5 shadow">
                        <div className="text-base font-medium mb-3">Thông tin</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {metaRows.map(([k, v], i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <div className="w-44 text-sm text-slate-500">{k}</div>
                                    <div className="text-sm">{v}</div>
                                </div>
                            ))}
                            {detail.note ? (
                                <div className="md:col-span-2">
                                    <div className="text-sm text-slate-500 mb-1">Ghi chú</div>
                                    <div className="text-sm">{detail.note}</div>
                                </div>
                            ) : null}
                        </div>
                    </div>

                    {/* Appendices */}
                    <div className="rounded-3xl border border-indigo-100 bg-white p-5 shadow">
                        <div className="flex items-center justify-between">
                            <div className="text-base font-medium">Phụ lục hợp đồng</div>
                            <button
                                onClick={() => setAppendixOpen(true)}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                            >
                                Tạo phụ lục
                            </button>
                        </div>

                        {appendices.length === 0 ? (
                            <div className="text-sm text-slate-500 mt-3">Chưa có phụ lục</div>
                        ) : (
                            <div className="mt-3 overflow-auto">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-indigo-50 text-slate-600">
                                    <tr>
                                        <th className="px-4 py-2 text-left">#</th>
                                        <th className="px-4 py-2 text-left">Tiêu đề</th>
                                        <th className="px-4 py-2 text-left">Ghi chú</th>
                                        <th className="px-4 py-2 text-left">Ngày tạo</th>
                                    </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                    {appendices.map((a, i) => (
                                        <tr key={a.id}>
                                            <td className="px-4 py-2">{i + 1}</td>
                                            <td className="px-4 py-2">{a.title || "-"}</td>
                                            <td className="px-4 py-2">{a.note || "-"}</td>
                                            <td className="px-4 py-2">
                                                {a.createdAt ? new Date(a.createdAt).toLocaleString("vi-VN") : "-"}
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Actions bottom */}
                    <div className="flex items-center justify-between">
                        <Link to="/contracts" className="text-slate-500 hover:text-slate-700 text-sm">
                            ← Về danh sách hợp đồng
                        </Link>
                        <div className="flex gap-2">
                            <Link
                                to={`/customers/${detail.customerId}`}
                                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm"
                            >
                                Mở hồ sơ khách hàng
                            </Link>
                        </div>
                    </div>
                </>
            )}

            {/* Appendix modal */}
            {appendixOpen && (
                <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4">
                    <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl border border-indigo-100">
                        <div className="p-5 border-b flex items-center justify-between">
                            <div className="font-semibold">Tạo phụ lục – {code}</div>
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
