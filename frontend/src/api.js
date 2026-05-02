// src/api.js
import axios from "axios";

const api = axios.create({
    baseURL: process.env.REACT_APP_API_BASE || "http://localhost:8080",
});

function getToken() {
    return sessionStorage.getItem("access_token") || localStorage.getItem("access_token");
}
function clearToken() {
    sessionStorage.removeItem("access_token");
    localStorage.removeItem("access_token");
}

api.interceptors.request.use((config) => {
    const t = getToken();
    if (t) config.headers.Authorization = `Bearer ${t}`;
    return config;
});

api.interceptors.response.use(
    (res) => res,
    (err) => {
        if (err?.response?.status === 401) {
            clearToken();
            window.location.href = "/login";
        }
        return Promise.reject(err);
    }
);

// Auth
export const auth = {
    login: (username, password) =>
        api.post("/api/auth/login", { username, password }).then((r) => r.data),
};

// Roles
export const roles = {
    list: () => api.get("/api/roles").then((r) => r.data),
    create: (name, description = "") =>
        api.post("/api/roles", { name, description }).then((r) => r.data),
    remove: (id) => api.delete(`/api/roles/${id}`).then((r) => r.data),
    permissions: () => api.get("/api/roles/permissions").then((r) => r.data),
    update: (id, payload) => api.put(`/api/roles/${id}`, payload).then((r) => r.data), // <— bổ sung
};

// Customers
export const customers = {
    list: (params = {}) => api.get("/api/customers", { params }).then((r) => r.data),
    get: (id) => api.get(`/api/customers/${id}`).then((r) => r.data),
    create: (payload) => api.post("/api/customers", payload).then((r) => r.data),
    update: (id, payload) => api.put(`/api/customers/${id}`, payload).then((r) => r.data),
    remove: (id) => api.delete(`/api/customers/${id}`).then((r) => r.data),
};

// Users
export const users = {
    list: (params = {}) => api.get("/api/users", { params }).then((r) => r.data),
    get: (id) => api.get(`/api/users/${id}`).then((r) => r.data),
    create: (payload) => api.post("/api/users", payload).then((r) => r.data),
    update: (id, payload) => api.put(`/api/users/${id}`, payload).then((r) => r.data),
    remove: (id) => api.delete(`/api/users/${id}`).then((r) => r.data),
    listSales: () => api.get("/api/users/sales").then((r) => r.data),
};

// Contracts
export const contracts = {
    list: (params = {}) => api.get("/api/contracts", { params }).then((r) => r.data),
    get: (id) => api.get(`/api/contracts/${id}`).then((r) => r.data),
    create: (payload) => api.post("/api/contracts", payload).then((r) => r.data),
    update: (id, payload) => api.put(`/api/contracts/${id}`, payload).then((r) => r.data),
    patch: (id, payload) => api.patch(`/api/contracts/${id}`, payload).then((r) => r.data),
    remove: (id) => api.delete(`/api/contracts/${id}`).then((r) => r.data),
};

// Payments
export const payments = {
    listByContract: (contractId) => api.get(`/api/payments/by-contract/${contractId}`).then((r) => r.data),
    create: (contractId, payload) => api.post(`/api/payments/by-contract/${contractId}`, payload).then((r) => r.data),
    markPaid: (paymentId, { paidDate, method, note } = {}) =>
        api.patch(`/api/payments/${paymentId}/mark-paid`, null, { params: { paidDate, method, note } })
            .then((r) => r.data),
    remove: (paymentId) => api.delete(`/api/payments/${paymentId}`).then((r) => r.data),
};

export default api;
