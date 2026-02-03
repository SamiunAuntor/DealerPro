import React from 'react';
import { Link } from 'react-router-dom';
import { FileQuestion, ArrowLeft } from 'lucide-react';

const Error404Page = () => {
    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] bg-white px-6 text-center">

            {/* Error Message */}
            <h1 className="text-7xl font-black text-gray-900 tracking-tighter mb-2">
                404
            </h1>
            <h2 className="text-xl font-bold text-gray-800 mb-3 uppercase tracking-wide">
                Page Not Found
            </h2>
            <p className="max-w-md text-gray-500 text-sm leading-relaxed mb-10">
                The module or section you are looking for doesn't exist or has been moved.
                Please check the URL or return to the dashboard.
            </p>

            {/* Action Button */}
            <Link
                to="/"
                className="group flex items-center gap-2 bg-[#111827] text-white px-8 py-3 rounded-lg font-semibold text-sm transition-all hover:bg-gray-800 shadow-lg shadow-gray-200 active:scale-95"
            >
                <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                Back to Dashboard
            </Link>

        </div>
    );
};

export default Error404Page;