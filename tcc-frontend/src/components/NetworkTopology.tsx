// NetworkTopology.tsx
import { useEffect, useRef } from "react";
import { Network } from "vis-network";
import type { Node, Edge } from "vis-network";

interface TopologyInterface {
  localPort: string;
  remoteHostname: string;
  remotePort: string;
}

interface TopologyDevice {
  hostname: string;
  description: string | null;
  interfaces: TopologyInterface[];
  // Opcional: informe o nível manualmente para forçar a hierarquia.
  // 0 = core, 1 = distribuição, 2 = acesso.
  // Se omitido, o vis-network infere pelo número de conexões (hubsize).
  level?: number;
}

// ─── 1. Converte e Valida Topologia → formato vis-network ──────────────────────

function topologyToVisData(rawTopology: TopologyDevice[]) {
  const cleanStr = (str: string | undefined): string => {
    if (!str) return "";
    return String(str)
      .replace(/^.*@/, "")
      .replace(/^interface=/, "")
      .trim();
  };

  const nodesMap = new Map<string, Node>();
  const pairMap: Record<string, Set<string>> = {};

  rawTopology.forEach((d) => {
    const hName = cleanStr(d.hostname);
    const isCore = d.description?.toLowerCase()?.includes("core");

    const desc =
      d.description && d.description.length > 22
        ? d.description.substring(0, 22) + "..."
        : d.description;

    nodesMap.set(hName, {
      id: hName,
      // Passa o nível se informado no JSON — permite forçar a hierarquia
      // sem depender só do hubsize quando a topologia é assimétrica.
      ...(d.level !== undefined ? { level: d.level } : {}),
      label: desc
        ? `*${hName.toUpperCase()}*\n${desc}`
        : `*${hName.toUpperCase()}*`,
      shape: "box",
      margin: { top: 10, right: 14, bottom: 10, left: 14 },
      borderWidth: 2,
      color: {
        background: "#1E293B",
        border: isCore ? "#8B5CF6" : "#3B82F6",
        highlight: { border: "#60A5FA", background: "#334155" },
      },
      font: {
        face: "Inter, sans-serif",
        color: "#F8FAFC",
        size: 13,
        align: "center",
        multi: "markdown",
      },
      shadow: { enabled: true, color: "rgba(0,0,0,0.4)", size: 10, y: 4 },
      shapeProperties: { borderRadius: 8 },
    });
  });

  rawTopology.forEach((device) => {
    const localHost = cleanStr(device.hostname);

    device.interfaces.forEach((iface) => {
      const remoteHost = cleanStr(iface.remoteHostname);
      const localPort = cleanStr(iface.localPort);
      const remotePort = cleanStr(iface.remotePort);

      const neighbor = rawTopology.find(
        (n) => cleanStr(n.hostname) === remoteHost
      );
      if (!neighbor) return;

      const hasReturnLink = neighbor?.interfaces?.some(
        (nIface: TopologyInterface) =>
          cleanStr(nIface.remoteHostname) === localHost &&
          cleanStr(nIface.localPort) === remotePort &&
          cleanStr(nIface.remotePort) === localPort
      );

      if (hasReturnLink) {
        const [nodeA, nodeB] = [localHost, remoteHost].sort();
        const key = `${nodeA}||${nodeB}`;
        if (!pairMap[key]) pairMap[key] = new Set();
        const pA = localHost === nodeA ? localPort : remotePort;
        const pB = localHost === nodeA ? remotePort : localPort;
        pairMap[key].add(`${pA} ↔ ${pB}`);
      }
    });
  });

  const edges: Edge[] = [];

  Object.entries(pairMap).forEach(([hostsKey, linksSet]) => {
    const [nodeA, nodeB] = hostsKey.split("||");
    const links = Array.from(linksSet);
    const isDouble = links.length >= 2;

    links.forEach((linkLabel, i) => {
      const baseEdge: Edge = {
        from: nodeA,
        to: nodeB,
        label: linkLabel,
        font: {
          size: 11,
          // "horizontal" é a chave: o label sempre fica na horizontal
          // independente da direção da aresta — muito mais legível em LR.
          align: "horizontal",
          color: "#94A3B8",
          strokeWidth: 3,
          strokeColor: "#1E293B",
          background: "#0F172A", // fundo sólido atrás do texto evita overlap visual
        },
        width: 2,
        selectionWidth: 3,
      };

      if (isDouble) {
        edges.push({
          ...baseEdge,
          color: { color: "#3B82F6", highlight: "#60A5FA" },
          dashes: [4, 4],
          smooth: {
            enabled: true,
            type: i % 2 === 0 ? "curvedCW" : "curvedCCW",
            roundness: 0.2 + 0.1 * Math.floor(i / 2),
          },
        });
      } else {
        edges.push({
          ...baseEdge,
          color: { color: "#475569", highlight: "#94A3B8" },
          dashes: false,
          smooth: {
            enabled: true,
            // cubicBezier horizontal faz as arestas curvar suavemente
            // em vez de cruzar na diagonal — elimina a maioria dos cruzamentos em LR.
            type: "cubicBezier",
            forceDirection: "horizontal",
            roundness: 0.5,
          },
        });
      }
    });
  });

  // ── Cálculo automático de nível por BFS ──────────────────────────────────────
  // O hubsize falha quando nós de camadas diferentes têm o mesmo grau (ex: MikroTik
  // e NE9000 ambos com 2 links ficam no mesmo nível e a aresta entre eles some).
  // Solução: BFS a partir dos nós mais conectados — eles viram raiz (level 0) e
  // cada vizinho não visitado recebe level+1. Só aplica se o JSON não informou level.
  const degreeMap: Record<string, number> = {};
  edges.forEach((e) => {
    degreeMap[e.from as string] = (degreeMap[e.from as string] || 0) + 1;
    degreeMap[e.to   as string] = (degreeMap[e.to   as string]   || 0) + 1;
  });

  const hasExplicitLevel = (id: string) =>
    rawTopology.some((d) => cleanStr(d.hostname) === id && d.level !== undefined);

  const autoLevelMap: Record<string, number> = {};
  const roots = Array.from(nodesMap.keys())
    .filter((id) => !hasExplicitLevel(id))
    .sort((a, b) => (degreeMap[b] || 0) - (degreeMap[a] || 0));

  if (roots.length > 0) {
    const visited = new Set<string>();

    const bfs = (start: string, startLevel: number) => {
      const queue: string[] = [start];
      autoLevelMap[start] = startLevel;
      visited.add(start);
      while (queue.length > 0) {
        const cur = queue.shift()!;
        edges.forEach((e) => {
          const nb =
            e.from === cur ? (e.to as string) :
            e.to   === cur ? (e.from as string) : null;
          if (nb && !visited.has(nb) && !hasExplicitLevel(nb)) {
            autoLevelMap[nb] = autoLevelMap[cur] + 1;
            visited.add(nb);
            queue.push(nb);
          }
        });
      }
    };

    roots.forEach((r) => { if (!visited.has(r)) bfs(r, 0); });

    nodesMap.forEach((node, id) => {
      if (!hasExplicitLevel(id) && autoLevelMap[id] !== undefined) {
        (node as Record<string, unknown>).level = autoLevelMap[id];
      }
    });
  }

  return {
    nodes: Array.from(nodesMap.values()),
    edges,
  };
}

// ─── 2. Opções do vis-network ──────────────────────────────────────────────────

const OPTIONS = {
  layout: {
    hierarchical: {
      enabled: true,
      direction: "LR",              // horizontal — labels legíveis
      sortMethod: "directed",  // levels calculados por BFS acima — directed os respeita fielmente
      nodeSpacing: 120,             // espaço vertical entre nós do mesmo nível
      levelSeparation: 350,         // espaço horizontal entre camadas — dá room pro label
      treeSpacing: 160,             // separa sub-árvores desconexas
      blockShifting: true,          // empurra grupos para não sobrepor
      edgeMinimization: true,       // minimiza cruzamentos de arestas
      parentCentralization: true,   // centraliza pai sobre os filhos
    },
  },
  physics: {
    enabled: true,
    hierarchicalRepulsion: {
      nodeDistance: 140,
    },
    stabilization: {
      iterations: 300,
      onlyDynamicEdges: false,
    },
  },
  edges: {
    arrows: { to: { enabled: false } },
    labelHighlightBold: false,
  },
  interaction: {
    dragNodes: true,
    zoomView: true,
    dragView: true,
    hover: true,
    tooltipDelay: 200,
  },
};

// ─── 3. Componente principal ───────────────────────────────────────────────────

interface NetworkTopologyProps {
  topology: TopologyDevice[];
}

export default function NetworkTopology({ topology }: NetworkTopologyProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<Network | null>(null);

  useEffect(() => {
    if (!containerRef.current || !topology?.length) return;

    const { nodes, edges } = topologyToVisData(topology);

    if (networkRef.current) {
      networkRef.current.destroy();
    }

    const network = new Network(
      containerRef.current,
      { nodes, edges },
      OPTIONS
    );

    // Desliga a física depois de estabilizar para travar o layout
    network.once("stabilizationIterationsDone", () => {
      network.setOptions({ physics: { enabled: false } });
      network.fit({ animation: { duration: 600, easingFunction: "easeInOutQuad" } });
    });

    networkRef.current = network;

    return () => {
      networkRef.current?.destroy();
      networkRef.current = null;
    };
  }, [topology]);

  return (
    <div
      ref={containerRef}
      className="w-full bg-slate-900 rounded-xl border border-slate-800 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]"
      style={{ height: "calc(100vh - 220px)", minHeight: "400px" }}
    />
  );
}