import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import PatientCohort from './pages/PatientCohort';
import SystemDiagnostics from './pages/SystemDiagnostics';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="cohort" element={<PatientCohort />} />
          <Route path="diagnostics" element={<SystemDiagnostics />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
