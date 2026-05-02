// src/services/users.js
import api from "../api";

const PAGE_SIZE_DEFAULT = 10;

// ---- helpers ----
const emptyToNull = (v) => (v === undefined || v === null || String(v).trim() === "" ? null : v);

export function toUiUser(u) {
    return {
        id: u.id,
        username: u.username,
        fullName: u.fullName || u.name || u.username,
        email: u.email || null,
        phone: u.phone || null,
        // BE có thể trả "role" hoặc "roleName"
        role: (u.roleName || u.role || "").replace(/^ROLE_/, ""),
        active: u.active !== false,
        status: u.active === false ? "INACTIVE" : "ACTIVE",
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
    };
}

export function toUpdateDto(form) {
    return {
        fullName: form.fullName.trim(),               // REQUIRED
        email: emptyToNull(form.email),
        phone: emptyToNull(form.phone),
        roleName: emptyToNull(form.role),              // optional
        active: form.status === "ACTIVE",              // optional
    };
}

export function toCreateDto(form) {
    // Tùy BE của bạn có yêu cầu password không; nếu có, thêm vào đây.
    return {
        username: form.username.trim(),
        fullName: form.fullName.trim(),
        email: emptyToNull(form.email),
        phone: emptyToNull(form.phone),
        roleName: form.role || "SALES",
        active: form.status === "ACTIVE",
        password: emptyToNull(form.password)
    };
}

// ---- API ----
export async function fetchUsers({ page = 0, size = PAGE_SIZE_DEFAULT } = {}) {
    const { data } = await api.get("/api/users", { params: { page, size, sort: "id,desc" } });
    const list = Array.isArray(data) ? data : (data?.content || []);
    const totalPages = Array.isArray(data) ? 1 : (data?.totalPages ?? 1);
    return { rows: list.map(toUiUser), totalPages };
}

export async function createUser(form) {
    const payload = toCreateDto(form);
    return api.post("/api/users", payload);
}

export async function updateUser(id, form) {
    const payload = toUpdateDto(form);
    return api.put(`/api/users/${id}`, payload);
}

export async function deleteUser(id) {
    return api.delete(`/api/users/${id}`);
}
