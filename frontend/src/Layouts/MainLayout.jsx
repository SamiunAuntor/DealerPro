import React, { useEffect, useState } from "react";
import {
    FileText,
    LayoutGrid,
    LogOut,
    Menu,
    Package,
    ShoppingCart,
    Users,
    Wallet,
    X,
} from "lucide-react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { Tooltip } from "react-tooltip";
import "react-tooltip/dist/react-tooltip.css";
import { useAuth } from "../Contexts/AuthContext";

function MainLayout({ children }) {
    const [isOpen, setIsOpen] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    const navigate = useNavigate();
    const { logout } = useAuth();

    const navItems = [
        { name: "Home", icon: <LayoutGrid size={22} />, href: "/dashboard" },
        { name: "Product Inventory", icon: <Package size={22} />, href: "/inventory" },
        { name: "Customer Directory", icon: <Users size={22} />, href: "/customers" },
        { name: "POS", icon: <ShoppingCart size={22} />, href: "/pos" },
        { name: "Sales History", icon: <FileText size={22} />, href: "/sales" },
        { name: "Company Due", icon: <Wallet size={22} />, href: "/company-due" },
    ];

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="flex h-screen bg-gray-100 font-sans text-gray-800 antialiased">
            <Tooltip id="nav-tooltip" place="right" className="z-50 !bg-gray-800 !font-bold !text-[#3cc720]" />

            <aside
                className={`
                    fixed inset-y-0 left-0 z-50 w-20 transform bg-[#111827] text-gray-300 transition-transform duration-300 ease-in-out
                    lg:relative lg:translate-x-0 ${isOpen ? "translate-x-0" : "-translate-x-full"}
                `}
            >
                <div className="flex h-full flex-col items-center">
                    <nav className="flex-1 w-full space-y-4 px-2 py-6">
                        {navItems.map((item) => (
                            <NavLink
                                key={item.name}
                                to={item.href}
                                data-tooltip-id="nav-tooltip"
                                data-tooltip-content={item.name}
                                className={({ isActive }) => `
                                    flex w-full items-center justify-center rounded-md py-3 transition-all group
                                    ${isActive ? "bg-gray-800/50 text-[#3cc720]" : "hover:bg-gray-800 hover:text-[#3cc720]"}
                                `}
                            >
                                {({ isActive }) => (
                                    <span className={`transition-transform ${isActive ? "scale-120" : "group-hover:scale-120"}`}>
                                        {item.icon}
                                    </span>
                                )}
                            </NavLink>
                        ))}
                    </nav>

                    <div className="w-full px-2 pb-4">
                        <button
                            className="flex w-full items-center justify-center rounded-md py-3 text-gray-300 transition hover:bg-red-500/10 hover:text-red-400"
                            data-tooltip-id="nav-tooltip"
                            data-tooltip-content="Logout"
                            onClick={async () => {
                                await logout();
                                navigate("/", { replace: true });
                            }}
                            type="button"
                        >
                            <LogOut size={22} />
                        </button>
                    </div>

                    <button className="p-4 text-gray-400 hover:text-white lg:hidden" onClick={() => setIsOpen(false)} type="button">
                        <X size={24} />
                    </button>
                </div>
            </aside>

            <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                <header className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6 lg:px-7">
                    <div className="flex items-center gap-4">
                        <button
                            className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 lg:hidden"
                            onClick={() => setIsOpen(true)}
                            type="button"
                        >
                            <Menu size={24} />
                        </button>
                        <span className="text-xl font-black uppercase tracking-tighter text-gray-900">
                            Dealer <span className="text-[#3cc720]">Pro</span>
                        </span>
                    </div>

                    <div className="ml-auto text-right">
                        <p className="text-sm font-bold uppercase tracking-wider text-gray-800">
                            {currentTime.toLocaleTimeString("en-US", {
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                                hour12: true,
                            })}
                        </p>
                        <p className="text-[11px] font-bold uppercase tracking-widest text-[#3cc720]">
                            {currentTime.toLocaleDateString("en-GB", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                            })}
                        </p>
                    </div>
                </header>

                <main className="relative flex-1 overflow-y-auto bg-white">
                    {children || (
                        <div className="min-h-full p-4">
                            <Outlet />
                        </div>
                    )}
                </main>
            </div>

            {isOpen && (
                <div
                    className="fixed inset-0 z-40 bg-gray-900/20 backdrop-blur-[2px] lg:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}
        </div>
    );
}

export default MainLayout;
