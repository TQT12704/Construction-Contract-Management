import { useEffect, useState } from "react";
import api from "../api";
import RoleManagerModal from "../components/RoleManagerModal";

const PAGE_SIZE = 10;
const STATUSES = ["ACTIVE", "INACTIVE"];

function normalizePage(d) {
    if (Array.isArray(d)) return { list: d, pages: 1 };
    return { list: d?.content || [], pages: typeof d?.totalPages === "number" ? d.totalPages : 1 };
}
function useDebounce(value, delay = 400) {
    const [v, setV] = useState(value);
    useEffect(() => { const t = setTimeout(() => setV(value), delay); return () => clearTimeout(t); }, [value, delay]);
    return v;
}
function emptyForm() {
    return { username:"", fullName:"", email:"", phone:"", role:"SALES", status:"ACTIVE", password:"", confirm:"", resetPassword:false };
}
async function fetchRoleNames() {
    const { data } = await api.get("/api/roles"); // [{id,name,permissionCount}]
    return (data || []).map((r) => r.name).sort();
}

export default function Users() {
    const [rows, setRows] = useState([]);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);

    const [q, setQ] = useState("");  const dq = useDebounce(q, 450);
    const [role, setRole] = useState("");  const [status, setStatus] = useState("");

    const [show, setShow] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(emptyForm());

    const [roleList, setRoleList] = useState(["ADMIN","SALES","ACCOUNTANT"]);
    const [showRoleMgr, setShowRoleMgr] = useState(false);

    useEffect(() => { (async () => setRoleList(await fetchRoleNames()))(); }, []);

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const { data } = await api.get("/api/users", {
                    params: { q: dq || undefined, role: role || undefined, status: status || undefined, page, size: PAGE_SIZE, sort: "id,desc" },
                });
                const { list, pages } = normalizePage(data);
                setRows(list.map((u) => ({
                    id: u.id,
                    username: u.username,
                    fullName: u.fullName || u.name || "",
                    email: u.email || "",
                    phone: u.phone || "",
                    role: (u.role || "").toString().replace(/^ROLE_/,"") || "SALES",
                    status: u.active === false ? "INACTIVE" : "ACTIVE",
                })));
                setTotalPages(pages);
            } finally { setLoading(false); }
        })();
    }, [page, dq, role, status]);

    const openCreate = () => { setEditing(null); setForm(emptyForm()); setShow(true); };
    const openEdit   = (row) => {
        setEditing(row);
        setForm({
            username: row.username || "",
            fullName: row.fullName || "",
            email: row.email || "",
            phone: row.phone || "",
            role: row.role || "SALES",
            status: row.status || "ACTIVE",
            password: "",
            confirm: "",
            resetPassword: false,
        });
        setShow(true);
    };

    async function save(e) {
        e.preventDefault();
        try {
            if (!editing) {
                if (!form.password?.trim()) return alert("Mật khẩu không được để trống");
                if (form.password !== form.confirm) return alert("Xác nhận mật khẩu không khớp");
                await api.post("/api/users", {
                    username: form.username?.trim(),
                    fullName: form.fullName?.trim(),
                    email: form.email?.trim(),
                    phone: form.phone?.trim(),
                    password: form.password,
                    roleName: form.role,
                    active: form.status === "ACTIVE",
                });
            } else {
                const payload = {
                    fullName: form.fullName?.trim(),
                    email: form.email?.trim(),
                    phone: form.phone?.trim(),
                    roleName: form.role,
                    active: form.status === "ACTIVE",
                };
                if (form.resetPassword) {
                    if (!form.password?.trim()) return alert("Nhập mật khẩu mới");
                    if (form.password !== form.confirm) return alert("Xác nhận mật khẩu không khớp");
                    payload.password = form.password;
                }
                await api.put(`/api/users/${editing.id}`, payload);
            }
            setShow(false);
            setRoleList(await fetchRoleNames());
            setPage((p) => p); // trigger reload
            alert(editing ? "Đã cập nhật người dùng" : "Đã tạo người dùng");
        } catch (err) {
            alert(err?.response?.data?.message || err?.response?.data?.error || "Lưu người dùng thất bại");
        }
    }

    async function remove(row) {
        if (!window.confirm(`Xoá người dùng ${row.username}?`)) return;
        try {
            await api.delete(`/api/users/${row.id}`);
            setPage((p) => p); // trigger reload
        } catch (err) {
            alert(err?.response?.data?.message || err?.response?.data?.error || "Xoá người dùng thất bại");
        }
    }

    return (
        <div className="space-y-4">
            {/* Header + Filters */}
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                    <h2 className="text-lg font-semibold">Người dùng & Phân quyền</h2>
                    <p className="text-sm text-slate-500">Quản trị viên có thể quản lý người dùng</p>
                </div>
                <div className="flex flex-wrap items-end gap-2">
                    <div className="flex flex-col">
                        <label className="text-xs text-slate-500 mb-1">Tìm kiếm</label>
                        <input className="px-3 py-2 rounded-lg border border-indigo-100 bg-white shadow w-64"
                               placeholder="Tên đăng nhập / Họ tên / Email / SĐT…" value={q}
                               onChange={(e)=>{ setQ(e.target.value); setPage(0); }} />
                    </div>

                    <div className="flex flex-col">
                        <label className="text-xs text-slate-500 mb-1">Vai trò</label>
                        <select className="px-3 py-2 rounded-lg border border-indigo-100 bg-white shadow"
                                value={role} onChange={(e)=>{ setRole(e.target.value); setPage(0); }}>
                            <option value="">Tất cả</option>
                            {roleList.map((r)=> <option key={r} value={r}>{r}</option>)}
                        </select>
                    </div>

                    <div className="flex flex-col">
                        <label className="text-xs text-slate-500 mb-1">Trạng thái</label>
                        <select className="px-3 py-2 rounded-lg border border-indigo-100 bg-white shadow"
                                value={status} onChange={(e)=>{ setStatus(e.target.value); setPage(0); }}>
                            <option value="">Tất cả</option>
                            {STATUSES.map((s)=> <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>

                    <button onClick={openCreate}
                            className="px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 ml-auto">
                        Thêm người dùng
                    </button>
                </div>
            </div>

            {/* Bảng */}
            <div className="bg-white rounded-2xl border border-indigo-100 shadow overflow-hidden">
                <div className="overflow-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-indigo-50 text-slate-600">
                        <tr>
                            <th className="px-4 py-3 text-left">Tên đăng nhập</th>
                            <th className="px-4 py-3 text-left">Họ tên</th>
                            <th className="px-4 py-3 text-left">Email</th>
                            <th className="px-4 py-3 text-left">Điện thoại</th>
                            <th className="px-4 py-3 text-left">Vai trò</th>
                            <th className="px-4 py-3 text-left">Trạng thái</th>
                            <th className="px-4 py-3 text-right">Thao tác</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y">
                        {loading ? (
                            <tr><td className="px-4 py-6" colSpan={7}>Đang tải…</td></tr>
                        ) : rows.length === 0 ? (
                            <tr><td className="px-4 py-6" colSpan={7}>Chưa có dữ liệu</td></tr>
                        ) : rows.map((u) => (
                            <tr key={u.id} className="hover:bg-indigo-50/40">
                                <td className="px-4 py-3 font-medium">{u.username}</td>
                                <td className="px-4 py-3">{u.fullName || "-"}</td>
                                <td className="px-4 py-3">{u.email || "-"}</td>
                                <td className="px-4 py-3">{u.phone || "-"}</td>
                                <td className="px-4 py-3">{u.role}</td>
                                <td className="px-4 py-3">
                                    <span className={"px-2 py-0.5 rounded-full text-xs " + (u.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700")}>{u.status}</span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <div className="inline-flex gap-2">
                                        <button onClick={()=>openEdit(u)} className="px-2 py-1 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100">Sửa</button>
                                        <button onClick={()=>remove(u)} className="px-2 py-1 rounded bg-rose-50 text-rose-700 hover:bg-rose-100">Xóa</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            <div className="flex gap-2 justify-center">
                <button className="px-3 py-1.5 rounded bg-slate-100 disabled:opacity-50"
                        onClick={()=>setPage((p)=>Math.max(0,p-1))} disabled={page<=0}>← Trước</button>
                <div className="px-3 py-1.5 text-sm">Trang {page+1}/{totalPages}</div>
                <button className="px-3 py-1.5 rounded bg-slate-100 disabled:opacity-50"
                        onClick={()=>setPage((p)=>p+1)} disabled={page+1>=totalPages}>Sau →</button>
            </div>

            {/* Modal Thêm/Sửa user */}
            {show && (
                <div className="fixed inset-0 z-40 bg-black/40 grid place-items-center p-4">
                    <div className="w-full max-w-3xl max-h-[90vh] bg-white rounded-2xl shadow-xl border border-indigo-100 flex flex-col">
                        <div className="p-5 border-b flex items-center justify-between">
                            {/* ✅ tiêu đề đúng theo trạng thái */}
                            <div className="font-semibold">{editing ? "Sửa người dùng" : "Thêm người dùng"}</div>
                            <button className="text-slate-500 hover:text-slate-700" onClick={()=>setShow(false)}>Đóng</button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-5">
                            <form id="userForm" onSubmit={save} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm text-slate-600">Tên đăng nhập</label>
                                    <input required disabled={!!editing} value={form.username}
                                           onChange={(e)=>setForm((f)=>({...f, username:e.target.value}))}
                                           className="w-full px-3 py-2 rounded-lg border border-indigo-100 bg-white shadow"/>
                                </div>
                                <div>
                                    <label className="text-sm text-slate-600">Họ tên</label>
                                    <input required value={form.fullName}
                                           onChange={(e)=>setForm((f)=>({...f, fullName:e.target.value}))}
                                           className="w-full px-3 py-2 rounded-lg border border-indigo-100 bg-white shadow"/>
                                </div>
                                <div>
                                    <label className="text-sm text-slate-600">Email</label>
                                    <input required type="email" value={form.email}
                                           onChange={(e)=>setForm((f)=>({...f, email:e.target.value}))}
                                           className="w-full px-3 py-2 rounded-lg border border-indigo-100 bg-white shadow"/>
                                </div>
                                <div>
                                    <label className="text-sm text-slate-600">Điện thoại</label>
                                    <input value={form.phone} onChange={(e)=>setForm((f)=>({...f, phone:e.target.value}))}
                                           className="w-full px-3 py-2 rounded-lg border border-indigo-100 bg-white shadow"/>
                                </div>

                                <div className="flex flex-col">
                                    <label className="text-sm text-slate-600">Vai trò</label>
                                    <div className="flex items-center gap-2">
                                        {/* ✅ THU NHỎ Ô CHỌN VAI TRÒ */}
                                        <select
                                            value={form.role}
                                            onChange={(e)=>setForm((f)=>({...f, role:e.target.value}))}
                                            className="px-3 py-2 rounded-lg border border-indigo-100 bg-white shadow w-[220px] min-w-[200px]"
                                        >
                                            {roleList.map((r)=> <option key={r} value={r}>{r}</option>)}
                                        </select>
                                        <button type="button" onClick={()=>setShowRoleMgr(true)}
                                                className="px-3 py-2 rounded-lg border bg-white hover:bg-slate-50">Thêm vai trò</button>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-sm text-slate-600">Trạng thái</label>
                                    <select value={form.status} onChange={(e)=>setForm((f)=>({...f, status:e.target.value}))}
                                            className="w-full px-3 py-2 rounded-lg border border-indigo-100 bg-white shadow">
                                        {STATUSES.map((s)=> <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>

                                {!editing ? (
                                    <>
                                        <div>
                                            <label className="text-sm text-slate-600">Mật khẩu</label>
                                            <input type="password" value={form.password}
                                                   onChange={(e)=>setForm((f)=>({...f, password:e.target.value}))}
                                                   className="w-full px-3 py-2 rounded-lg border border-indigo-100 bg-white shadow" required/>
                                        </div>
                                        <div>
                                            <label className="text-sm text-slate-600">Xác nhận mật khẩu</label>
                                            <input type="password" value={form.confirm}
                                                   onChange={(e)=>setForm((f)=>({...f, confirm:e.target.value}))}
                                                   className="w-full px-3 py-2 rounded-lg border border-indigo-100 bg-white shadow" required/>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="md:col-span-2 flex items-center gap-2">
                                            <input id="resetPw" type="checkbox" checked={form.resetPassword}
                                                   onChange={(e)=>setForm((f)=>({...f, resetPassword:e.target.checked}))}/>
                                            <label htmlFor="resetPw" className="text-sm text-slate-600 select-none">Đặt mật khẩu mới</label>
                                        </div>
                                        {form.resetPassword && (
                                            <>
                                                <div>
                                                    <label className="text-sm text-slate-600">Mật khẩu mới</label>
                                                    <input type="password" value={form.password}
                                                           onChange={(e)=>setForm((f)=>({...f, password:e.target.value}))}
                                                           className="w-full px-3 py-2 rounded-lg border border-indigo-100 bg-white shadow" required/>
                                                </div>
                                                <div>
                                                    <label className="text-sm text-slate-600">Xác nhận mật khẩu</label>
                                                    <input type="password" value={form.confirm}
                                                           onChange={(e)=>setForm((f)=>({...f, confirm:e.target.value}))}
                                                           className="w-full px-3 py-2 rounded-lg border border-indigo-100 bg-white shadow" required/>
                                                </div>
                                            </>
                                        )}
                                    </>
                                )}
                            </form>
                        </div>

                        <div className="p-4 border-t flex justify-end gap-2">
                            <button type="button" className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200"
                                    onClick={()=>setShow(false)}>Huỷ</button>
                            <button form="userForm" className="px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">Lưu</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Quản lý vai trò */}
            {showRoleMgr && (
                <RoleManagerModal
                    open={showRoleMgr}
                    onClose={() => setShowRoleMgr(false)}
                    onPick={async (roleName) => {
                        setForm((f) => ({ ...f, role: roleName }));
                        setRoleList(await fetchRoleNames()); // cập nhật dropdown ngay
                        setShowRoleMgr(false);
                    }}
                />
            )}
        </div>
    );
}
