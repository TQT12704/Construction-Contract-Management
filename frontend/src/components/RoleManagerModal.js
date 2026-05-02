import { useEffect, useMemo, useState } from "react";
import api from "../api";

/* ===== Nhãn & nhóm quyền (VN) ===== */
const PERM_LABELS = {
    // KHÁCH HÀNG
    CUSTOMER_READ: "Xem danh sách khách hàng",
    CUSTOMER_CREATE: "Tạo khách hàng mới",
    CUSTOMER_UPDATE: "Chỉnh sửa thông tin khách hàng",
    CUSTOMER_DELETE: "Xóa khách hàng",
    CUSTOMER_WRITE: "Ghi/Chỉnh sửa khách hàng",

    // HỢP ĐỒNG
    CONTRACT_READ: "Xem danh sách hợp đồng",
    CONTRACT_CREATE: "Tạo hợp đồng mới",
    CONTRACT_UPDATE: "Chỉnh sửa hợp đồng",
    CONTRACT_APPROVE: "Phê duyệt hợp đồng",
    CONTRACT_WRITE: "Ghi/Chỉnh sửa hợp đồng",

    // THANH TOÁN
    PAYMENT_READ: "Xem thông tin thanh toán",
    PAYMENT_CREATE: "Tạo phiếu thu",
    PAYMENT_MARK_PAID: "Phê duyệt thanh toán / đánh dấu đã thu",
    PAYMENT_DELETE: "Xóa phiếu (chưa thanh toán)",
    PAYMENT_WRITE: "Ghi/Chỉnh sửa thanh toán",

    // BÁO CÁO
    REPORT_VIEW: "Xem báo cáo tổng hợp",
    REPORT_EXPORT: "Xuất báo cáo",
    REPORT_FINANCE_VIEW: "Xem báo cáo tài chính",

    // NGƯỜI DÙNG
    USER_MANAGE: "Quản lý người dùng",
    USER_READ: "Xem người dùng",
    USER_WRITE: "Chỉnh sửa người dùng",

    // VAI TRÒ
    ROLE_READ: "Xem vai trò",
    ROLE_WRITE: "Chỉnh sửa vai trò",

    // HỆ THỐNG
    SYSTEM_CONFIG: "Cấu hình hệ thống",
    SYSTEM_AUDIT_VIEW: "Xem nhật ký hệ thống",
};
const groupOf = (code) => {
    if (code.startsWith("CUSTOMER_")) return "Quản lý khách hàng";
    if (code.startsWith("CONTRACT_")) return "Quản lý hợp đồng";
    if (code.startsWith("PAYMENT_")) return "Quản lý thanh toán";
    if (code.startsWith("REPORT_")) return "Báo cáo & Thống kê";
    if (code.startsWith("USER_")) return "Người dùng";
    if (code.startsWith("ROLE_")) return "Vai trò";
    if (code.startsWith("SYSTEM_")) return "Quản trị hệ thống";
    return "Khác";
};
const GROUP_ORDER = [
    "Quản lý khách hàng",
    "Quản lý hợp đồng",
    "Quản lý thanh toán",
    "Báo cáo & Thống kê",
    "Người dùng",
    "Vai trò",
    "Quản trị hệ thống",
    "Khác",
];
const label = (c) => PERM_LABELS[c] || c;

/* ===== API ===== */
const listRoles = () => api.get("/api/roles").then((r) => r.data);               // [{id,name,permissionCount}]
const getRole = (id) => api.get(`/api/roles/${id}`).then((r) => r.data);         // {id,name,permissions[]}
const getPerms = () => api.get("/api/roles/permissions").then((r) => r.data);
const createRole = (payload) => api.post("/api/roles", payload).then((r) => r.data);
const updateRole = (id, payload) => api.put(`/api/roles/${id}`, payload).then((r) => r.data);
const deleteRole = (id) => api.delete(`/api/roles/${id}`);

/** props: open, onClose, onPick(roleName) */
export default function RoleManagerModal({ open, onClose, onPick }) {
    const [roles, setRoles] = useState([]);       // [{id,name,permissionCount}]
    const [allPerms, setAllPerms] = useState([]); // string[]
    const [loading, setLoading] = useState(true);

    const [q, setQ] = useState("");

    const [editing, setEditing] = useState(null); // detail {id,name,permissions[]}
    const [formName, setFormName] = useState("");
    const [picked, setPicked] = useState([]);     // string[]
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!open) return;
        (async () => {
            setLoading(true);
            try {
                const [rs, perms] = await Promise.all([listRoles(), getPerms()]);
                setRoles(rs || []);
                setAllPerms(perms || []);
            } finally {
                setLoading(false);
            }
        })();
    }, [open]);

    const filtered = useMemo(() => {
        const k = q.trim().toLowerCase();
        if (!k) return roles;
        return roles.filter((r) => r.name.toLowerCase().includes(k));
    }, [q, roles]);

    function resetForm() {
        setEditing(null);
        setFormName("");
        setPicked([]);
    }
    function openCreate() {
        resetForm();
    }
    async function openEdit(row) {
        const detail = await getRole(row.id);
        setEditing(detail);
        setFormName(detail.name);
        setPicked(detail.permissions || []);
    }

    const toggle = (code) =>
        setPicked((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]));
    const selectAll = () => setPicked(allPerms.slice());
    const clearAll = () => setPicked([]);

    async function save() {
        if (!formName.trim()) return alert("Nhập tên vai trò");
        if (picked.length === 0) return alert("Chọn ít nhất 1 quyền");
        setSaving(true);
        try {
            if (!editing) {
                const created = await createRole({ name: formName.trim(), permissions: picked });
                setRoles((prev) =>
                    [{ id: created.id, name: created.name, permissionCount: created.permissions?.length || 0 }, ...prev]
                        .sort((a, b) => a.name.localeCompare(b.name))
                );
                onPick?.(created.name);
                resetForm();
                alert("Đã tạo vai trò");
            } else {
                const updated = await updateRole(editing.id, { name: formName.trim(), permissions: picked });
                setRoles((prev) =>
                    prev
                        .map((r) =>
                            r.id === editing.id
                                ? { id: updated.id, name: updated.name, permissionCount: updated.permissions?.length || 0 }
                                : r
                        )
                        .sort((a, b) => a.name.localeCompare(b.name))
                );
                onPick?.(updated.name);
                resetForm();
                alert("Đã lưu thay đổi");
            }
        } catch (err) {
            alert(err?.response?.data?.message || err?.response?.data?.error || "Lưu vai trò thất bại");
        } finally {
            setSaving(false);
        }
    }

    async function remove(row) {
        if (!window.confirm(`Xoá vai trò “${row.name}”?`)) return;
        try {
            await deleteRole(row.id);
            setRoles((prev) => prev.filter((r) => r.id !== row.id));
            if (editing?.id === row.id) resetForm();
            alert("Đã xoá");
        } catch (err) {
            alert(err?.response?.data?.message || err?.response?.data?.error || "Xoá vai trò thất bại");
        }
    }

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4">
            <div className="w-full max-w-5xl max-h-[90vh] bg-white rounded-2xl shadow-xl border border-indigo-100 flex flex-col">
                {/* Header */}
                <div className="p-5 border-b flex items-center justify-between">
                    <div className="font-semibold">Quản lý vai trò</div>
                    <button className="text-slate-500 hover:text-slate-700" onClick={onClose}>Đóng</button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Bảng vai trò bên trái */}
                    <div className="bg-white rounded-xl border border-indigo-100">
                        <div className="p-3 border-b flex items-end gap-2">
                            <div className="flex flex-col grow">
                                <label className="text-xs text-slate-500 mb-1">Tìm kiếm vai trò</label>
                                <input
                                    value={q}
                                    onChange={(e) => setQ(e.target.value)}
                                    className="px-3 py-2 rounded-lg border border-indigo-100 bg-white shadow"
                                    placeholder="Nhập tên vai trò..."
                                />
                            </div>
                            {/* ❌ BỎ nút +Thêm ở đây theo yêu cầu */}
                        </div>

                        <div className="p-0">
                            <table className="min-w-full text-sm">
                                <thead className="bg-indigo-50 text-slate-600">
                                <tr>
                                    <th className="px-4 py-2 text-left">Tên vai trò</th>
                                    <th className="px-4 py-2 text-right">Thao tác</th>
                                </tr>
                                </thead>
                                <tbody className="divide-y">
                                {loading ? (
                                    <tr><td className="px-4 py-6" colSpan={2}>Đang tải…</td></tr>
                                ) : filtered.length === 0 ? (
                                    <tr><td className="px-4 py-6" colSpan={2}>Không có vai trò</td></tr>
                                ) : (
                                    filtered.map((r) => (
                                        <tr key={r.id} className="hover:bg-indigo-50/40">
                                            <td className="px-4 py-2">{r.name}</td>
                                            <td className="px-4 py-2 text-right">
                                                <div className="inline-flex gap-2">
                                                    <button
                                                        onClick={() => onPick?.(r.name)}
                                                        className="px-2 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100">Chọn</button>
                                                    <button
                                                        onClick={() => openEdit(r)}
                                                        className="px-2 py-1 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100">Sửa</button>
                                                    <button
                                                        onClick={() => remove(r)}
                                                        className="px-2 py-1 rounded bg-rose-50 text-rose-700 hover:bg-rose-100">Xoá</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Form tạo/sửa bên phải */}
                    <div className="bg-white rounded-xl border border-indigo-100 p-4">
                        <div className="font-medium mb-3">{editing ? "Sửa vai trò" : "Thêm vai trò"}</div>

                        <div className="mb-4">
                            <label className="text-sm text-slate-600">Tên vai trò</label>
                            <input
                                value={formName}
                                onChange={(e) => setFormName(e.target.value)}
                                placeholder="VD: TRƯỞNG PHÒNG, HỖ TRỢ…"
                                className="w-full px-3 py-2 rounded-lg border border-indigo-100 bg-white shadow"
                            />
                        </div>

                        <div className="flex items-center gap-2 mb-2">
                            <div className="font-medium">Quyền</div>
                            <button type="button" onClick={selectAll}
                                    className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-xs">Chọn tất cả</button>
                            <button type="button" onClick={clearAll}
                                    className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-xs">Bỏ hết</button>
                        </div>

                        <div className="space-y-3 max-h-[46vh] overflow-y-auto pr-1">
                            {GROUP_ORDER.map((g) => {
                                const items = allPerms.filter((c) => groupOf(c) === g);
                                if (!items.length) return null;
                                return (
                                    <div key={g} className="rounded-lg border border-indigo-100 bg-white p-3">
                                        <div className="font-medium mb-2">{g}</div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                            {items.map((code) => {
                                                const checked = picked.includes(code);
                                                return (
                                                    <label key={code} className="flex items-center gap-2">
                                                        <input type="checkbox" checked={checked} onChange={() => toggle(code)} />
                                                        <span>{label(code)}</span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="pt-4 flex justify-end gap-2">
                            <button onClick={save} disabled={saving}
                                    className="px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60">
                                {editing ? "Lưu thay đổi" : "Tạo vai trò"}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t flex justify-end gap-2">
                    <button className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200" onClick={onClose}>Đóng</button>
                </div>
            </div>
        </div>
    );
}
