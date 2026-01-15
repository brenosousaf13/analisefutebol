import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MatchSelection from './pages/MatchSelection';
import Analysis from './pages/Analysis';
import MyAnalyses from './pages/MyAnalyses';
import { SidebarProvider } from './contexts/SidebarContext';


function App() {
  return (
    <SidebarProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MatchSelection />} />
          <Route path="/analise" element={<Analysis />} />
          <Route path="/analise/:id" element={<Analysis />} />
          <Route path="/minhas-analises" element={<MyAnalyses />} />
        </Routes>
      </BrowserRouter>
    </SidebarProvider>
  );
}

export default App;
