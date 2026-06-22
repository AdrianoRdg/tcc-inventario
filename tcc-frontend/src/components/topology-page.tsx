import { useState } from "react";
import NetworkTopology from "./NetworkTopology";
import { topologyService } from "../services/topologyService";
import type { TopologyNode } from "../services/topologyService";

export default function TopologyPage() {
  // 1. Inicialização "preguiçosa" do estado:
  // O React roda essa função apenas no primeiro carregamento do componente.
  const [topologyData, setTopologyData] = useState<TopologyNode[]>(() => {
    try {
      const savedTopology = localStorage.getItem("network_topology_cache");
      if (savedTopology) {
        return JSON.parse(savedTopology);
      }
    } catch (error) {
      console.error("Erro ao ler o cache da topologia do localStorage:", error);
    }
    return []; // Retorna o array vazio padrão se não tiver nada salvo
  });

  const [isLoading, setIsLoading] = useState(false);

  // O useEffect que causava o erro foi deletado!

  // Função disparada ao clicar no botão
  const handleGenerateTopology = async () => {
    setIsLoading(true);
    try {
      const data = await topologyService.getTopology();
      setTopologyData(data);
      
      // Salva o resultado bruto no LocalStorage
      localStorage.setItem("network_topology_cache", JSON.stringify(data));
    } catch (error) {
      console.error("Erro ao buscar dados da topologia:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Separação de hosts
  const errorNodes = topologyData.filter((node) => node.hostname === "ACCESS_ERROR");
  const validNodes = topologyData.filter((node) => node.hostname !== "ACCESS_ERROR");

  return (
    <div className="flex-1 min-h-screen bg-[#0d0f14] p-8 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-xs text-white/30 uppercase tracking-widest mb-1 font-medium">
            Gerenciamento de Rede
          </p>
          <h1 className="text-2xl font-semibold text-white tracking-tight">
            Topologia
          </h1>
        </div>

        {/* Botão de Gerar Topologia */}
        <button
          onClick={handleGenerateTopology}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-500 hover:bg-blue-400 text-white text-sm font-medium transition-colors shadow-lg shadow-blue-500/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Gerando..." : "Gerar topologia"}
        </button>
      </div>

      {/* Banner de Erros */}
      {errorNodes.length > 0 && (
        <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-lg flex flex-col gap-2">
          <div className="flex items-center gap-2 text-red-400 font-semibold">
            <span>Atenção: Falha de acesso em alguns equipamentos</span>
          </div>
          <ul className="text-sm text-red-300/80 list-disc list-inside space-y-1">
            {errorNodes.map((err, idx) => (
              <li key={idx}>
                <span className="font-mono text-red-300 font-medium">
                  {err.failed_name}
                </span>{" "}
                ({err.failed_ip}:{err.failed_port}) — {err.description}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Componente da Topologia */}
      <NetworkTopology topology={validNodes} />
    </div>
  );
}