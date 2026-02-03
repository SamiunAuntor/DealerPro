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
import { Outlet } from 'react-router-dom';

const MainLayout = ({ children }) => {

    const [isOpen, setIsOpen] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());


    const navItems = [
        { name: 'Home', icon: <LayoutGrid size={18} />, href: '/' },
        { name: 'Inventory', icon: <Package size={18} />, href: '/inventory' },
        { name: 'Customers', icon: <Users size={18} />, href: '/customers' },
        { name: 'Company Due', icon: <Wallet size={18} />, href: '/company-due' },
        { name: 'Analytics', icon: <BarChart3 size={18} />, href: '/analytics' },
    ];


    const formatDate = (date) => date.toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric'
    });

    const formatTime = (date) => date.toLocaleTimeString('en-US', {
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
    });

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer); // Cleanup on unmount
    }, []);

    return (
        <div className="flex h-screen bg-gray-100 text-gray-800 font-sans antialiased">
            {/* SIDEBAR */}
            <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-[#111827] text-gray-300 transform transition-transform duration-300 ease-in-out
        lg:relative lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
                <div className="flex flex-col h-full">
                    {/* Minimal Header */}
                    <div className="flex items-center justify-between h-20 px-8">
                        <span className="text-xl font-bold tracking-tight text-white uppercase">
                            Dealer<span className="text-[#3cc720]">Pro</span>
                        </span>
                        <button onClick={() => setIsOpen(false)} className="lg:hidden text-gray-400 hover:text-white">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Nav Links */}
                    <nav className="flex-1 px-4 py-4 space-y-1">
                        {navItems.map((item) => (
                            <a
                                key={item.name}
                                href={item.href}
                                className="flex items-center gap-4 px-4 py-3 transition-all rounded-md hover:bg-gray-800 hover:text-[#3cc720] group"
                            >
                                <span className="group-hover:scale-110 transition-transform">
                                    {item.icon}
                                </span>
                                <span className="text-[15px] font-medium tracking-wide">{item.name}</span>
                            </a>
                        ))}
                    </nav>


                </div>
            </aside>

            {/* CONTENT */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Top Navbar */}
                <header className="h-16 flex items-center justify-between px-6 bg-white/50 backdrop-blur-md border-b border-gray-200 lg:px-10">
                    <button
                        onClick={() => setIsOpen(true)}
                        className="p-2 text-gray-600 lg:hidden hover:bg-gray-200 rounded-lg"
                    >
                        <Menu size={24} />
                    </button>

                    <div className="flex items-center ml-auto">
                        <div className="text-right">
                            <div className="flex flex-col items-end">
                                <p className="text-sm font-bold text-gray-800 tabular-nums tracking-wider">
                                    {formatTime(currentTime)}
                                </p>
                                {/* Date */}
                                <p className="text-sm font-bold text-[#3cc720] tabular-nums">
                                    {formatDate(currentTime)}
                                </p>
                                {/* Time */}

                            </div>
                        </div>
                    </div>

                </header>

                {/* Workspace */}
                {/* Main Content: Full Height & Width */}
                <main className="flex-1 overflow-y-auto bg-white relative">
                    {children || (
                        <div className="absolute inset-0 flex items-center justify-center p-8 text-center">
                            <Outlet>
                                {/* Load all sections dynamically here */}
                            </Outlet>
                        </div>
                    )}
                </main>
            </div>

            {/* Mobile Blur Overlay */}
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