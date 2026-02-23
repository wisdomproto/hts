"use client";

import { useState, useEffect, useCallback } from "react";
import { GlassCard } from "@/components/shared/glass-card";
import { SectionHeader } from "@/components/shared/section-header";
import { Plus, Search, Loader2, BookOpen, Trash2, ChevronDown, ChevronUp } from "lucide-react";

type GlossaryTerm = {
  id: number;
  term: string;
  termEn: string | null;
  category: string;
  definition: string;
  example: string | null;
  createdAt: string;
};

const CATEGORY_COLORS: Record<string, string> = {
  성장: "bg-positive/10 text-positive",
  물가: "bg-warning/10 text-warning",
  유동성: "bg-accent/10 text-accent",
  레짐: "bg-purple-500/10 text-purple-400",
  투자: "bg-cyan-500/10 text-cyan-400",
  일반: "bg-bg-overlay text-text-secondary",
};

export default function StudyPage() {
  const [terms, setTerms] = useState<GlossaryTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newTerm, setNewTerm] = useState("");
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("전체");
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const fetchTerms = useCallback(async () => {
    try {
      const res = await fetch("/api/glossary");
      if (res.ok) {
        const data = await res.json();
        setTerms(data);
      }
    } catch (e) {
      console.error("Failed to fetch terms:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTerms();
  }, [fetchTerms]);

  const handleAdd = async () => {
    if (!newTerm.trim() || adding) return;
    setAdding(true);
    try {
      const res = await fetch("/api/glossary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ term: newTerm.trim() }),
      });
      if (res.ok) {
        setNewTerm("");
        fetchTerms();
      }
    } catch (e) {
      console.error("Failed to add term:", e);
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await fetch(`/api/glossary?id=${id}`, { method: "DELETE" });
      setTerms((prev) => prev.filter((t) => t.id !== id));
    } catch (e) {
      console.error("Failed to delete term:", e);
    }
  };

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const categories = ["전체", ...Array.from(new Set(terms.map((t) => t.category)))];
  const filtered = terms.filter((t) => {
    const matchSearch = search === "" ||
      t.term.toLowerCase().includes(search.toLowerCase()) ||
      (t.termEn?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      t.definition.toLowerCase().includes(search.toLowerCase());
    const matchCategory = activeCategory === "전체" || t.category === activeCategory;
    return matchSearch && matchCategory;
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <SectionHeader
        title="공부하기"
        description="경제 용어 및 투자 개념 사전"
      />

      {/* Add new term */}
      <GlassCard>
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={newTerm}
              onChange={(e) => setNewTerm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder="새 용어를 입력하세요 (예: 양적완화, 수익률 곡선...)"
              className="w-full px-4 py-2.5 rounded-xl bg-bg-overlay border border-border-subtle text-text-primary placeholder:text-text-muted text-sm focus:outline-none focus:border-accent/50 transition-colors"
              disabled={adding}
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={!newTerm.trim() || adding}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {adding ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>AI 생성 중...</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>추가</span>
              </>
            )}
          </button>
        </div>
        <p className="text-xs text-text-muted mt-2">
          용어를 입력하면 Gemini AI가 자동으로 설명을 생성합니다
        </p>
      </GlassCard>

      {/* Search + Category filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="검색..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-bg-overlay border border-border-subtle text-text-primary placeholder:text-text-muted text-sm focus:outline-none focus:border-accent/50 transition-colors"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                activeCategory === cat
                  ? "bg-accent/10 text-accent border border-accent/30"
                  : "bg-bg-overlay text-text-secondary hover:bg-bg-elevated border border-transparent"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Terms count */}
      <p className="text-xs text-text-muted">
        {filtered.length}개 용어 {search && `(\"${search}\" 검색 결과)`}
      </p>

      {/* Terms list */}
      {loading ? (
        <GlassCard>
          <div className="flex items-center justify-center py-12 gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-text-muted" />
            <span className="text-text-muted">용어를 불러오는 중...</span>
          </div>
        </GlassCard>
      ) : filtered.length === 0 ? (
        <GlassCard>
          <div className="text-center py-12">
            <BookOpen className="w-10 h-10 text-text-muted mx-auto mb-3" />
            <p className="text-text-muted text-sm">
              {search ? "검색 결과가 없습니다" : "등록된 용어가 없습니다. 위에서 새 용어를 추가해보세요!"}
            </p>
          </div>
        </GlassCard>
      ) : (
        <div className="space-y-2">
          {filtered.map((term) => {
            const isExpanded = expandedIds.has(term.id);
            return (
              <GlassCard key={term.id} className="!p-0 overflow-hidden">
                <button
                  onClick={() => toggleExpand(term.id)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-bg-overlay/30 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${CATEGORY_COLORS[term.category] ?? CATEGORY_COLORS["일반"]}`}>
                      {term.category}
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-text-primary truncate">{term.term}</h3>
                      {term.termEn && <p className="text-xs text-text-muted truncate">{term.termEn}</p>}
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-text-muted shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-text-muted shrink-0" />
                  )}
                </button>
                {isExpanded && (
                  <div className="px-5 pb-4 border-t border-border-subtle/50">
                    <p className="text-sm text-text-secondary leading-relaxed mt-3">{term.definition}</p>
                    {term.example && (
                      <div className="mt-3 px-3 py-2 bg-bg-overlay/50 rounded-lg">
                        <p className="text-xs text-text-muted mb-1">예시</p>
                        <p className="text-sm text-text-primary">{term.example}</p>
                      </div>
                    )}
                    <div className="flex justify-end mt-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(term.id);
                        }}
                        className="flex items-center gap-1 text-xs text-text-muted hover:text-negative transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                        삭제
                      </button>
                    </div>
                  </div>
                )}
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
