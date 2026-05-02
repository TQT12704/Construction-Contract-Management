import { useEffect, useState } from "react";
import api from "../api";

export default function GroupModalSimple({ open, onClose, onChanged }) {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({ id: null, code: "", name: "", note: "" });
    const [saving, setSaving] = useState(false);

    useEffect(() => { if (open) load(); }, [open]);

    async function load() {
        setLoading(true);
        try {
            const { data } = await api.get("/api/customer-groups");
            setRows(Array.isArray(data) ? data : []);
        } finally { setLoading(false); }
    }

    function onEdit(g) { setForm({ id: g.id, code: g.code ?? "", name: g.name ?? "", note: g.note ?? "" }); }
    function onNew() { setForm({ id: null, code: "", name: "", note: "" }); }

    async function save(e) {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = { code: form.code?.trim(), name: form.name?.trim(), note: form.note?.trim() || null };
            if (!payload.code || !payload.name) { alert("Mã và Tên không được trống"); return; }
            if (form.id) await api.put(`/api/customer-groups/${form.id}`, payload);
            else await api.post(`/api/customer-groups`, payload);
            await load(); onChanged?.(); onNew();
        } catch (e) {
            alert(e?.response?.data?.message || "Lưu nhóm thất bại");
        } finally { setSaving(false); }
    }

    async function removeRow(g) {
        if (!window.confirm(`Xoá nhóm "${g.name}"?`)) return;
        await api.delete(`/api/customer-groups/${g.id}`);
        await load(); onChanged?.();
    }

    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4">
            <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl border border-indigo-100">
                <div className="p-4 border-b flex items-center justify-between">
                    <div className="font-semibold">Nhóm khách hàng</div>
                    <button className="text-slate-600" onClick={onClose}>Đóng</button>
                </div>

                <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* Danh sách */}
                    <div className="bg-white rounded-xl border border-indigo-100 overflow-hidden">
                        <div className="px-3 py-2 border-b flex items-center justify-between">
                            <div className="font-medium">Danh sách</div>
                            <button onClick={onNew} className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200">Thêm mới</button>
                        </div>
                        <div className="overflow-auto">
                            <table className="min-w-full text-sm">
                                <thead className="bg-indigo-50 text-slate-600">
                                <tr>
                                    <th className="px-3 py-2 text-left">Mã</th>
                                    <th className="px-3 py-2 text-left">Tên</th>
                                    <th className="px-3 py-2 text-left">Ghi chú</th>
                                    <th className="px-3 py-2 text-right">Thao tác</th>
                                </tr>
                                </thead>
                                <tbody className="divide-y">
                                {loading ? (
                                    <tr><td className="px-3 py-4" colSpan={4}>Đang tải…</td></tr>
                                ) : rows.length === 0 ? (
                                    <tr><td className="px-3 py-4" colSpan={4}>Chưa có nhóm</td></tr>
                                ) : rows.map(g => (
                                    <tr key={g.id} className="hover:bg-indigo-50/40">
                                        <td className="px-3 py-2 font-medium">{g.code}</td>
                                        <td className="px-3 py-2">{g.name}</td>
                                        <td className="px-3 py-2">{g.note || "-"}</td>
                                        <td className="px-3 py-2 text-right">
                                            <div className="inline-flex gap-2">
                                                <button onClick={() => onEdit(g)} className="px-2 py-1 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100">Sửa</button>
                                                <button onClick={() => removeRow(g)} className="px-2 py-1 rounded bg-rose-50 text-rose-700 hover:bg-rose-100">Xoá</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Form */}
                    <form onSubmit={save} className="bg-white rounded-xl border border-indigo-100 p-4 h-fit">
                        <div className="font-medium mb-3">{form.id ? "Sửa nhóm" : "Thêm nhóm"}</div>
                        <div className="space-y-3">
                            <div>
                                <label className="text-sm text-slate-600">Mã nhóm</label>
                                <input required placeholder="VD: VIP / NORMAL / SME…" value={form.code}
                                       onChange={(e) => setForm(f => ({ ...f, code: e.target.value }))}
                                       className="w-full px-3 py-2 rounded-lg border border-indigo-100 bg-white shadow" />
                            </div>
                            <div>
                                <label className="text-sm text-slate-600">Tên hiển thị</label>
                                <input required value={form.name}
                                       onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                                       className="w-full px-3 py-2 rounded-lg border border-indigo-100 bg-white shadow" />
                            </div>
                            <div>
                                <label className="text-sm text-slate-600">Ghi chú chức năng</label>
                                <textarea rows={4} placeholder="VD: ưu tiên hỗ trợ, chiết khấu X%..."
                                          value={form.note}
                                          onChange={(e) => setForm(f => ({ ...f, note: e.target.value }))}
                                          className="w-full px-3 py-2 rounded-lg border border-indigo-100 bg-white shadow" />
                            </div>
                            <div className="flex justify-end">
                                <button disabled={saving} className="px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50">
                                    {form.id ? "Cập nhật" : "Thêm"}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>

                <div className="p-3 border-t text-xs text-slate-500">
                    * Đã seed sẵn: VIP / Tiềm năng / Thường. Bạn có thể thêm nhóm mới và ghi chú.
                </div>
            </div>
        </div>
    );
}
