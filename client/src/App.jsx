import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import FeedbackForm from './pages/FeedbackForm';
import AdminLogin from './pages/AdminLogin';
import Dashboard from './pages/Dashboard';
import Responses from './pages/Responses';
import QuestionManager from './pages/QuestionManager';
import TrainerManager from './pages/TrainerManager';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<FeedbackForm />} />
                <Route path="/admin" element={<AdminLogin />} />

                <Route path="/admin/dashboard" element={
                    <ProtectedRoute>
                        <Dashboard />
                    </ProtectedRoute>
                } />
                <Route path="/admin/responses" element={
                    <ProtectedRoute>
                        <Responses />
                    </ProtectedRoute>
                } />
                <Route path="/admin/questions" element={
                    <ProtectedRoute>
                        <QuestionManager />
                    </ProtectedRoute>
                } />
                <Route path="/admin/trainers" element={
                    <ProtectedRoute>
                        <TrainerManager />
                    </ProtectedRoute>
                } />

                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
        </Router>
    );
}

export default App;
