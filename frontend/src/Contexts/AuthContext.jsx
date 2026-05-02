import { createContext, useContext, useEffect, useState } from "react";
import useAxios from "../Hooks/UseAxios";

const AuthContext = createContext(null);

function AuthProvider({ children }) {
    const axios = useAxios();
    const [user, setUser] = useState(null);
    const [isAuthLoading, setIsAuthLoading] = useState(true);

    const refreshSession = async () => {
        try {
            const response = await axios.get("/auth/session");
            setUser(response.data.user || null);
        } catch (error) {
            setUser(null);
        } finally {
            setIsAuthLoading(false);
        }
    };

    useEffect(() => {
        refreshSession();
    }, []);

    const login = async (payload) => {
        const response = await axios.post("/auth/login", payload);
        setUser(response.data.user || null);
        return response.data;
    };

    const logout = async () => {
        try {
            await axios.post("/auth/logout");
        } finally {
            setUser(null);
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated: Boolean(user),
                isAuthLoading,
                login,
                logout,
                refreshSession,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error("useAuth must be used inside AuthProvider");
    }

    return context;
}

export { AuthProvider, useAuth };
