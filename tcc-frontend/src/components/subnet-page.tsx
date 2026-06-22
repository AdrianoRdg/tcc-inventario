import { useState, useEffect } from "react";
import { subnetService } from "../services/subnetService";
import type { Subnet as SubnetAPI } from "../types/subnet";

// ── Types ──────────────────────────────────────────────────────────────────
type SubnetStatus = "Ativo" | "Cheio" | "Inativo";

type SubnetFormData = Omit<SubnetAPI, 'id' | 'createdAt' | 'updatedAt' | '_count' | 'parentId'> & { parentId?: string | null };

interface Subnet {
  id: string;
  network: string;
  description: string;
  vlan: number | null;
  usage: number | null; // null = placeholder (no backend yet)
  status: SubnetStatus;
}

// Helper to convert API subnet to internal type
function mapApiSubnetToInternal(apiSubnet: SubnetAPI): Subnet {
  return {
    id: apiSubnet.id,
    network: apiSubnet.network,
    description: apiSubnet.description,
    vlan: apiSubnet.vlan,
    usage: null,
    status: "Ativo", // TODO: implement logic to calculate status
  };
}

const PAGE_SIZE = 5;

// ── Sub-components ─────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: SubnetStatus }) {
  const styles: Record<SubnetStatus, string> = {
    Ativo:   "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    Cheio:   "bg-red-500/10    text-red-400    border-red-500/20",
    Inativo: "bg-zinc-500/10   text-zinc-400   border-zinc-500/20",
  };
  const dot: Record<SubnetStatus, string> = {
    Ativo:   "bg-emerald-400",
    Cheio:   "bg-red-400",
    Inativo: "bg-zinc-500",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium ${styles[status]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot[status]}`} />
      {status}
    </span>
  );
}

function UsagePlaceholder() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <div className="h-full w-1/3 rounded-full bg-white/10 animate-pulse" />
      </div>
      <span className="text-xs text-white/20 tabular-nums w-8">—</span>
    </div>
  );
}

function FilterDropdown({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.07] text-white/50 hover:text-white/80 hover:border-white/[0.12] transition-all text-sm cursor-pointer"
      >
        <span>{value || label}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          className={`transition-transform ${open ? "rotate-180" : ""}`}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full mt-1.5 left-0 z-20 min-w-[130px] bg-[#1a1d27] border border-white/[0.08] rounded-lg shadow-xl overflow-hidden">
          <button
            onClick={() => { onChange(""); setOpen(false); }}
            className="w-full text-left px-3 py-2 text-sm text-white/40 hover:bg-white/[0.04] hover:text-white/70 transition-colors cursor-pointer"
          >
            Todos
          </button>
          {options.map((o) => (
            <button
              key={o}
              onClick={() => { onChange(o); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-sm transition-colors cursor-pointer
                ${value === o
                  ? "text-blue-400 bg-blue-500/10"
                  : "text-white/60 hover:bg-white/[0.04] hover:text-white/80"
                }`}
            >
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ActionsMenu({ 
  onEdit, 
  onDelete,
  menuId,
  openMenuId,
  onOpenMenu,
}: { 
  onEdit: () => void; 
  onDelete: () => void;
  menuId: string;
  openMenuId: string | null;
  onOpenMenu: (id: string | null) => void;
}) {
  const isOpen = openMenuId === menuId;
  return (
    <div className="relative">
      <button
        onClick={() => onOpenMenu(isOpen ? null : menuId)}
        className="p-1.5 rounded-md text-white/25 hover:text-white/70 hover:bg-white/[0.06] transition-all cursor-pointer"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>
        </svg>
      </button>
      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 z-50 w-36 bg-[#1a1d27] border border-white/[0.08] rounded-lg shadow-xl overflow-hidden">
          <button onClick={() => { onEdit(); onOpenMenu(null); }}
            className="w-full text-left px-3 py-2 text-sm text-white/60 hover:bg-white/[0.04] hover:text-white/80 transition-colors flex items-center gap-2 cursor-pointer">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            Editar
          </button>
          <button onClick={() => { onDelete(); onOpenMenu(null); }}
            className="w-full text-left px-3 py-2 text-sm text-red-400/80 hover:bg-red-500/10 hover:text-red-400 transition-colors flex items-center gap-2 cursor-pointer">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
            </svg>
            Excluir
          </button>
        </div>
      )}
    </div>
  );
}

// ── Modal ──────────────────────────────────────────────────────────────────
function SubnetModal({
  subnet,
  onClose,
  onSave,
  isChild,
}: {
  subnet: Partial<SubnetAPI> | null;
  onClose: () => void;
  onSave: (d: SubnetFormData) => void;
  isChild?: boolean;
}) {
  const [form, setForm] = useState<SubnetFormData>({
    network:    subnet?.network    ?? "",
    description: subnet?.description ?? "",
    vlan:       subnet?.vlan       ?? null,
  });

  function set<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md bg-[#111318] border border-white/[0.08] rounded-xl shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white font-semibold text-base">
            {subnet?.id ? "Editar Sub-rede" : (isChild ? "Adicionar Sub-rede Filha" : "Adicionar Sub-rede")}
          </h2>
          <button onClick={onClose} className="text-white/30 hover:text-white/70 transition-colors cursor-pointer">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          {/* Rede (CIDR) */}
          <div>
            <label className="block text-xs text-white/35 font-medium mb-1.5 uppercase tracking-wider">Rede (CIDR)</label>
            <input type="text" placeholder="ex: 10.10.0.0/16" value={form.network}
              onChange={(e) => set("network", e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/80 placeholder-white/20 text-sm focus:outline-none focus:border-blue-500/50 transition-all font-mono" />
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-xs text-white/35 font-medium mb-1.5 uppercase tracking-wider">Descrição</label>
            <input type="text" placeholder="ex: Rede Raiz - Backbone" value={form.description}
              onChange={(e) => set("description", e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/80 placeholder-white/20 text-sm focus:outline-none focus:border-blue-500/50 transition-all" />
          </div>

          {/* VLAN */}
          <div>
            <label className="block text-xs text-white/35 font-medium mb-1.5 uppercase tracking-wider">VLAN (opcional)</label>
            <input type="number" placeholder="ex: 10" value={form.vlan ?? ""}
              onChange={(e) => set("vlan", e.target.value ? parseInt(e.target.value, 10) : null)}
              className="w-full px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/80 placeholder-white/20 text-sm focus:outline-none focus:border-blue-500/50 transition-all font-mono" />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/[0.04] text-sm transition-all cursor-pointer">
            Cancelar
          </button>
          <button
            onClick={() => { if (form.network) onSave(form); }}
            className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-400 text-white text-sm font-medium transition-colors shadow-lg shadow-blue-500/20 cursor-pointer"
          >
            {subnet?.id ? "Salvar" : "Adicionar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function SubnetPage() {
  const [subnets, setSubnets] = useState<Subnet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [vlanFilter, setVlanFilter] = useState("");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<{ open: boolean; subnet: Partial<SubnetAPI> | null }>({ open: false, subnet: null });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [currentParentId, setCurrentParentId] = useState<string | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<Array<{ id: string; network: string }>>([]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const fetchSubnets = async (parentId: string | null = null) => {
    try {
      setLoading(true);
      const data = parentId ? await subnetService.getChildren(parentId) : await subnetService.getRoot();
      const mappedData = data.map(mapApiSubnetToInternal);
      setSubnets(mappedData);
      setError(null);
    } catch (error) {
      console.error("Erro ao buscar subnets:", error);
      setError("Falha ao buscar sub-redes. O backend está online?");
    } finally {
      setLoading(false);
    }
  };

  const navigateToChildren = async (subnet: Subnet) => {
    setPage(1);
    setCurrentParentId(subnet.id);
    setBreadcrumb([...breadcrumb, { id: subnet.id, network: subnet.network }]);
    await fetchSubnets(subnet.id);
  };

  const navigateBack = async () => {
    if (breadcrumb.length === 0) return;
    const newBreadcrumb = breadcrumb.slice(0, -1);
    const parentId = newBreadcrumb.length > 0 ? newBreadcrumb[newBreadcrumb.length - 1].id : null;
    setBreadcrumb(newBreadcrumb);
    setCurrentParentId(parentId);
    await fetchSubnets(parentId);
    setPage(1);
  };

  useEffect(() => {
    (async () => {
      await fetchSubnets(null);
    })();
  }, []);

  async function handleSave(form: SubnetFormData) {
    try {
      if (modal.subnet?.id) {
        await subnetService.update(modal.subnet.id as string, form);
      } else {
        const createData = { ...form, parentId: currentParentId };
        await subnetService.create(createData);
      }
      setModal({ open: false, subnet: null });
      await fetchSubnets(currentParentId);
    } catch (error) {
      console.error("Falha ao salvar sub-rede:", error);
      setError("Não foi possível salvar a sub-rede.");
    }
  }

  async function handleDelete(id: string) {
    try {
      await subnetService.delete(id);
      setDeleteId(null);
      await fetchSubnets(currentParentId);
    } catch (error) {
      console.error("Falha ao excluir sub-rede:", error);
      setError("Não foi possível excluir a sub-rede.");
    }
  }

  const vlans = [...new Set(subnets.filter(s => s.vlan !== null).map((s) => String(s.vlan)))].sort(
    (a, b) => Number(a) - Number(b)
  );

  const filtered = subnets.filter((s) => {
    const matchSearch =
      s.network.includes(search) ||
      s.description.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || s.status === statusFilter;
    const matchVlan = !vlanFilter || String(s.vlan) === vlanFilter;
    return matchSearch && matchStatus && matchVlan;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      <div className="flex-1 min-h-screen bg-[#0d0f14] p-8 font-sans">

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-xs text-white/30 uppercase tracking-widest mb-1 font-medium">
            Gerenciamento de Sub-redes
          </p>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-white tracking-tight">
              {breadcrumb.length > 0 ? "Sub-redes Filhas" : "Sub-redes"}
            </h1>
            {breadcrumb.length > 0 && (
              <button
                onClick={navigateBack}
                className="ml-4 flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-white/50 hover:text-white/80 hover:bg-white/[0.04] transition-all cursor-pointer"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 18l-6-6 6-6"/>
                </svg>
                Voltar
              </button>
            )}
          </div>
          {breadcrumb.length > 0 && (
            <p className="text-xs text-white/25 mt-2">
              Caminho: / {breadcrumb.map(b => b.network).join(' / ')}
            </p>
          )}
        </div>
        <button
          onClick={() => { setOpenMenuId(null); setModal({ open: true, subnet: null }); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-500 hover:bg-blue-400 text-white text-sm font-medium transition-colors shadow-lg shadow-blue-500/20 cursor-pointer">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          {breadcrumb.length > 0 ? "Adicionar Sub-rede Filha" : "Adicionar Sub-rede"}
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="Pesquisar sub-redes..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-white/[0.04] border border-white/[0.07] text-white/70 placeholder-white/25 text-sm focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.06] transition-all"
          />
        </div>

        <FilterDropdown
          label="Status"
          options={["Ativo", "Cheio", "Inativo"]}
          value={statusFilter}
          onChange={(v) => { setStatusFilter(v); setPage(1); }}
        />
        <FilterDropdown
          label="VLAN"
          options={vlans}
          value={vlanFilter}
          onChange={(v) => { setVlanFilter(v); setPage(1); }}
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-white/[0.06] bg-[#111318]">

        {/* Table header */}
        <div className="grid grid-cols-[2fr_2fr_1fr_2fr_1.5fr_40px] gap-4 px-5 py-3 border-b border-white/[0.05]">
          {["Sub-rede", "Descrição", "VLAN", "Uso do Pool", "Status"].map((h) => (
            <span key={h} className="text-xs font-medium text-white/30 uppercase tracking-wider">
              {h}
            </span>
          ))}
          <span />
        </div>

        {/* Rows */}
        {loading ? (
          <div className="py-16 text-center text-white/25 text-sm">
            Carregando sub-redes...
          </div>
        ) : paginated.length === 0 ? (
          <div className="py-16 text-center text-white/25 text-sm">
            Nenhuma sub-rede encontrada.
          </div>
        ) : (
          paginated.map((subnet, idx) => (
            <div
              key={subnet.id}
              onClick={() => navigateToChildren(subnet)}
              className={`grid grid-cols-[2fr_2fr_1fr_2fr_1.5fr_40px] gap-4 px-5 py-4 items-center
                hover:bg-white/[0.02] transition-colors cursor-pointer group
                ${idx < paginated.length - 1 ? "border-b border-white/[0.04]" : ""}
              `}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm text-white/85 font-mono">{subnet.network}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/20 group-hover:text-white/50 transition-colors">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </div>
              <span className="text-sm text-white/50">{subnet.description}</span>
              <span className="text-sm text-white/40 tabular-nums">{subnet.vlan ?? "—"}</span>
              <UsagePlaceholder />
              <StatusBadge status={subnet.status} />
              <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-0">
                <ActionsMenu
                  menuId={subnet.id}
                  openMenuId={openMenuId}
                  onOpenMenu={setOpenMenuId}
                  onEdit={() => setModal({ open: true, subnet: {
                    id: subnet.id,
                    network: subnet.network,
                    description: subnet.description,
                    vlan: subnet.vlan,
                  } })}
                  onDelete={() => subnet.id && setDeleteId(subnet.id)}
                />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer / pagination */}
      <div className="flex items-center justify-between mt-4 px-1">
        <span className="text-xs text-white/25">
          Mostrando {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–
          {Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length} sub-redes
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-1.5 rounded-md text-white/30 hover:text-white/70 hover:bg-white/[0.06] disabled:opacity-20 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`w-7 h-7 rounded-md text-xs font-medium transition-all cursor-pointer
                ${p === page
                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                  : "text-white/30 hover:text-white/70 hover:bg-white/[0.06]"
                }`}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || totalPages === 0}
            className="p-1.5 rounded-md text-white/30 hover:text-white/70 hover:bg-white/[0.06] disabled:opacity-20 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        </div>
      </div>

    </div>

    {/* Modal */}
    {modal.open && (
      <SubnetModal
        subnet={modal.subnet}
        onClose={() => setModal({ open: false, subnet: null })}
        onSave={handleSave}
        isChild={breadcrumb.length > 0}
      />
    )}

    {/* Delete Confirmation Dialog */}
    {deleteId && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setDeleteId(null)}>
        <div className="w-full max-w-sm bg-[#111318] border border-white/[0.08] rounded-xl shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
          <h2 className="text-white font-semibold text-base mb-2">Confirmar exclusão</h2>
          <p className="text-white/50 text-sm mb-6">Tem certeza que deseja excluir esta sub-rede? Esta ação não pode ser desfeita.</p>
          <div className="flex items-center justify-end gap-2">
            <button onClick={() => setDeleteId(null)} className="px-4 py-2 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/[0.04] text-sm transition-all cursor-pointer">
              Cancelar
            </button>
            <button
              onClick={() => deleteId && handleDelete(deleteId)}
              className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-400 text-white text-sm font-medium transition-colors shadow-lg shadow-red-500/20 cursor-pointer"
            >
              Excluir
            </button>
          </div>
        </div>
      </div>
    )}
  </>
);
}