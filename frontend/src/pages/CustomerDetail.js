import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api";

const VND = (v) => (Number(v || 0)).toLocaleString("vi-VN");

function statusLabel(v) {
    const m = {
        PENDING: "Chờ duyệt/Ký",
        ACTIVE: "Đang thực hiện",
        COMPLETED: "Hoàn tất",
        CANCELLED: "Hủy",
    };
    return m[String(v || "").toUpperCase()] || v || "—";
}
function payStatusLabel(v) {
    const m = { PAID: "Đã thanh toán", UNPAID: "Chưa thanh toán" };
    return m[String(v || "").toUpperCase()] || v || "—";
}

function CardStat({ label, value, suffix }) {
    return (
        <div className="rounded-2xl bg-white border border-indigo-100 shadow p-4">
            <div className="text-xs text-slate-500">{label}</div>
            <div className="text-lg font-semibold tabular-nums">
                {value}{suffix ? " " + suffix : ""}
            </div>
        </div>
    );
}

export default function CustomerDetail() {
    const { id } = useParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        setLoading(true);
        api.get(`/api/customers/${id}/detail`)
            .then((res) => mounted && setData(res.data))
            .catch((e) => alert(e?.response?.data?.message || "Tải chi tiết KH thất bại"))
            .finally(() => mounted && setLoading(false));
        return () => { mounted = false; };
    }, [id]);

    if (loading) return <div>Đang tải…</div>;
    if (!data) return <div>Không tìm thấy khách hàng</div>;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-slate-900">{data.name}</h2>
                    <div className="text-slate-500 text-sm">
                        {data.email || "—"} • {data.phone || "—"} • {data.address || "—"}
                    </div>
                    <div className="text-slate-500 text-sm">
                        Nhóm: {data.groupName || "—"} • Khu vực: {data.region || "—"}
                    </div>
                </div>
                <Link
                    to="/customers"
                    className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200"
                >
                    ← Quay lại danh sách
                </Link>
            </div>

            {/* Tổng quan */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <CardStat label="Tổng HĐ" value={data.totalContracts} />
                <CardStat label="Giá trị HĐ" value={VND(data.totalContractAmount)} suffix="đ" />
                <CardStat label="Đã thu" value={VND(data.totalPaidAmount)} suffix="đ" />
                <CardStat label="Còn lại" value={VND(data.remainingAmount)} suffix="đ" />
            </div>

            {/* Phân loại hợp đồng */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <CardStat label="Đang thực hiện" value={data.activeContracts} />
                <CardStat label="Hoàn tất" value={data.completedContracts} />
                <CardStat label="Hủy" value={data.cancelledContracts} />
            </div>

            {/* Hợp đồng gần đây */}
            <section className="bg-white rounded-2xl border border-indigo-100 shadow overflow-hidden">
                <div className="px-4 py-3 border-b font-semibold">Hợp đồng gần đây</div>
                <div className="overflow-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-indigo-50 text-slate-600">
                        <tr>
                            <th className="px-4 py-3 text-left">Mã HĐ</th>
                            <th className="px-4 py-3 text-left">Tiêu đề</th>
                            <th className="px-4 py-3 text-left">Giá trị</th>
                            <th className="px-4 py-3 text-left">Trạng thái</th>
                            <th className="px-4 py-3 text-left">Ngày ký</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y">
                        {(data.recentContracts || []).length === 0 ? (
                            <tr><td className="px-4 py-4" colSpan={5}>Không có dữ liệu</td></tr>
                        ) : (
                            data.recentContracts.map((c) => (
                                <tr key={c.id} className="hover:bg-indigo-50/40">
                                    <td className="px-4 py-3">{c.contractCode || `HD-${c.id}`}</td>
                                    <td className="px-4 py-3">{c.title || "—"}</td>
                                    <td className="px-4 py-3 tabular-nums">{VND(c.totalAmount)} đ</td>
                                    <td className="px-4 py-3">{statusLabel(c.status)}</td>
                                    <td className="px-4 py-3">{c.signedDate || "—"}</td>
                                </tr>
                            ))
                        )}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Thanh toán gần đây */}
            <section className="bg-white rounded-2xl border border-indigo-100 shadow overflow-hidden">
                <div className="px-4 py-3 border-b font-semibold">Thanh toán gần đây</div>
                <div className="overflow-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-indigo-50 text-slate-600">
                        <tr>
                            <th className="px-4 py-3 text-left">Hợp đồng</th>
                            <th className="px-4 py-3 text-left">Ngày thanh toán</th>
                            <th className="px-4 py-3 text-left">Số tiền</th>
                            <th className="px-4 py-3 text-left">Trạng thái</th>
                            <th className="px-4 py-3 text-left">Xác nhận</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y">
                        {(data.recentPayments || []).length === 0 ? (
                            <tr><td className="px-4 py-4" colSpan={5}>Không có dữ liệu</td></tr>
                        ) : (
                            data.recentPayments.map((p) => (
                                <tr key={p.id} className="hover:bg-indigo-50/40">
                                    <td className="px-4 py-3">{p.contractCode || (p.contractId ? `HD-${p.contractId}` : "—")}</td>
                                    <td className="px-4 py-3">{p.paymentDate || "—"}</td>
                                    <td className="px-4 py-3 tabular-nums">{VND(p.amount)} đ</td>
                                    <td className="px-4 py-3">{payStatusLabel(p.status)}</td>
                                    <td className="px-4 py-3">{p.confirmedByName || "—"}</td>
                                </tr>
                            ))
                        )}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}
