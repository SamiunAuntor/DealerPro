import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Navigate, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { useAuth } from "../Contexts/AuthContext";

function LoginPage() {
    const navigate = useNavigate();
    const { isAuthenticated, isAuthLoading, login } = useAuth();
    const [email, setEmail] = useState("admin@gmail.com");
    const [password, setPassword] = useState("");
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isAuthLoading && isAuthenticated) {
        return <Navigate replace to="/dashboard" />;
    }

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!email.trim() || !password) {
            Swal.fire("Missing Fields", "Please enter your email and password.", "warning");
            return;
        }

        setIsSubmitting(true);

        try {
            await login({
                email: email.trim(),
                password,
            });
            navigate("/dashboard", { replace: true });
        } catch (error) {
            Swal.fire(
                "Access Denied",
                error.response?.data?.message || "Invalid email or password.",
                "error"
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_#dcfce7,_#f8fafc_45%,_#e5e7eb)] px-4 py-10">
            <div className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
                <div className="border-b border-gray-100 bg-gray-50/70 px-6 py-6 text-left">
                    <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#3cc720]">
                        Dealer Pro
                    </p>
                    <h1 className="mt-2 text-3xl font-black uppercase tracking-tight text-[#111827]">
                        Secure Login
                    </h1>
                    <p className="mt-2 text-sm font-medium text-gray-500">
                        Sign in to access the dealer dashboard and operations modules.
                    </p>
                </div>

                <form className="space-y-5 px-6 py-6" onSubmit={handleSubmit}>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                            Email
                        </label>
                        <input
                            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-800 outline-none transition focus:border-[#3cc720]"
                            onChange={(event) => setEmail(event.target.value)}
                            placeholder="Enter admin email"
                            type="email"
                            value={email}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                            Password
                        </label>
                        <div className="relative">
                            <input
                                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 pr-12 text-sm font-semibold text-gray-800 outline-none transition focus:border-[#3cc720]"
                                onChange={(event) => setPassword(event.target.value)}
                                placeholder="Enter password"
                                type={isPasswordVisible ? "text" : "password"}
                                value={password}
                            />
                            <button
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gray-700"
                                onClick={() => setIsPasswordVisible((prev) => !prev)}
                                type="button"
                            >
                                {isPasswordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <button
                        className="w-full rounded-xl bg-[#111827] px-4 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-[#3cc720] shadow-lg transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={isSubmitting}
                        type="submit"
                    >
                        {isSubmitting ? "Signing In..." : "Login"}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default LoginPage;
