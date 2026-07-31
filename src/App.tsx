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
import Home from './pages/Home';
import Campinho from './pages/Campinho';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/s/:token" element={<SharedAnalysis />} />

            {/* Home do analista, primeira tela depois do login */}
            <Route path="/" element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            } />

            <Route path="/nova-analise" element={
              <ProtectedRoute>
                <CreateAnalysis />
              </ProtectedRoute>
            } />

            <Route path="/campinho" element={
              <ProtectedRoute>
                <Campinho />
              </ProtectedRoute>
            } />

            <Route path="/biblioteca" element={
              <ProtectedRoute>
                <MyAnalyses />
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

            {/* Rota antiga: mantida para nao quebrar links salvos */}
            <Route path="/minhas-analises" element={<Navigate to="/biblioteca" replace />} />

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
