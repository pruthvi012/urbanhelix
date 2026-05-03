import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { onMessageListener } from './firebase';
import Layout from './components/Layout';
import Login from './pages/Login';
import Install from './pages/Install';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import Milestones from './pages/Milestones';
import Funds from './pages/Funds';
import Grievances from './pages/Grievances';
import Audit from './pages/Audit';
import Analytics from './pages/Analytics';
import ContractorExpenses from './pages/ContractorExpenses';
import './index.css';
import GlobalTamperWarning from './components/GlobalTamperWarning';

function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();
    if (loading) return <div className="loading"><div className="spinner"></div> Loading...</div>;
    if (!user) return <Navigate to="/login" replace />;
    return children;
}

function PublicRoute({ children }) {
    const { user, loading } = useAuth();
    if (loading) return <div className="loading"><div className="spinner"></div> Loading...</div>;
    if (user) return <Navigate to="/" replace />;
    return children;
}

function AppRoutes() {
    return (
        <>
            <GlobalTamperWarning />
            <Routes>
                <Route path="/install" element={<Install />} />
                <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
                <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                    <Route index element={<Dashboard />} />
                    <Route path="projects" element={<Projects />} />
                    <Route path="projects/:id" element={<ProjectDetail />} />
                    <Route path="milestones" element={<Milestones />} />
                    <Route path="funds" element={<Funds />} />
                    <Route path="grievances" element={<Grievances />} />
                    <Route path="audit" element={<Audit />} />
                    <Route path="analytics" element={<Analytics />} />
                    <Route path="expenses" element={<ContractorExpenses />} />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </>
    );
}

export default function App() {
    useEffect(() => {
        const unsubscribe = onMessageListener((payload) => {
            console.log('Foreground message received:', payload);
            // You can use a toast here instead of alert for better UX, but alert works for testing
            alert(`${payload.notification.title}\n\n${payload.notification.body}`);
        });

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, []);

    return (
        <BrowserRouter>
            <AuthProvider>
                <AppRoutes />
            </AuthProvider>
        </BrowserRouter>
    );
}
