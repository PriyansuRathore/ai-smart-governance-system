import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './auth.jsx';
import ErrorBoundary      from './components/ErrorBoundary';
import Navbar             from './components/Navbar';
import ProtectedRoute     from './components/ProtectedRoute';
import Home               from './pages/Home';
import SubmitComplaint    from './pages/SubmitComplaint';
import AdminDashboard     from './pages/AdminDashboard';
import DepartmentDashboard from './pages/DepartmentDashboard';
import Login              from './pages/Login';
import Register           from './pages/Register';
import NotFound           from './pages/NotFound';
import TrackComplaint     from './pages/TrackComplaint';
import PublicFeed          from './pages/PublicFeed';
import TicketPage          from './pages/TicketPage';
import ProfilePage         from './pages/ProfilePage';
import AnalyticsPage       from './pages/AnalyticsPage';
import MapPage             from './pages/MapPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
        <Navbar />
        <ErrorBoundary>
          <Routes>
            <Route path="/"         element={<Home />} />
            <Route path="/login"    element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route path="/submit" element={
              <ProtectedRoute allowedRoles={['citizen', 'admin']}>
                <SubmitComplaint />
              </ProtectedRoute>
            } />

            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            } />

            <Route path="/department" element={
              <ProtectedRoute allowedRoles={['department', 'admin']}>
                <DepartmentDashboard />
              </ProtectedRoute>
            } />

            <Route path="/track"        element={<TrackComplaint />} />
            <Route path="/feed"         element={<PublicFeed />} />
            <Route path="/ticket/:id"   element={<TicketPage />} />
            <Route path="/profile"      element={<ProfilePage />} />
            <Route path="/analytics"    element={<AnalyticsPage />} />
            <Route path="/map"          element={<MapPage />} />
            <Route path="/404"          element={<NotFound />} />
            <Route path="*"      element={<NotFound />} />
          </Routes>
        </ErrorBoundary>
      </BrowserRouter>
    </AuthProvider>
  );
}
