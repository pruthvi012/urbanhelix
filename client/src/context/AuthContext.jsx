import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import { requestForToken } from '../firebase';

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
            try {
                setUser(JSON.parse(savedUser));
            } catch (e) {
                localStorage.removeItem('urbanhelix_token');
                localStorage.removeItem('urbanhelix_user');
            }
            requestForToken().catch(() => {});
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
            requestForToken().catch(() => {});
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
            requestForToken().catch(() => {});
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

    const loginWithOTP = async (phone, otp) => {
        const { data } = await authAPI.verifyOTP(phone, otp);
        if (data.success) {
            localStorage.setItem('urbanhelix_token', data.token);
            localStorage.setItem('urbanhelix_user', JSON.stringify(data.user));
            setToken(data.token);
            setUser(data.user);
            requestForToken().catch(() => {});
            return data;
        }
        throw new Error(data.message);
    };

    return (
        <AuthContext.Provider value={{ user, token, loading, login, register, logout, loginWithOTP }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
