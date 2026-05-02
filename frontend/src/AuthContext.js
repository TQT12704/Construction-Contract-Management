import { createContext, useContext, useMemo, useState, useEffect, useRef } from "react";
import { jwtDecode } from "jwt-decode";
import api from "./api";

const AuthContext = createContext(null);

/** ===== Helpers lưu token theo “Ghi nhớ” ===== **/
const STORAGE_KEY = "access_token";

function getStorages() {
    return {
        get() {
            // Ưu tiên sessionStorage (nếu user không tick "Ghi nhớ"), nếu không có thì lấy localStorage
            return sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY);
        },
        set(token, remember) {
            // dọn cả 2 chỗ trước khi set
            sessionStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(STORAGE_KEY);
            if (remember) localStorage.setItem(STORAGE_KEY, token);
            else sessionStorage.setItem(STORAGE_KEY, token);
        },
        remove() {
            sessionStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(STORAGE_KEY);
        }
    };
}

function normalizeRoles(payload) {
    let raw = payload.roles ?? payload.authorities ?? payload.role ?? payload.scope ?? [];
    if (typeof raw === "string") raw = raw.split(/\s+/).filter(Boolean);
    if (!Array.isArray(raw)) raw = [raw];
    return raw
        .map(r => (typeof r === "string" ? r : String(r)))
        .map(r => (r.startsWith("ROLE_") ? r.slice(5) : r));
}

function parseExpMs(token) {
    try {
        const p = jwtDecode(token);
        // trả về mốc hết hạn (ms) nếu có, ngược lại null
        return typeof p?.exp === "number" ? p.exp * 1000 : null;
    } catch {
        return null;
    }
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const logoutTimerRef = useRef(null);

    const stor = getStorages();

    /** Clear timer auto-logout */
    const clearLogoutTimer = () => {
        if (logoutTimerRef.current) {
            clearTimeout(logoutTimerRef.current);
            logoutTimerRef.current = null;
        }
    };

    /** Đặt hẹn giờ auto-logout theo exp (nếu có) */
    const scheduleAutoLogout = (token) => {
        clearLogoutTimer();
        const expMs = parseExpMs(token);
        if (!expMs) return; // token không có exp -> không hẹn giờ (dựa vào 401)
        const now = Date.now();
        const delay = Math.max(0, expMs - now);
        if (delay === 0) {
            doLogout(true);
            return;
        }
        // Có thể thu ngắn trước vài giây nếu muốn cảnh báo user, ở đây logout đúng thời điểm exp
        logoutTimerRef.current = setTimeout(() => doLogout(true), delay);
    };

    /** Logout dùng chung */
    const doLogout = (silent = false) => {
        clearLogoutTimer();
        stor.remove();
        setUser(null);
        if (!silent) {
            // tuỳ chọn: window.location.assign('/login');
        }
        // Phát sự kiện để crm.html (trang tĩnh) bắt được và tự quay login
        try {
            localStorage.setItem("__logout_pulse__", String(Date.now()));
            setTimeout(() => localStorage.removeItem("__logout_pulse__"), 0);
        } catch {}
    };

    /** Khởi tạo từ token có sẵn */
    useEffect(() => {
        const t = stor.get();
        if (t) {
            try {
                const expMs = parseExpMs(t);
                if (expMs && expMs <= Date.now()) {
                    // hết hạn -> xoá
                    doLogout(true);
                } else {
                    const p = jwtDecode(t);
                    setUser({ username: p.sub || p.username, roles: normalizeRoles(p) });
                    scheduleAutoLogout(t);
                }
            } catch {
                doLogout(true);
            }
        }
        setLoading(false);
        // dọn timer khi unmount
        return clearLogoutTimer;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /** Login */
    const login = async (username, password, remember = false) => {
        const { data } = await api.post("/api/auth/login", { username, password });
        const token = data.token || data.accessToken;
        if (!token) throw new Error("Thiếu access token từ server");
        stor.set(token, !!remember);
        const p = jwtDecode(token);
        setUser({ username: p.sub || p.username, roles: normalizeRoles(p) });
        scheduleAutoLogout(token);
    };

    /** Logout (public) */
    const logout = () => doLogout(false);

    const value = useMemo(() => ({ user, loading, login, logout }), [user, loading]);
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
export const hasRole = (user, ...roles) => !!user?.roles && roles.some(r => user.roles.includes(r));
