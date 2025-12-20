import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Create from './pages/Create';
import Manage from './pages/Manage';
import EscrowDetail from './pages/EscrowDetail';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/create" element={<Create />} />
        <Route path="/view" element={<Manage />} />
        <Route path="/view/:address" element={<EscrowDetail />} />
      </Routes>
    </Layout>
  );
}
