import { Navigate } from "react-router-dom";
import { useAuth, hasRole } from "./AuthContext";

export function PrivateRoute({ children }) {
    const { user, loading } = useAuth();
    if (loading) return null;
    return user ? children : <Navigate to="/login" replace />;
}
export function RoleGuard({ roles, children }) {
    const { user } = useAuth();
    return hasRole(user, ...roles) ? children : <Navigate to="/403" replace />;
}
