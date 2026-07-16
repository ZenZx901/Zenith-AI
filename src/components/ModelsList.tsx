import React, { useState } from "react";
import { APPROVED_MODELS, AIModel } from "../types.js";
import { Search, Server, Shield, Sparkles, Filter, Cpu } from "lucide-react";

interface ModelsListProps {
  onSelectModel?: (id: string) => void;
}

export default function ModelsList({ onSelectModel }: ModelsListProps) {
  const [search, setSearch] = useState("");
  const [providerFilter, setProviderFilter] = useState<string>("All");
  const [tierFilter, setTierFilter] = useState<string>("All");

  const providers = ["All", ...Array.from(new Set(APPROVED_MODELS.map((m) => m.provider)))];
  const tiers = ["All", "Free", "Pro", "Premium", "Ultra"];

  const filteredModels = APPROVED_MODELS.filter((model) => {
    const matchesSearch =
      model.name.toLowerCase().includes(search.toLowerCase()) ||
      model.tag.toLowerCase().includes(search.toLowerCase()) ||
      model.provider.toLowerCase().includes(search.toLowerCase());
    const matchesProvider = providerFilter === "All" || model.provider === providerFilter;
    const matchesTier = tierFilter === "All" || model.tier === tierFilter;
    return matchesSearch && matchesProvider && matchesTier;
  });

  const getTierBadgeColor = (tier: string) => {
    switch (tier) {
      case "Ultra":
        return "bg-purple-950/40 text-purple-400 border border-purple-500/30";
      case "Premium":
        return "bg-pink-950/40 text-pink-400 border border-pink-500/30";
      case "Pro":
        return "bg-cyan-950/40 text-cyan-400 border border-cyan-500/30";
      default:
        return "bg-emerald-950/40 text-emerald-400 border border-emerald-500/20";
    }
  };

  return (
    <div id="models-list-component" className="flex-1 flex flex-col h-full w-full bg-[#0B0D17] text-white overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-800 bg-[#0E1121]">
        <div className="flex items-center gap-2 mb-2">
          <Cpu className="w-5 h-5 text-[#00E5FF]" />
          <h2 className="text-lg font-display font-bold text-[#00E5FF] tracking-tight">
            AI Models Registry
          </h2>
          <span className="ml-auto text-xs font-mono px-2 py-0.5 bg-gray-800 rounded-full text-gray-400">
            34 Registered
          </span>
        </div>
        <p className="text-xs text-gray-400">
          Complete listing of available models in Zenith AI, their custom multipliers, and optimized use-cases.
        </p>
      </div>

      {/* Filters Bar */}
      <div className="p-3 bg-[#11152B] border-b border-gray-800 space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search name, capabilities or brand..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm focus:outline-none focus:border-[#00E5FF] text-white placeholder-gray-500"
          />
        </div>

        <div className="flex gap-2">
          {/* Provider Filter */}
          <div className="flex-1 flex items-center gap-1.5 bg-gray-900 border border-gray-800 rounded-lg px-2 py-1.5 text-xs text-gray-400">
            <Filter className="w-3 h-3 text-[#00E5FF]" />
            <select
              value={providerFilter}
              onChange={(e) => setProviderFilter(e.target.value)}
              className="bg-transparent focus:outline-none text-white w-full"
            >
              {providers.map((p) => (
                <option key={p} value={p} className="bg-[#0B0D17]">
                  {p} Provider
                </option>
              ))}
            </select>
          </div>

          {/* Tier Filter */}
          <div className="flex-1 flex items-center gap-1.5 bg-gray-900 border border-gray-800 rounded-lg px-2 py-1.5 text-xs text-gray-400">
            <Sparkles className="w-3 h-3 text-[#FF2DAA]" />
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              className="bg-transparent focus:outline-none text-white w-full"
            >
              {tiers.map((t) => (
                <option key={t} value={t} className="bg-[#0B0D17]">
                  {t} Tiers
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Models Grid */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-[#080A12]">
        {filteredModels.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Server className="w-10 h-10 text-gray-700 mb-2 animate-pulse" />
            <p className="text-sm text-gray-500 font-mono">No matching models found.</p>
            <button
              onClick={() => {
                setSearch("");
                setProviderFilter("All");
                setTierFilter("All");
              }}
              className="mt-3 text-xs text-[#00E5FF] underline"
            >
              Reset all filters
            </button>
          </div>
        ) : (
          filteredModels.map((model) => (
            <div
              key={model.id}
              onClick={() => onSelectModel?.(model.id)}
              className={`p-3 bg-[#0F1225] border border-gray-850 rounded-xl hover:border-[#00E5FF]/45 transition-all duration-200 cursor-pointer group flex flex-col justify-between`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-display font-semibold text-sm text-white group-hover:text-[#00E5FF] transition-colors">
                    {model.name}
                  </h3>
                  <span className="text-[10px] font-mono text-gray-500">
                    by {model.provider}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-[9px] px-2 py-0.5 rounded font-mono font-bold ${getTierBadgeColor(model.tier)}`}>
                    {model.tier.toUpperCase()}
                  </span>
                  <span className="text-[10px] font-mono text-gray-400">
                    x{model.multiplier.toFixed(1)} multiplier
                  </span>
                </div>
              </div>

              <div className="mt-2.5 pt-2 border-t border-gray-800/60 flex items-center justify-between">
                <span className="text-[11px] text-gray-400 line-clamp-1 italic">
                  "{model.tag}"
                </span>
                <span className="text-[9px] font-mono text-[#00E5FF] opacity-0 group-hover:opacity-100 transition-opacity">
                  Use Model &rarr;
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
