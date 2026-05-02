import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./AuthContext";
import { PrivateRoute, RoleGuard } from "./routeGuards";
import Login from "./components/Login";

import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Customers from "./pages/Customers";
import CustomerDetail from "./pages/CustomerDetail";
import Contracts from "./pages/Contracts";
import ContractDetail from "./pages/ContractDetail"; // ✅ thêm
import Payments from "./pages/Payments";
import Events from "./pages/Events";
import Users from "./pages/Users";
import Reports from "./pages/Reports";

// ✅ Toasts
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function Forbidden() {
    return (
        <div className="p-6">
            <h2 className="text-xl font-bold">403 - Không có quyền</h2>
            <p className="text-slate-600 mt-1">Bạn không thể truy cập trang này.</p>
        </div>
    );
}
function NotFound() {
    return (
        <div className="p-6">
            <h2 className="text-xl font-bold">404 - Không tìm thấy trang</h2>
        </div>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    {/* Public */}
                    <Route path="/login" element={<Login />} />

                    {/* Protected wrapper */}
                    <Route
                        path="/"
                        element={
                            <PrivateRoute>
                                <Layout />
                            </PrivateRoute>
                        }
                    >
                        <Route index element={<Navigate to="/dashboard" replace />} />
                        <Route path="dashboard" element={<Dashboard />} />

                        <Route
                            path="customers"
                            element={
                                <RoleGuard roles={["ADMIN", "SALES"]}>
                                    <Customers />
                                </RoleGuard>
                            }
                        />
                        <Route
                            path="customers/:id"
                            element={
                                <RoleGuard roles={["ADMIN", "SALES", "ACCOUNTANT"]}>
                                    <CustomerDetail />
                                </RoleGuard>
                            }
                        />

                        <Route
                            path="contracts"
                            element={
                                <RoleGuard roles={["ADMIN", "SALES"]}>
                                    <Contracts />
                                </RoleGuard>
                            }
                        />
                        <Route
                            path="contracts/:id"
                            element={
                                <RoleGuard roles={["ADMIN", "SALES", "ACCOUNTANT"]}>
                                    <ContractDetail />
                                </RoleGuard>
                            }
                        />

                        <Route
                            path="payments"
                            element={
                                <RoleGuard roles={["ADMIN", "ACCOUNTANT"]}>
                                    <Payments />
                                </RoleGuard>
                            }
                        />

                        {/* ✅ Guard hợp lý theo yêu cầu */}
                        <Route
                            path="events"
                            element={
                                <RoleGuard roles={["ADMIN", "SALES", "ACCOUNTANT"]}>
                                    <Events />
                                </RoleGuard>
                            }
                        />
                        <Route
                            path="reports"
                            element={
                                <RoleGuard roles={["ADMIN", "ACCOUNTANT"]}>
                                    <Reports />
                                </RoleGuard>
                            }
                        />

                        <Route
                            path="users"
                            element={
                                <RoleGuard roles={["ADMIN"]}>
                                    <Users />
                                </RoleGuard>
                            }
                        />
                    </Route>

                    <Route path="/403" element={<Forbidden />} />
                    <Route path="*" element={<NotFound />} />
                </Routes>

                {/* ✅ Toast container dùng chung toàn app */}
                <ToastContainer position="top-right" autoClose={2500} />
            </BrowserRouter>
        </AuthProvider>
    );
}
