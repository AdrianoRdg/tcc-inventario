import React, { useState, useEffect } from "react";
import { hostService } from "../services/hostService";
import type { Host } from "../types/host";
import { DeviceStatus } from "../types/host";

type DeviceType = Host['type'];

const PAGE_SIZE = 6;

// ── Icons ──────────────────────────────────────────────────────────────────
const deviceIcons: Record<DeviceType, React.JSX.Element> = {
  Switch: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9h12M6 15h12M3 9l3-3 3 3M15 15l3 3 3-3"/>
    </svg>
  ),
  Router: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="14" width="20" height="6" rx="2"/>
      <path d="M6 14V8a6 6 0 0 1 12 0v6"/>
      <circle cx="17" cy="17" r="1" fill="currentColor"/>
    </svg>
  ),
  Firewall: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  "Access Point": (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01"/>
    </svg>
  ),
  Server: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="8" rx="2"/>
      <rect x="2" y="14" width="20" height="8" rx="2"/>
      <circle cx="7" cy="6" r="1" fill="currentColor"/>
      <circle cx="7" cy="18" r="1" fill="currentColor"/>
    </svg>
  ),
};

// ── Sub-components ─────────────────────────────────────────────────────────
function DeleteConfirmationModal({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onCancel}>
      <div className="w-full max-w-sm bg-[#111318] border border-white/[0.08] rounded-xl shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-white font-semibold text-base mb-2">Confirmar Exclusão</h2>
        <p className="text-white/40 text-sm mb-6">
          Tem certeza de que deseja excluir este dispositivo? Esta ação não pode ser desfeita.
        </p>
        <div className="flex items-center justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/[0.04] text-sm transition-all cursor-pointer">
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-400 text-white text-sm font-medium transition-colors shadow-lg shadow-red-500/20 cursor-pointer"
          >
            Excluir
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Online:  "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    Offline: "bg-zinc-500/10   text-zinc-400   border-zinc-500/20",
  };
  const dot: Record<string, string> = {
    Online:  "bg-emerald-400",
    Offline: "bg-zinc-500",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium ${styles[status]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot[status]}`} />
      {status}
    </span>
  );
}

function DeviceTypePill({ type }: { type: DeviceType }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/[0.04] border border-white/[0.07] text-white/45 text-xs font-medium">
      {deviceIcons[type]}
      {type}
    </span>
  );
}

// ── Modal ──────────────────────────────────────────────────────────────────
function DeviceModal({
  device,
  onClose,
  onSave,
}: {
  device: Partial<Host> | null;
  onClose: () => void;
  onSave: (d: Omit<Host, "id">) => void;
}) {
  const [form, setForm] = useState<Omit<Host, "id">>({
    name:     device?.name     ?? "",
    type:     device?.type     ?? "Switch",
    ip:       device?.ip       ?? "",
    port:     device?.port     ?? 22,
    login:    device?.login    ?? "",
    password: device?.password ?? "",
    location: device?.location ?? "",
    status:   device?.status   ?? "Online",
  });

  function set<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md bg-[#111318] border border-white/[0.08] rounded-xl shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white font-semibold text-base">
            {device?.id ? "Editar Dispositivo" : "Adicionar Dispositivo"}
          </h2>
          <button onClick={onClose} className="text-white/30 hover:text-white/70 transition-colors cursor-pointer">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          {/* Nome */}
          <div>
            <label className="block text-xs text-white/35 font-medium mb-1.5 uppercase tracking-wider">Nome</label>
            <input type="text" placeholder="ex: SW-CORE-01" value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/80 placeholder-white/20 text-sm focus:outline-none focus:border-blue-500/50 transition-all" />
          </div>

          {/* IP + Porta */}
          <div className="grid grid-cols-[2fr_1fr] gap-3">
            <div>
              <label className="block text-xs text-white/35 font-medium mb-1.5 uppercase tracking-wider">Endereço IP</label>
              <input type="text" placeholder="ex: 192.168.1.1" value={form.ip}
                onChange={(e) => set("ip", e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/80 placeholder-white/20 text-sm focus:outline-none focus:border-blue-500/50 transition-all font-mono" />
            </div>
            <div>
              <label className="block text-xs text-white/35 font-medium mb-1.5 uppercase tracking-wider">Porta</label>
              <input type="number" placeholder="ex: 22" value={form.port}
                onChange={(e) => set("port", parseInt(e.target.value, 10))}
                className="w-full px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/80 placeholder-white/20 text-sm focus:outline-none focus:border-blue-500/50 transition-all font-mono" />
            </div>
          </div>

          {/* Login + Senha */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-white/35 font-medium mb-1.5 uppercase tracking-wider">Login</label>
              <input type="text" placeholder="ex: admin" value={form.login}
                onChange={(e) => set("login", e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/80 placeholder-white/20 text-sm focus:outline-none focus:border-blue-500/50 transition-all" />
            </div>
            <div>
              <label className="block text-xs text-white/35 font-medium mb-1.5 uppercase tracking-wider">Senha</label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} placeholder="••••••••" value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                  className="w-full px-3 py-2.5 pr-9 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/80 placeholder-white/20 text-sm focus:outline-none focus:border-blue-500/50 transition-all" />
                <button type="button" onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors cursor-pointer">
                  {showPassword
                    ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  }
                </button>
              </div>
            </div>
          </div>

          {/* Localização */}
          <div>
            <label className="block text-xs text-white/35 font-medium mb-1.5 uppercase tracking-wider">Localização</label>
            <input type="text" placeholder="ex: Rack A1" value={form.location}
              onChange={(e) => set("location", e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/80 placeholder-white/20 text-sm focus:outline-none focus:border-blue-500/50 transition-all" />
          </div>

          {/* Tipo + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-white/35 font-medium mb-1.5 uppercase tracking-wider">Tipo</label>
              <select value={form.type} onChange={(e) => set("type", e.target.value as DeviceType)}
                className="w-full px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/70 text-sm focus:outline-none focus:border-blue-500/50 transition-all cursor-pointer">
                {(["Switch","Router","Firewall","Access Point","Server"] as DeviceType[]).map(t => (
                  <option key={t} value={t} className="bg-[#111318]">{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-white/35 font-medium mb-1.5 uppercase tracking-wider">Status</label>
              <select value={form.status} onChange={(e) => set("status", e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/70 text-sm focus:outline-none focus:border-blue-500/50 transition-all cursor-pointer">
                {Object.values(DeviceStatus).map(s => (
                  <option key={s} value={s} className="bg-[#111318]">{s}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/[0.04] text-sm transition-all cursor-pointer">
            Cancelar
          </button>
          <button
            onClick={() => { if (form.name && form.ip) onSave(form); }}
            className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-400 text-white text-sm font-medium transition-colors shadow-lg shadow-blue-500/20 cursor-pointer"
          >
            {device?.id ? "Salvar" : "Adicionar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function DevicesPage() {
  const [devices, setDevices] = useState<Host[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<{ open: boolean; device: Partial<Host> | null }>({ open: false, device: null });
  const [deleteId, setDeleteId] = useState<string | number | null>(null);

  const fetchDevices = React.useCallback(async () => {
    try {
      setLoading(true);
      const data = await hostService.getAll();
      setDevices(data);
      setError(null);
    } catch (err) {
      setError("Falha ao buscar dispositivos. O backend está online?");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchDevices();
  }, [fetchDevices]);

  const filtered = devices.filter((d) => {
    const q = search.toLowerCase();
    const ms = d.name.toLowerCase().includes(q) || d.ip.includes(q) || d.location.toLowerCase().includes(q);
    const mt = !typeFilter   || d.type   === typeFilter;
    const mst = !statusFilter || d.status === statusFilter;
    return ms && mt && mst;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function handleSave(form: Omit<Host, "id">) {
    try {
      if (modal.device?.id) {
        await hostService.update(modal.device.id, form);
      } else {
        await hostService.create(form);
      }
      setModal({ open: false, device: null });
      fetchDevices(); // Re-fetch para atualizar a lista
    } catch (error) {
      console.error("Falha ao salvar dispositivo:", error);
      setError("Não foi possível salvar o dispositivo.");
    }
  }

  async function handleDelete(id: string | number) {
    try {
      await hostService.delete(id);
      setDeleteId(null);
      fetchDevices(); // Re-fetch para atualizar a lista
    } catch (error) {
      console.error("Falha ao excluir dispositivo:", error);
      setError("Não foi possível excluir o dispositivo.");
    }
  }

  return (
    <>
      <div className="flex-1 min-h-screen bg-[#0d0f14] p-8 font-sans">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <p className="text-xs text-white/30 uppercase tracking-widest mb-1 font-medium">Gerenciamento de Rede</p>
            <h1 className="text-2xl font-semibold text-white tracking-tight">Dispositivos</h1>
          </div>
          <button
            onClick={() => setModal({ open: true, device: null })}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-500 hover:bg-blue-400 text-white text-sm font-medium transition-colors shadow-lg shadow-blue-500/20 cursor-pointer"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Adicionar Dispositivo
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
              placeholder="Pesquisar dispositivos..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-white/[0.04] border border-white/[0.07] text-white/70 placeholder-white/25 text-sm focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.06] transition-all"
            />
          </div>

          {/* Type filter */}
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.07] text-white/50 hover:text-white/80 text-sm focus:outline-none focus:border-blue-500/40 transition-all cursor-pointer"
          >
            <option value="" className="bg-[#111318]">Tipo</option>
            {(["Switch","Router","Firewall","Access Point","Server"] as DeviceType[]).map(t => (
              <option key={t} value={t} className="bg-[#111318]">{t}</option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.07] text-white/50 hover:text-white/80 text-sm focus:outline-none focus:border-blue-500/40 transition-all cursor-pointer"
          >
            <option value="" className="bg-[#111318]">Status</option>
            {Object.values(DeviceStatus).map(s => (
              <option key={s} value={s} className="bg-[#111318]">{s}</option>
            ))}
          </select>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Table */}
        <div className="rounded-xl border border-white/[0.06] overflow-hidden bg-[#111318]">
          <div className="grid grid-cols-[2fr_1.5fr_1.5fr_1.5fr_1.2fr_80px] gap-4 px-5 py-3 border-b border-white/[0.05]">
            {["Dispositivo", "Tipo", "Endereço IP", "Localização", "Status", ""].map((h) => (
              <span key={h} className="text-xs font-medium text-white/30 uppercase tracking-wider">{h}</span>
            ))}
          </div>

          {loading ? (
            <div className="py-16 text-center text-white/25 text-sm">Carregando dispositivos...</div>
          ) : paginated.length === 0 ? (
            <div className="py-16 text-center text-white/25 text-sm">Nenhum dispositivo encontrado.</div>
          ) : (
            paginated.map((device, idx) => (
              <div
                key={device.id}
                className={`grid grid-cols-[2fr_1.5fr_1.5fr_1.5fr_1.2fr_80px] gap-4 px-5 py-4 items-center hover:bg-white/[0.02] transition-colors
                  ${idx < paginated.length - 1 ? "border-b border-white/[0.04]" : ""}`}
              >
                <span className="text-sm text-white/85 font-medium">{device.name}</span>
                <DeviceTypePill type={device.type} />
                <span className="text-sm text-white/55 font-mono">{device.ip}</span>
                <span className="text-sm text-white/40">{device.location}</span>
                <StatusBadge status={device.status} />
                <div className="flex items-center gap-1">
                  {/* Edit */}
                  <button
                    onClick={() => setModal({ open: true, device })}
                    className="p-1.5 rounded-md text-white/25 hover:text-blue-400 hover:bg-blue-500/10 transition-all cursor-pointer"
                    title="Editar"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  {/* Delete */}
                  <button
                    onClick={() => device.id && setDeleteId(device.id)}
                    className="p-1.5 rounded-md text-white/25 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                    title="Excluir"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                      <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
                    </svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="flex items-center justify-between mt-4 px-1">
          <span className="text-xs text-white/25">
            Mostrando {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–
            {Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length} dispositivos
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
        <DeviceModal
          device={modal.device}
          onClose={() => setModal({ open: false, device: null })}
          onSave={handleSave}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <DeleteConfirmationModal
          onConfirm={() => handleDelete(deleteId)}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </>
  );
}