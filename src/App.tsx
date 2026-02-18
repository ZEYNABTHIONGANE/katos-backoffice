import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { AuthListener } from './components/AuthListener';
import { DataInitializer } from './components/DataInitializer';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/layout/Layout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Clients } from './pages/Clients';
import { Projects } from './pages/Projects';
import { Chantiers } from './pages/Chantiers';
import { ChantierDetail } from './pages/ChantierDetail';
import { Boutique } from './pages/Boutique';
import { Documents } from './pages/Documents';
import { Users } from './pages/Users';
import { Prospects } from './pages/Prospects';
import { Showcase } from './pages/Showcase';
import { Settings } from './pages/Settings';
import { AccountingDashboard } from './pages/AccountingDashboard';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  return (
    <Router>
      <AuthListener>
        <DataInitializer>
          <div className="App">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="prospects" element={<Prospects />} />
                <Route path="clients" element={<Clients />} />
                <Route path="projects" element={<Projects />} />
                <Route path="chantiers" element={<Chantiers />} />
                <Route path="chantiers/:id" element={<ChantierDetail />} />
                <Route path="chantiers/:id" element={<ChantierDetail />} />
                <Route path="boutique" element={<Boutique />} />
                <Route path="accounting" element={<AccountingDashboard />} />
                <Route path="documents" element={<Documents />} />
                <Route path="users" element={<Users />} />
                <Route path="showcase" element={<Showcase />} />
                <Route path="settings" element={<Settings />} />
              </Route>
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
            <ToastContainer
              position="top-right"
              autoClose={3000}
              hideProgressBar={false}
              newestOnTop={false}
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
              theme="light"
            />
          </div>
        </DataInitializer>
      </AuthListener>
    </Router>
  );
}

export default App;
