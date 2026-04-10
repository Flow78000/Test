"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, PageHeader } from "@/components/ui/card";

const API = "http://localhost:3850";

interface Message {
  id: string;
  channel: string;
  title: string;
  body: string;
  body_display?: string;
  encrypted: boolean;
  tags: string[];
  important: boolean;
  pinned: boolean;
  ts: number;
  created_at: string;
  updated_at?: string;
}

interface ListResponse {
  ok: boolean;
  locked: boolean;
  channels: string[];
  channel_stats: Record<string, number>;
  messages: Message[];
  total: number;
}

const CHANNEL_LABELS: Record<string, string> = {
  trade_ideas: "Idees de trade",
  market_notes: "Notes marche",
  journal: "Journal",
  watchlist: "Watchlist",
  alerts_review: "Revue alertes",
};

const CHANNEL_COLORS: Record<string, string> = {
  trade_ideas: "#FF6B00",
  market_notes: "#42A5F5",
  journal: "#B388FF",
  watchlist: "#FFA726",
  alerts_review: "#EF4444",
};

function fmtDate(ts: number): string {
  const d = new Date(ts);
  const now = Date.now();
  const diff = (now - ts) / 1000;
  if (diff < 60) return "il y a <1 min";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  if (diff < 604800) return `il y a ${Math.floor(diff / 86400)} j`;
  return d.toLocaleDateString("fr-FR");
}

export default function MessagesPage() {
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [channel, setChannel] = useState<string>("trade_ideas");
  const [search, setSearch] = useState("");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);

  // Compose form
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tagsStr, setTagsStr] = useState("");
  const [important, setImportant] = useState(false);
  const [encrypt, setEncrypt] = useState(false);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (channel) params.append("channel", channel);
      if (search) params.append("search", search);
      if (pin) params.append("pin", pin);
      const r = await fetch(`${API}/api/messages?${params.toString()}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const json = await r.json();
      setData(json);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [channel, search, pin]);

  useEffect(() => {
    load();
  }, [load]);

  const createMessage = useCallback(async () => {
    if (!title.trim() && !body.trim()) return;
    setCreating(true);
    try {
      const tags = tagsStr
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const r = await fetch(`${API}/api/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel,
          title,
          body,
          tags,
          important,
          encrypt,
          pin: encrypt ? pin : undefined,
        }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setTitle("");
      setBody("");
      setTagsStr("");
      setImportant(false);
      setEncrypt(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setCreating(false);
    }
  }, [channel, title, body, tagsStr, important, encrypt, pin, load]);

  const togglePin = useCallback(
    async (m: Message) => {
      await fetch(`${API}/api/messages/${m.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned: !m.pinned }),
      });
      await load();
    },
    [load],
  );

  const toggleImportant = useCallback(
    async (m: Message) => {
      await fetch(`${API}/api/messages/${m.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ important: !m.important }),
      });
      await load();
    },
    [load],
  );

  const deleteMessage = useCallback(
    async (m: Message) => {
      if (!confirm(`Supprimer "${m.title || "(sans titre)"}" ?`)) return;
      await fetch(`${API}/api/messages/${m.id}`, { method: "DELETE" });
      await load();
    },
    [load],
  );

  const channels = useMemo(() => data?.channels || Object.keys(CHANNEL_LABELS), [data]);
  const stats = data?.channel_stats || {};

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Messagerie interne"
        subtitle="Journal local securise — idees de trade, notes, watchlist, revue d'alertes"
      >
        <div className="flex items-center gap-2">
          <input
            type={showPin ? "text" : "password"}
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="PIN (optionnel)"
            className="bg-[#111114] border border-[#1E1E22] rounded-lg px-3 py-1.5 text-xs text-white w-36"
          />
          <button
            onClick={() => setShowPin((v) => !v)}
            className="text-[10px] text-[#6B6B75] hover:text-[#F0F0F0]"
          >
            {showPin ? "Masquer" : "Voir"}
          </button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4 mb-4">
        {/* Channels sidebar */}
        <Card className="p-3">
          <div className="text-[9px] uppercase text-[#6B6B75] mb-2">Canaux</div>
          <div className="flex flex-col gap-1">
            {channels.map((c) => {
              const active = c === channel;
              const color = CHANNEL_COLORS[c] || "#F0F0F0";
              return (
                <button
                  key={c}
                  onClick={() => setChannel(c)}
                  className={`flex items-center justify-between px-2 py-1.5 rounded-md text-[11px] transition-all ${
                    active
                      ? "bg-[#1A1A1E] text-[#F0F0F0]"
                      : "text-[#6B6B75] hover:text-[#F0F0F0]"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                    {CHANNEL_LABELS[c] || c}
                  </span>
                  <span className="text-[9px] font-mono text-[#6B6B75]">{stats[c] || 0}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-4 text-[9px] uppercase text-[#6B6B75] mb-1">Global</div>
          <div className="text-[11px] text-[#F0F0F0]">
            {data?.total || 0} message{(data?.total || 0) > 1 ? "s" : ""}
          </div>
        </Card>

        {/* Compose */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <span
              className="px-2 py-0.5 rounded text-[10px] font-bold"
              style={{
                background: `${CHANNEL_COLORS[channel] || "#FF6B00"}20`,
                color: CHANNEL_COLORS[channel] || "#FF6B00",
              }}
            >
              {CHANNEL_LABELS[channel] || channel}
            </span>
            <span className="text-[10px] text-[#6B6B75]">Nouveau message</span>
          </div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titre (ex : SPX long 6800 — setup RSI)"
            className="w-full bg-[#0D0D10] border border-[#1E1E22] rounded-md px-3 py-2 text-xs text-white mb-2"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Contenu... notes, niveaux, thesis, gestion..."
            rows={4}
            className="w-full bg-[#0D0D10] border border-[#1E1E22] rounded-md px-3 py-2 text-xs text-white mb-2 font-mono"
          />
          <div className="flex items-center gap-2 flex-wrap">
            <input
              value={tagsStr}
              onChange={(e) => setTagsStr(e.target.value)}
              placeholder="tags, separes, par, virgule"
              className="flex-1 min-w-[180px] bg-[#0D0D10] border border-[#1E1E22] rounded-md px-3 py-1.5 text-[11px] text-white"
            />
            <label className="flex items-center gap-1.5 text-[10px] text-[#6B6B75] cursor-pointer">
              <input
                type="checkbox"
                checked={important}
                onChange={(e) => setImportant(e.target.checked)}
                className="accent-[#FF6B00]"
              />
              Important
            </label>
            <label className="flex items-center gap-1.5 text-[10px] text-[#6B6B75] cursor-pointer">
              <input
                type="checkbox"
                checked={encrypt}
                onChange={(e) => setEncrypt(e.target.checked)}
                disabled={!pin}
                className="accent-[#B388FF]"
              />
              Chiffrer {!pin && <span className="text-[#6B6B75]">(PIN requis)</span>}
            </label>
            <button
              onClick={createMessage}
              disabled={creating || (!title.trim() && !body.trim())}
              className="ml-auto px-4 py-1.5 bg-[#FF6B00] text-black text-[11px] font-bold rounded-md disabled:opacity-50"
            >
              {creating ? "..." : "Publier"}
            </button>
          </div>
        </Card>
      </div>

      {/* Search */}
      <Card className="p-3 mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher dans titres, corps ou tags..."
          className="w-full bg-[#0D0D10] border border-[#1E1E22] rounded-md px-3 py-2 text-xs text-white"
        />
      </Card>

      {/* Messages list */}
      {loading && !data ? (
        <Card className="p-12 text-center text-[#6B6B75]">Chargement...</Card>
      ) : error ? (
        <Card className="p-12 text-center">
          <span className="text-[#EF4444] font-semibold">Erreur</span>
          <div className="text-xs mt-2 text-[#6B6B75]">{error}</div>
        </Card>
      ) : data && data.messages.length > 0 ? (
        <div className="flex flex-col gap-2">
          {data.messages.map((m) => {
            const color = CHANNEL_COLORS[m.channel] || "#F0F0F0";
            return (
              <Card
                key={m.id}
                className={`p-4 border-l-2 ${m.important ? "border-[#EF4444]" : ""}`}
                style={{ borderLeftColor: m.important ? "#EF4444" : color }}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {m.pinned && <span className="text-[#FFA726] text-[10px]">EPINGLE</span>}
                      {m.important && (
                        <span className="text-[#EF4444] text-[10px] font-bold">!</span>
                      )}
                      <span
                        className="px-1.5 py-0.5 rounded text-[9px] font-bold"
                        style={{ background: `${color}20`, color }}
                      >
                        {CHANNEL_LABELS[m.channel] || m.channel}
                      </span>
                      {m.encrypted && (
                        <span className="text-[#B388FF] text-[9px]">CHIFFRE</span>
                      )}
                      <span className="text-[9px] text-[#6B6B75]">{fmtDate(m.ts)}</span>
                    </div>
                    {m.title && (
                      <div className="text-sm font-bold text-[#F0F0F0] mb-1">{m.title}</div>
                    )}
                    <div className="text-xs text-[#B0B0B5] whitespace-pre-wrap font-mono leading-relaxed">
                      {m.body_display || m.body}
                    </div>
                    {m.tags.length > 0 && (
                      <div className="flex items-center gap-1 mt-2 flex-wrap">
                        {m.tags.map((t) => (
                          <span
                            key={t}
                            className="px-1.5 py-0.5 rounded text-[9px] bg-[#1A1A1E] text-[#6B6B75]"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => togglePin(m)}
                      className={`text-[10px] px-2 py-1 rounded ${
                        m.pinned ? "bg-[#FFA72620] text-[#FFA726]" : "text-[#6B6B75]"
                      }`}
                      title="Epingler"
                    >
                      PIN
                    </button>
                    <button
                      onClick={() => toggleImportant(m)}
                      className={`text-[10px] px-2 py-1 rounded ${
                        m.important ? "bg-[#EF444420] text-[#EF4444]" : "text-[#6B6B75]"
                      }`}
                      title="Marquer important"
                    >
                      !
                    </button>
                    <button
                      onClick={() => deleteMessage(m)}
                      className="text-[10px] px-2 py-1 rounded text-[#6B6B75] hover:text-[#EF4444]"
                      title="Supprimer"
                    >
                      DEL
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="p-12 text-center text-[#6B6B75] text-xs">
          Aucun message dans ce canal. Publiez votre premiere note ci-dessus.
        </Card>
      )}
    </div>
  );
}
