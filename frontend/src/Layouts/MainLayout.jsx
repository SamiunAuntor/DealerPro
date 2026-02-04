import React, { useEffect, useState } from 'react';
import {
    LayoutGrid,
    Package,
    Users,
    Wallet,
    BarChart3,
    Menu,
    X
} from 'lucide-react';
import { Outlet, NavLink } from 'react-router-dom';
import { Tooltip } from 'react-tooltip';
import 'react-tooltip/dist/react-tooltip.css';

const MainLayout = ({ children }) => {

    const [isOpen, setIsOpen] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());

    const navItems = [
        { name: 'Home', icon: <LayoutGrid size={22} />, href: '/' },
        { name: 'Inventory', icon: <Package size={22} />, href: '/inventory' },
        { name: 'Customers', icon: <Users size={22} />, href: '/customers' },
        { name: 'Company Due', icon: <Wallet size={22} />, href: '/company-due' },
        { name: 'Analytics', icon: <BarChart3 size={22} />, href: '/analytics' },
    ];

    const formatDate = (date) => date.toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric'
    });

    const formatTime = (date) => date.toLocaleTimeString('en-US', {
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
    });

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="flex h-screen bg-gray-100 text-gray-800 font-sans antialiased">
            <Tooltip id="nav-tooltip" place="right" className="z-50 !bg-gray-800 !text-[#3cc720] !font-bold" />

            {/* SIDEBAR */}
            <aside className={`
                fixed inset-y-0 left-0 z-50 w-20 bg-[#111827] text-gray-300 transform transition-transform duration-300 ease-in-out
                lg:relative lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <div className="flex flex-col h-full items-center">
                    <nav className="flex-1 w-full px-2 py-6 space-y-4">
                        {navItems.map((item) => (
                            <NavLink
                                key={item.name}
                                to={item.href}
                                data-tooltip-id="nav-tooltip"
                                data-tooltip-content={item.name}
                                // The 'isActive' argument is provided by NavLink automatically
                                className={({ isActive }) => `
                                    flex items-center justify-center w-full py-3 transition-all rounded-md group
                                    ${isActive
                                        ? 'text-[#3cc720] bg-gray-800/50'
                                        : 'hover:bg-gray-800 hover:text-[#3cc720]'
                                    }
                                `}
                            >
                                {({ isActive }) => (
                                    <span className={`transition-transform ${isActive ? 'scale-120' : 'group-hover:scale-120'}`}>
                                        {item.icon}
                                    </span>
                                )}
                            </NavLink>
                        ))}
                    </nav>

                    <button onClick={() => setIsOpen(false)} className="lg:hidden p-4 text-gray-400 hover:text-white">
                        <X size={24} />
                    </button>
                </div>
            </aside>

            {/* CONTENT */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <header className="h-16 flex items-center justify-between px-6 bg-white border-b border-gray-200 lg:px-7 shrink-0">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsOpen(true)}
                            className="p-2 text-gray-600 lg:hidden hover:bg-gray-100 rounded-lg"
                        >
                            <Menu size={24} />
                        </button>

                        <span className="text-xl font-black tracking-tighter text-gray-900 uppercase">
                            Dealer <span className="text-[#3cc720]">Pro</span>
                        </span>
                    </div>

                    <div className="flex items-center">
                        <div className="text-right">
                            <div className="flex flex-col items-end">
                                <p className="text-sm font-bold text-gray-800 tabular-nums tracking-wider uppercase">
                                    {formatTime(currentTime)}
                                </p>
                                <p className="text-[11px] font-bold text-[#3cc720] tabular-nums tracking-widest uppercase">
                                    {formatDate(currentTime)}
                                </p>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto bg-white relative">
                    {children || (
                        <div className="absolute inset-0 flex items-center justify-center p-4 text-center">
                            <Outlet />
                        </div>
                    )}
                </main>
            </div>

            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-gray-900/20 backdrop-blur-[2px] z-40 lg:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}
        </div>
    );
};

export default MainLayout;