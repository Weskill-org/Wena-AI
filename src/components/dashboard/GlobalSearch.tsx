import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, BookOpen, Bot } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface SearchResult {
  type: "module";
  id: string;
  title: string;
  description?: string;
}

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleSearch = async (q: string) => {
    setQuery(q);
    if (q.length < 2) {
      setResults([]);
      return;
    }

    const { data: modules } = await supabase
      .from("modules")
      .select("id, title, description")
      .eq("user_id", user?.id)
      .ilike("title", `%${q}%`)
      .limit(5);

    const mapped: SearchResult[] = (modules || []).map((m) => ({
      type: "module" as const,
      id: m.id,
      title: m.title,
      description: m.description || undefined,
    }));

    setResults(mapped);
  };

  const handleSelect = (result: SearchResult) => {
    setOpen(false);
    setQuery("");
    setResults([]);
    if (result.type === "module") navigate(`/modules/${result.id}`);
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          placeholder="Search modules..."
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full h-10 pl-9 pr-9 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 transition-smooth"
        />
        {query && (
          <button
            onClick={() => { setQuery(""); setResults([]); }}
            className="absolute right-3 top-1/2 -translate-y-1/2"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {open && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute top-12 left-0 right-0 z-50 bg-card border border-border rounded-xl shadow-lg overflow-hidden"
          >
            {results.map((r) => (
              <button
                key={r.id}
                onClick={() => handleSelect(r)}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-surface/50 transition-smooth text-left"
              >
                <BookOpen className="w-4 h-4 text-primary flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{r.title}</p>
                  {r.description && (
                    <p className="text-xs text-muted-foreground truncate">{r.description}</p>
                  )}
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />}
    </div>
  );
}
