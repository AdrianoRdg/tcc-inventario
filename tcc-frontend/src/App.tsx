import { useNavigate, useLocation } from 'react-router'
import './App.css'
import Sidebar from './components/sidebar'
import SubnetPage from './components/subnet-page'
import DevicesPage from './components/devices-page'
import TopologyPage from './components/topology-page'


type Page = "dispositivos" | "sub-redes" | "topologia";

function App() {
  const navigate = useNavigate();
  const location = useLocation();

  // Derivar a página da URL
  const getPageFromPath = (path: string): Page => {
    if (path === "/dispositivos") return "dispositivos";
    if (path === "/topologia") return "topologia";
    return "sub-redes"; // padrão
  };

  const page = getPageFromPath(location.pathname);

  const handleSelect = (pageId: string) => {
    navigate(`/${pageId}`);
  };

  return (
      <div className="flex h-screen bg-[#0d0f14] overflow-hidden">
        <Sidebar active={page} onSelect={handleSelect} />
 
        <main className="flex-1 overflow-y-auto">
          {page === "dispositivos" && <DevicesPage />}
          {page === "sub-redes"    && <SubnetPage />}
          {page === "topologia"    && <TopologyPage />}
        </main>
      </div>
  )
}

export default App
