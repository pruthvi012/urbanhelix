import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const savedToken = localStorage.getItem('urbanhelix_token');
        const savedUser = localStorage.getItem('urbanhelix_user');
        if (savedToken && savedUser) {
            setToken(savedToken);
            setUser(JSON.parse(savedUser));
        }
        setLoading(false);
    }, []);

    const login = async (email, password) => {
        const { data } = await authAPI.login({ email, password });
        if (data.success) {
            localStorage.setItem('urbanhelix_token', data.token);
            localStorage.setItem('urbanhelix_user', JSON.stringify(data.user));
            setToken(data.token);
            setUser(data.user);
            return data;
        }
        throw new Error(data.message);
    };

    const register = async (userData) => {
        const { data } = await authAPI.register(userData);
        if (data.success) {
            localStorage.setItem('urbanhelix_token', data.token);
            localStorage.setItem('urbanhelix_user', JSON.stringify(data.user));
            setToken(data.token);
            setUser(data.user);
            return data;
        }
        throw new Error(data.message);
    };

    const logout = () => {
        localStorage.removeItem('urbanhelix_token');
        localStorage.removeItem('urbanhelix_user');
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
