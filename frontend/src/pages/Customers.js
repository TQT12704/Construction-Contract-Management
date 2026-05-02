import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import GroupModalSimple from "../components/GroupModalSimple";

const PAGE_SIZE = 10;

const REGIONS = [
    { value: "", label: "Tất cả" },
    { value: "NORTH", label: "Miền Bắc" },
    { value: "CENTRAL", label: "Miền Trung" },
    { value: "SOUTH", label: "Miền Nam" },
    { value: "OTHER", label: "Khác" },
];

function normalizeList(d) {
    return Array.isArray(d) ? { list: d, pages: 1 } : { list: d?.content || [], pages: d?.totalPages || 1 };
}
function useDebounce(v, delay = 450) {
    const [val, setVal] = useState(v);
    useEffect(() => {
        const t = setTimeout(() => setVal(v), delay);
        return () => clearTimeout(t);
    }, [v, delay]);
    return val;
}

export default function Customers() {
    const [rows, setRows] = useState([]);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);

    // ===== Filters =====
    const [q, setQ] = useState("");
    const dq = useDebounce(q);
    const [group, setGroup] = useState("");
    const [region, setRegion] = useState("");
    // ✅ unified search: KHÔNG còn state industry riêng (đã gộp vào q)

    // ===== Dynamic groups =====
    const [groupOpts, setGroupOpts] = useState([]);
    const [groupModal, setGroupModal] = useState(false);

    // ===== Modal form =====
    const [show, setShow] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({
        name: "",
        customerGroup: "NORMAL",
        region: "OTHER",
        phone: "",
        email: "",
        address: "",
        industry: "", // giữ field industry ở dữ liệu KH
    });

    async function loadGroups() {
        try {
            const { data } = await api.get("/api/customer-groups");
            const list = Array.isArray(data) ? data : [];
            const fallback = [
                { code: "VIP", name: "VIP" },
                { code: "POTENTIAL", name: "Tiềm năng" },
                { code: "NORMAL", name: "Thường" },
            ];
            const final = list.length ? list : fallback;
            setGroupOpts(final.map((g) => ({ value: g.code, label: g.name, note: g.note })));
        } catch {
            setGroupOpts([
                { value: "VIP", label: "VIP" },
                { value: "POTENTIAL", label: "Tiềm năng" },
                { value: "NORMAL", label: "Thường" },
            ]);
        }
    }

    useEffect(() => {
        loadGroups();
    }, []);

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, dq, group, region]); // ✅ unified search: không còn dIndustry

    async function load() {
        setLoading(true);
        try {
            const { data } = await api.get("/api/customers", {
                params: {
                    q: dq || undefined,            // tìm tên/SĐT/email/địa chỉ/industry
                    group: group || undefined,
                    region: region || undefined,
                    // ✅ unified search: bỏ industry param riêng
                    page,
                    size: PAGE_SIZE,
                    sort: "id,desc",
                },
            });
            const { list, pages } = normalizeList(data);
            setRows(
                list.map((c) => ({
                    id: c.id,
                    name: c.name,
                    customerGroup: c.customerGroup,
                    region: c.region,
                    phone: c.phone || "",
                    email: c.email || "",
                    address: c.address || "",
                    industry: c.industry || "",
                    ownerId: c.ownerId,
                }))
            );
            setTotalPages(pages);
        } catch (e) {
            console.error(e);
            setRows([]);
            setTotalPages(1);
        } finally {
            setLoading(false);
        }
    }

    function openCreate() {
        setEditing(null);
        setForm({
            name: "",
            customerGroup: groupOpts[0]?.value || "NORMAL",
            region: "OTHER",
            phone: "",
            email: "",
            address: "",
            industry: "",
        });
        setShow(true);
    }
    function openEdit(row) {
        setEditing(row);
        setForm({
            name: row.name || "",
            customerGroup: row.customerGroup || (groupOpts[0]?.value || "NORMAL"),
            region: row.region || "OTHER",
            phone: row.phone || "",
            email: row.email || "",
            address: row.address || "",
            industry: row.industry || "",
        });
        setShow(true);
    }

    async function save(e) {
        e.preventDefault();
        const payload = {
            name: form.name?.trim(),
            customerGroup: form.customerGroup,
            region: form.region,
            phone: form.phone?.trim() || null,
            email: form.email?.trim() || null,
            address: form.address?.trim() || null,
            industry: form.industry?.trim() || null, // giữ ở dữ liệu KH
        };
        try {
            if (editing) await api.put(`/api/customers/${editing.id}`, payload);
            else await api.post("/api/customers", payload);
            setShow(false);
            setPage(0);
            await load();
            alert("Lưu khách hàng thành công");
        } catch (err) {
            alert(err?.response?.data?.message || "Lưu khách hàng thất bại");
        }
    }

    async function removeRow(row) {
        if (!window.confirm(`Xoá khách hàng "${row.name}"?`)) return;
        try {
            await api.delete(`/api/customers/${row.id}`);
            setPage(0);
            await load();
        } catch (err) {
            alert(err?.response?.data?.message || "Xoá khách hàng thất bại");
        }
    }

    const byRegionLabel = (v) => REGIONS.find((r) => r.value === v)?.label || v || "-";
    const byGroupLabel = (v) => groupOpts.find((g) => g.value === v)?.label || v || "-";

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-2">
                <div>
                    <h2 className="text-lg font-semibold">Khách hàng</h2>
                    <p className="text-sm text-slate-500">Quản lý thông tin khách hàng & phân nhóm</p>
                </div>

                <div className="flex flex-wrap items-end gap-2">
                    {/* Tìm kiếm (gộp industry) */}
                    <div className="flex flex-col">
                        <label className="text-xs text-slate-500 mb-1">Tìm kiếm</label>
                        <input
                            className="w-80 px-3 py-2 rounded-lg border border-indigo-100 bg-white shadow"
                            placeholder="Tên/Email/SĐT/Địa chỉ/Ngành nghề…"
                            value={q}
                            onChange={(e) => {
                                setQ(e.target.value);
                                setPage(0);
                            }}
                        />
                    </div>

                    {/* Khu vực */}
                    <div className="flex flex-col">
                        <label className="text-xs text-slate-500 mb-1">Khu vực</label>
                        <select
                            className="px-3 py-2 rounded-lg border border-indigo-100 bg-white shadow"
                            value={region}
                            onChange={(e) => {
                                setRegion(e.target.value);
                                setPage(0);
                            }}
                        >
                            {REGIONS.map((r) => (
                                <option key={r.value} value={r.value}>
                                    {r.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Nhóm (đưa ra sau Khu vực) + nút quản lý nhóm */}
                    <div className="flex flex-col">
                        <label className="text-xs text-slate-500 mb-1">Nhóm</label>
                        <div className="flex gap-2">
                            <select
                                className="px-3 py-2 rounded-lg border border-indigo-100 bg-white shadow"
                                value={group}
                                onChange={(e) => {
                                    setGroup(e.target.value);
                                    setPage(0);
                                }}
                            >
                                <option value="">Tất cả</option>
                                {groupOpts.map((g) => (
                                    <option key={g.value} value={g.value}>
                                        {g.label}
                                    </option>
                                ))}
                            </select>
                            <button
                                onClick={() => setGroupModal(true)}
                                className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200"
                                title="Thêm/sửa nhóm"
                            >
                                +
                            </button>
                        </div>
                    </div>

                    {/* Nút thêm khách hàng */}
                    <button
                        onClick={openCreate}
                        className="ml-auto px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                    >
                        Thêm khách hàng
                    </button>
                </div>
            </div>

            {/* Bảng */}
            <div className="bg-white rounded-2xl border border-indigo-100 shadow overflow-hidden">
                <div className="overflow-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-indigo-50 text-slate-600">
                        <tr>
                            <th className="px-4 py-3 text-left">Tên</th>
                            <th className="px-4 py-3 text-left">Nhóm</th>
                            <th className="px-4 py-3 text-left">Khu vực</th>
                            <th className="px-4 py-3 text-left">Điện thoại</th>
                            <th className="px-4 py-3 text-left">Email</th>
                            <th className="px-4 py-3 text-left">Địa chỉ</th>
                            <th className="px-4 py-3 text-left">Ngành nghề</th>
                            <th className="px-4 py-3 text-right">Thao tác</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y">
                        {loading ? (
                            <tr>
                                <td className="px-4 py-6" colSpan={8}>
                                    Đang tải…
                                </td>
                            </tr>
                        ) : rows.length === 0 ? (
                            <tr>
                                <td className="px-4 py-6" colSpan={8}>
                                    Chưa có dữ liệu
                                </td>
                            </tr>
                        ) : (
                            rows.map((c) => (
                                <tr key={c.id} className="hover:bg-indigo-50/40">
                                    <td className="px-4 py-3 font-medium">
                                        <Link to={`/customers/${c.id}`} className="text-indigo-600 hover:underline">
                                            {c.name}
                                        </Link>
                                    </td>
                                    <td className="px-4 py-3">{byGroupLabel(c.customerGroup)}</td>
                                    <td className="px-4 py-3">{byRegionLabel(c.region)}</td>
                                    <td className="px-4 py-3">{c.phone || "-"}</td>
                                    <td className="px-4 py-3">{c.email || "-"}</td>
                                    <td className="px-4 py-3">{c.address || "-"}</td>
                                    <td className="px-4 py-3">{c.industry || "-"}</td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="inline-flex gap-2">
                                            <button
                                                onClick={() => openEdit(c)}
                                                className="px-2 py-1 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                                            >
                                                Sửa
                                            </button>
                                            <button
                                                onClick={() => removeRow(c)}
                                                className="px-2 py-1 rounded bg-rose-50 text-rose-700 hover:bg-rose-100"
                                            >
                                                Xóa
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Phân trang */}
            <div className="flex gap-2">
                <button
                    className="px-3 py-1.5 rounded bg-slate-100 disabled:opacity-50"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page <= 0}
                >
                    ← Trước
                </button>
                <div className="px-3 py-1.5 text-sm">
                    Trang {page + 1}/{totalPages}
                </div>
                <button
                    className="px-3 py-1.5 rounded bg-slate-100 disabled:opacity-50"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page + 1 >= totalPages}
                >
                    Sau →
                </button>
            </div>

            {/* Modal KH */}
            {show && (
                <div className="fixed inset-0 z-40 bg-black/40 grid place-items-center p-4">
                    <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl border border-indigo-100">
                        <div className="p-5 border-b flex items-center justify-between">
                            <div className="font-semibold">{editing ? "Sửa khách hàng" : "Thêm khách hàng"}</div>
                            <button className="text-slate-500 hover:text-slate-700" onClick={() => setShow(false)}>
                                Đóng
                            </button>
                        </div>
                        <form onSubmit={save} className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm text-slate-600">Tên</label>
                                <input
                                    required
                                    value={form.name}
                                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-lg border border-indigo-100 bg-white shadow"
                                />
                            </div>

                            <div>
                                <label className="text-sm text-slate-600">Nhóm</label>
                                <div className="flex gap-2">
                                    <select
                                        value={form.customerGroup}
                                        onChange={(e) => setForm((f) => ({ ...f, customerGroup: e.target.value }))}
                                        className="w-full px-3 py-2 rounded-lg border border-indigo-100 bg-white shadow"
                                    >
                                        {groupOpts.map((g) => (
                                            <option key={g.value} value={g.value}>
                                                {g.label}
                                            </option>
                                        ))}
                                    </select>
                                    <button
                                        type="button"
                                        onClick={() => setGroupModal(true)}
                                        className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200"
                                        title="Thêm/sửa nhóm"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="text-sm text-slate-600">Khu vực</label>
                                <select
                                    value={form.region}
                                    onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-lg border border-indigo-100 bg-white shadow"
                                >
                                    {REGIONS.filter((r) => r.value).map((r) => (
                                        <option key={r.value} value={r.value}>
                                            {r.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-sm text-slate-600">Điện thoại</label>
                                <input
                                    value={form.phone}
                                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-lg border border-indigo-100 bg-white shadow"
                                />
                            </div>

                            <div>
                                <label className="text-sm text-slate-600">Email</label>
                                <input
                                    type="email"
                                    value={form.email}
                                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-lg border border-indigo-100 bg-white shadow"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="text-sm text-slate-600">Địa chỉ</label>
                                <input
                                    value={form.address}
                                    onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-lg border border-indigo-100 bg-white shadow"
                                />
                            </div>

                            {/* industry vẫn ở form KH */}
                            <div className="md:col-span-2">
                                <label className="text-sm text-slate-600">Ngành nghề</label>
                                <input
                                    value={form.industry}
                                    onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-lg border border-indigo-100 bg-white shadow"
                                />
                            </div>

                            <div className="md:col-span-2 flex items-center justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200"
                                    onClick={() => setShow(false)}
                                >
                                    Hủy
                                </button>
                                <button className="px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">Lưu</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Nhóm */}
            <GroupModalSimple open={groupModal} onClose={() => setGroupModal(false)} onChanged={loadGroups} />
        </div>
    );
}
