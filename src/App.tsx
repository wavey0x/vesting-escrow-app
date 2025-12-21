import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ScrollToTop from './components/ScrollToTop';
import Create from './pages/Create';
import Manage from './pages/Manage';
import EscrowDetail from './pages/EscrowDetail';

export default function App() {
  return (
    <Layout>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Manage />} />
        <Route path="/create" element={<Create />} />
        <Route path="/view/:address" element={<EscrowDetail />} />
      </Routes>
    </Layout>
  );
}
