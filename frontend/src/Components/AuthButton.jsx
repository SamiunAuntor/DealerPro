import React from "react";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useAuth } from "../Contexts/AuthContext";

function AuthButton() {
    const navigate = useNavigate();
    const { logout } = useAuth();

    const handleLogout = async () => {
        await logout();
        navigate("/", { replace: true });
    };

    return (
        <button
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-wider text-gray-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            onClick={handleLogout}
            type="button"
        >
            <LogOut size={14} />
            Logout
        </button>
    );
}

export default AuthButton;
