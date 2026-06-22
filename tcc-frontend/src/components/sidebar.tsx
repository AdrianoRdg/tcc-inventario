import React, { useState } from "react";

type MenuItem = {
  id: string;
  label: string;
  icon: React.ReactNode;
};

const DevicesIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" />
    <path d="M8 21h8M12 17v4" />
  </svg>
);

const SubnetsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="5" r="2" />
    <circle cx="5" cy="19" r="2" />
    <circle cx="19" cy="19" r="2" />
    <path d="M12 7v4M12 11l-5 6M12 11l5 6" />
  </svg>
);

const TopologiaIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="6" cy="6" r="2" />
    <circle cx="18" cy="6" r="2" />
    <circle cx="12" cy="18" r="2" />
    <path d="M8 8l8 0M6 8l0 8M18 8l0 8M14 16l-4 0" />
  </svg>
);

const menuItems: MenuItem[] = [
  { id: "dispositivos", label: "Dispositivos", icon: <DevicesIcon /> },
  { id: "sub-redes",    label: "Sub-redes",    icon: <SubnetsIcon /> },
  { id: "topologia",    label: "Topologia",    icon: <TopologiaIcon /> },
];

interface SidebarProps {
  active: string;
  onSelect: (id: string) => void;
}

export default function Sidebar({ active, onSelect }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      className={`
        flex flex-col h-screen bg-[#0f1117] border-r border-white/[0.06]
        transition-all duration-300 ease-in-out flex-shrink-0
        ${collapsed ? "w-[64px]" : "w-[220px]"}
      `}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/[0.06]">
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18" />
          </svg>
        </div>
        {!collapsed && (
          <span className="text-white font-semibold text-[15px] tracking-wide">IPAM</span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {menuItems.map((item) => {
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              title={collapsed ? item.label : undefined}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm
                transition-all duration-150 cursor-pointer group relative
                ${isActive
                  ? "bg-blue-500/15 text-blue-400"
                  : "text-white/40 hover:text-white/80 hover:bg-white/[0.04]"
                }
              `}
            >
              <span className={`flex-shrink-0 transition-colors
                ${isActive ? "text-blue-400" : "text-white/40 group-hover:text-white/70"}`}>
                {item.icon}
              </span>
              {!collapsed && (
                <span className="font-medium truncate">{item.label}</span>
              )}
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-blue-400 rounded-r-full" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="border-t border-white/[0.06] p-3 space-y-2">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-all text-xs cursor-pointer"
        >
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className={`transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`}
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
          {!collapsed && <span>Recolher</span>}
        </button>

        <div className={`flex items-center gap-3 px-2 py-2 rounded-lg cursor-pointer
          ${!collapsed ? "hover:bg-white/[0.04]" : ""} transition-colors`}>
          <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-semibold">
            W
          </div>
          {!collapsed && (
            <span className="text-white/60 text-sm font-medium truncate">Will</span>
          )}
        </div>
      </div>
    </div>
  );
}