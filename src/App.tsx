import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MatchSelection from './pages/MatchSelection';
import Analysis from './pages/Analysis';
import MyAnalyses from './pages/MyAnalyses';



function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MatchSelection />} />
        <Route path="/analise" element={<Analysis />} />

        <Route path="/analise/:id" element={<Analysis />} />
        <Route path="/analysis/saved/:id" element={<Analysis />} />
        <Route path="/minhas-analises" element={<MyAnalyses />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
