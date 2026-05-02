import React, { useState } from "react";
import { useAuth } from "../AuthContext";
import { useNavigate } from "react-router-dom";

export default function Login() {
    const { login } = useAuth();
    const nav = useNavigate();
    const [form, setForm] = useState({ username: "", password: "", remember: false });
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState("");

    const onChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm((s) => ({ ...s, [name]: type === "checkbox" ? checked : value }));
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        setErr("");
        setLoading(true);
        try {
            await login(form.username, form.password);
            nav("/dashboard", { replace: true });
        } catch (error) {
            const msg =
                error?.response?.data?.message ||
                error?.response?.data?.error ||
                "Đăng nhập thất bại";
            setErr(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="construction-gradient min-h-screen flex items-center justify-center p-4 relative font-[Inter]">
            <div className="absolute inset-0 opacity-5 pointer-events-none">
                <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <pattern id="construction-pattern" x="0" y="0" width="120" height="120" patternUnits="userSpaceOnUse">
                            <circle cx="30" cy="30" r="1.5" fill="white"/>
                            <circle cx="90" cy="90" r="1.5" fill="white"/>
                            <circle cx="60" cy="60" r="1" fill="white"/>
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#construction-pattern)"/>
                </svg>
            </div>

            <div className="glass-effect rounded-3xl soft-shadow p-10 w-full max-w-md relative z-10 bg-white/85 border border-white/20 backdrop-blur-xl">
                <div className="text-center mb-10">
                    <div className="construction-icon inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl mb-6 shadow-lg">
                        <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 3L2 12h3v8h6v-6h2v6h6v-8h3L12 3zm0 2.5l6 6V19h-2v-6H8v6H6v-7.5l6-6z"/>
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-700 mb-3">Quản lý xây dựng</h1>
                    <p className="text-gray-500 text-base">Đăng nhập vào hệ thống quản lý dự án</p>
                </div>

                {err && <div className="text-red-600 text-sm mb-4">{err}</div>}

                <form onSubmit={onSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                            Email hoặc tên đăng nhập
                        </label>
                        <div className="relative transition-transform">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                                </svg>
                            </div>
                            <input
                                id="username"
                                name="username"
                                type="text"
                                required
                                value={form.username}
                                onChange={onChange}
                                placeholder="Nhập email hoặc tên đăng nhập"
                                className="input-focus block w-full pl-10 pr-3 py-4 border border-gray-200 rounded-xl focus:outline-none transition-all duration-300 bg-gray-50/50 focus:border-emerald-500 focus:ring-emerald-500/10"
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                            Mật khẩu
                        </label>
                        <div className="relative transition-transform">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                                </svg>
                            </div>
                            <input
                                id="password"
                                name="password"
                                type={showPw ? "text" : "password"}
                                required
                                value={form.password}
                                onChange={onChange}
                                placeholder="Nhập mật khẩu"
                                className="input-focus block w-full pl-10 pr-10 py-4 border border-gray-200 rounded-xl focus:outline-none transition-all duration-300 bg-gray-50/50 focus:border-emerald-500 focus:ring-emerald-500/10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPw((s) => !s)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                aria-label="Toggle password"
                            >
                                {showPw ? (
                                    <svg className="h-5 w-5 text-gray-500 hover:text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                              d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"/>
                                    </svg>
                                ) : (
                                    <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center">
                        <input
                            id="remember"
                            name="remember"
                            type="checkbox"
                            checked={form.remember}
                            onChange={onChange}
                            className="h-4 w-4 text-emerald-500 focus:ring-emerald-400 border-gray-300 rounded"
                        />
                        <label htmlFor="remember" className="ml-2 block text-sm text-gray-600">
                            Ghi nhớ đăng nhập
                        </label>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-hover w-full flex justify-center items-center py-4 px-6 border border-transparent rounded-xl shadow-lg text-base font-semibold text-white bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all duration-300 disabled:opacity-70"
                    >
                        {loading ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor"
                                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                                </svg>
                                Đang đăng nhập...
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                          d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"/>
                                </svg>
                                Đăng nhập
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-8 text-center text-sm text-gray-400">
                    © 2025 Hệ thống quản lý xây dựng
                </div>
            </div>

            <style>{``}</style>
        </div>
    );
}
