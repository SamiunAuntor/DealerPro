import React from "react";
import { Navigate } from "react-router-dom";
import MainLayout from "../Layouts/MainLayout";
import { useAuth } from "../Contexts/AuthContext";

function ProtectedLayout() {
    const { isAuthenticated, isAuthLoading } = useAuth();

    if (isAuthLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
                <div className="rounded-xl border border-gray-200 bg-white px-6 py-5 text-sm font-semibold text-gray-600 shadow-sm">
                    Checking session...
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate replace to="/" />;
    }

    return <MainLayout />;
}

export default ProtectedLayout;
