import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import CreateAnalysis from './pages/CreateAnalysis';
import Analysis from './pages/Analysis';
import MyAnalyses from './pages/MyAnalyses';
import Login from './pages/Login';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import AdminDashboard from './pages/AdminDashboard';
import SharedAnalysis from './pages/SharedAnalysis';
import FullAnalysisPage from './pages/FullAnalysisPage';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/s/:token" element={<SharedAnalysis />} />

            <Route path="/" element={
              <ProtectedRoute>
                <CreateAnalysis />
              </ProtectedRoute>
            } />

            <Route path="/analise" element={
              <ProtectedRoute>
                <Analysis />
              </ProtectedRoute>
            } />

            <Route path="/analise/:id" element={
              <ProtectedRoute>
                <Analysis />
              </ProtectedRoute>
            } />

            <Route path="/analysis/saved/:id" element={
              <ProtectedRoute>
                <Analysis />
              </ProtectedRoute>
            } />

            <Route path="/analysis-complete/saved/:id" element={
              <ProtectedRoute>
                <FullAnalysisPage />
              </ProtectedRoute>
            } />

            <Route path="/minhas-analises" element={
              <ProtectedRoute>
                <MyAnalyses />
              </ProtectedRoute>
            } />

            <Route path="/admin" element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            } />

            {/* Catch all redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
