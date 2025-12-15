import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import {
  Play,
  Copy,
  Search,
  Trash2,
  FileJson,
  Check,
  Cpu,
  Braces,
  Database,
  Layout,
  Code2,
  ChevronUp,
  ChevronDown,
  X,
  WrapText,
  Globe,
  Grid,
  Home,
  MessageSquare,
  ExternalLink,
  Minimize2,
  Maximize2,
} from "lucide-react";
import { Button } from "./components/Button";
import { VirtualList } from "./components/VirtualList";
import { convertPythonToJson } from "./services/geminiService";
import { DEMO_PYTHON_DATA, OTHER_TOOLS } from "./constants";
import { ViewMode, Match } from "./types";
import { useLanguage } from "./contexts/LanguageContext";
import {
  joinPath,
  buildAncestorPaths,
  pathToMatchElementId,
} from "./utils/path";
import { flattenTree } from "./utils/tree";

// Custom Logo Component - MotherDuck Style
const Logo = () => (
  <svg
    width="32"
    height="32"
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="shrink-0"
    aria-label="PySon Logo"
    role="img"
  >
    <title>PySon Converter Logo</title>
    <desc>Python to JSON converter tool logo</desc>
    <rect
      x="0.5"
      y="0.5"
      width="31"
      height="31"
      rx="6"
      fill="white"
      stroke="#383838"
      strokeWidth="1"
    />
    <circle cx="16" cy="16" r="9" fill="#FFDE00" />
    <path
      d="M13 11C11.5 11 11.5 12.5 11.5 12.5V14.5C11.5 14.5 11.5 16 9.5 16C11.5 16 11.5 17.5 11.5 17.5V19.5C11.5 19.5 11.5 21 13 21"
      stroke="#383838"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M19 11C20.5 11 20.5 12.5 20.5 12.5V14.5C20.5 14.5 20.5 16 22.5 16C20.5 16 20.5 17.5 20.5 17.5V19.5C20.5 19.5 20.5 21 19 21"
      stroke="#383838"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

function computeExpandAllOpenPaths(data: any): Set<string> {
  // Safety-first: cap how much we expand to avoid generating gigantic visible lists.
  const MAX_CONTAINER_NODES = 4000;
  const MAX_DEPTH = 12;
  const PER_CONTAINER_CHILD_SCAN = 2000;

  const next = new Set<string>();
  next.add("root");

  type Item = { data: any; path: string; depth: number };
  const stack: Item[] = [{ data, path: "root", depth: 0 }];
  let expandedCount = 0;

  while (stack.length > 0 && expandedCount < MAX_CONTAINER_NODES) {
    const item = stack.pop()!;
    const { data: current, path, depth } = item;
    if (!current || typeof current !== "object") continue;
    if (depth >= MAX_DEPTH) continue;

    const isArray = Array.isArray(current);
    const childCount = isArray ? current.length : Object.keys(current).length;
    if (childCount === 0) continue;

    next.add(path);
    expandedCount++;

    if (isArray) {
      const limit = Math.min(childCount, PER_CONTAINER_CHILD_SCAN);
      for (let i = 0; i < limit; i++) {
        const child = current[i];
        if (child && typeof child === "object") {
          stack.push({
            data: child,
            path: joinPath(path, i),
            depth: depth + 1,
          });
        }
      }
    } else {
      const keys = Object.keys(current);
      const limit = Math.min(keys.length, PER_CONTAINER_CHILD_SCAN);
      for (let i = 0; i < limit; i++) {
        const k = keys[i];
        const child = current[k];
        if (child && typeof child === "object") {
          stack.push({
            data: child,
            path: joinPath(path, k),
            depth: depth + 1,
          });
        }
      }
    }
  }

  return next;
}

const App = () => {
  const { t, language, setLanguage } = useLanguage();
  const [input, setInput] = useState<string>("");
  const [jsonOutput, setJsonOutput] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const toolsMenuRef = useRef<HTMLDivElement>(null);

  // Persist ViewMode preference
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.TREE);

  // New state for Compact mode (Compression)
  const [isCompact, setIsCompact] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState({ size: 0, keys: 0 });

  // Persist WordWrap preference
  const [wordWrap, setWordWrap] = useState(true);

  // Search Navigation State
  const [matches, setMatches] = useState<Match[]>([]);
  const [currentMatchIdx, setCurrentMatchIdx] = useState<number>(-1);
  const [openPaths, setOpenPaths] = useState<Set<string>>(
    () => new Set(["root"])
  );
  const [searchOverload, setSearchOverload] = useState<{
    reason: "match-limit" | "node-limit" | "expand-limit";
    limit: number;
  } | null>(null);
  const MAX_SEARCH_QUERY_LENGTH = 128;
  const SEARCH_MATCH_DISPLAY_CAP = 400;
  const TREE_ROW_HEIGHT = 24;

  const { matchedKeyPaths, matchedValuePaths } = useMemo(() => {
    const keySet = new Set<string>();
    const valueSet = new Set<string>();

    matches.forEach((m) => {
      if (m.type === "key") {
        keySet.add(m.path);
      } else {
        valueSet.add(m.path);
      }
    });

    return { matchedKeyPaths: keySet, matchedValuePaths: valueSet };
  }, [matches]);

  // Auto-convert debounce timer ref
  const autoConvertTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  // Initialize Google Analytics
  useEffect(() => {
    const gaId = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID;
    if (gaId && typeof window !== "undefined" && !(window as any).gtag) {
      const script = document.createElement("script");
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
      document.head.appendChild(script);

      const scriptInit = document.createElement("script");
      scriptInit.innerHTML = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${gaId}');
      `;
      document.head.appendChild(scriptInit);
    }
  }, []);

  // Persist Preferences Effects
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(
      "pyson_view_mode"
    ) as ViewMode | null;
    if (saved === ViewMode.TREE || saved === ViewMode.RAW) {
      setViewMode(saved);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem("pyson_word_wrap");
    if (saved !== null) {
      setWordWrap(saved === "true");
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("pyson_view_mode", viewMode);
    }
  }, [viewMode]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("pyson_word_wrap", String(wordWrap));
    }
  }, [wordWrap]);

  // Click outside listener for Tools Menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        toolsMenuRef.current &&
        !toolsMenuRef.current.contains(event.target as Node)
      ) {
        setShowToolsMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Dynamic Title
  useEffect(() => {
    if (language === "zh") {
      document.title = "PySon 转换器 | 在线 Python 转 JSON 工具 (本地处理)";
    } else {
      document.title = "PySon Converter | Python to JSON Tool (Client-side)";
    }
  }, [language]);

  const isSearchDisabled = useMemo(() => {
    // Disable search for very large JSON payloads
    const LARGE_KEY_THRESHOLD = 100000;
    const LARGE_SIZE_THRESHOLD = 5000_000; // ~5 MB
    return (
      stats.keys > LARGE_KEY_THRESHOLD || stats.size > LARGE_SIZE_THRESHOLD
    );
  }, [stats.keys, stats.size]);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const handleConvert = useCallback(async (textToConvert: string) => {
    if (!textToConvert.trim()) {
      setJsonOutput(null);
      setStats({ size: 0, keys: 0 });
      setOpenPaths(new Set(["root"]));
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const jsonStr = await convertPythonToJson(textToConvert);
      const parsed = JSON.parse(jsonStr);
      setJsonOutput(parsed);
      setOpenPaths(computeExpandAllOpenPaths(parsed));

      const sizeBytes = new Blob([jsonStr]).size;
      const keyCount = countKeys(parsed);
      setStats({ size: sizeBytes, keys: keyCount });
    } catch (err: any) {
      setError(
        err.toString() || "Failed to parse. Is the Python syntax correct?"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle Input Change
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    setInput(newVal);

    if (autoConvertTimerRef.current) {
      clearTimeout(autoConvertTimerRef.current);
    }
    autoConvertTimerRef.current = setTimeout(() => {
      handleConvert(newVal);
    }, 800);
  };

  const countKeys = (root: any): number => {
    if (!root || typeof root !== "object") return 0;

    // Iterative traversal to avoid call-stack overflow on deeply nested JSON.
    let count = 0;
    const stack: any[] = [root];
    while (stack.length > 0) {
      const node = stack.pop();
      if (!node || typeof node !== "object") continue;
      if (Array.isArray(node)) {
        count += node.length;
        for (let i = 0; i < node.length; i++) {
          stack.push(node[i]);
        }
      } else {
        const keys = Object.keys(node);
        count += keys.length;
        for (let i = 0; i < keys.length; i++) {
          stack.push(node[keys[i]]);
        }
      }
    }
    return count;
  };

  // Search Logic - Optimized Iterative Approach with Time Slicing
  useEffect(() => {
    const trimmedQuery = debouncedSearchQuery.trim();
    const isTooLong = trimmedQuery.length > MAX_SEARCH_QUERY_LENGTH;
    setSearchOverload(null);

    if (!jsonOutput || !trimmedQuery || isSearchDisabled || isTooLong) {
      setMatches([]);
      setCurrentMatchIdx(-1);
      return;
    }

    let isCancelled = false;

    const runSearch = async () => {
      const found: Match[] = [];
      const q = trimmedQuery.toLowerCase();

      // Safety limit to prevent UI freeze
      const MATCH_LIMIT = 100; // keep DOM manageable
      const MAX_NODES = 30000; // hard cap to avoid UI freeze
      const EXPAND_PATH_LIMIT = 300; // limit how many nodes get forced-open
      let nodesVisited = 0;
      let lastYieldTime = performance.now();
      let hitMatchLimit = false;
      let hitNodeLimit = false;
      let hitExpandLimit = false;

      // Helper to track parents (REMOVED for bulk expansion to prevent crash)
      // We now only expand the ACTIVE match.
      /*
      const addParentsToExpand = (pathStr: string) => {
        const parts = pathStr.split(".");
        let current = parts[0];
        pathsToExpand.add(current);
        if (pathsToExpand.size >= EXPAND_PATH_LIMIT) {
          hitExpandLimit = true;
          return;
        }
        for (let i = 1; i < parts.length; i++) {
          current += `.${parts[i]}`;
          pathsToExpand.add(current);
          if (pathsToExpand.size >= EXPAND_PATH_LIMIT) {
            hitExpandLimit = true;
            return;
          }
        }
      };
      */

      // Iterative Search (Stack-based DFS with Iterator Optimization)
      // This prevents O(N) stack growth for large arrays/objects
      type StackItem =
        | { kind: "node"; data: any; path: string; keyToCheck?: string | null }
        | { kind: "array"; data: any[]; index: number; path: string }
        | {
            kind: "object";
            data: any;
            keys: string[];
            index: number;
            path: string;
          };

      const stack: StackItem[] = [
        { kind: "node", data: jsonOutput, path: "root", keyToCheck: null },
      ];

      while (stack.length > 0) {
        if (isCancelled) return;

        // Yield control every 12ms to keep UI responsive
        if (performance.now() - lastYieldTime > 12) {
          await new Promise((resolve) => setTimeout(resolve, 0));
          lastYieldTime = performance.now();
          if (isCancelled) return;
        }

        if (found.length >= MATCH_LIMIT) {
          hitMatchLimit = true;
          break;
        }
        if (nodesVisited >= MAX_NODES) {
          hitNodeLimit = true;
          break;
        }

        const item = stack.pop()!;

        if (item.kind === "node") {
          nodesVisited++;
          const { data, path, keyToCheck } = item;

          // 1. Check Key
          if (keyToCheck && keyToCheck.toLowerCase().includes(q)) {
            found.push({ path, type: "key" });
            // addParentsToExpand(path); // Disabled to prevent crash
          }

          // 2. Check Value (Primitive)
          if (typeof data !== "object" || data === null) {
            const valStr = String(data);
            if (valStr.length < 5000 && valStr.toLowerCase().includes(q)) {
              found.push({ path, type: "value" });
              // addParentsToExpand(path); // Disabled to prevent crash
            }
          }
          // 3. Handle Object/Array (Push Iterator)
          else {
            if (Array.isArray(data)) {
              stack.push({ kind: "array", data, index: 0, path });
            } else {
              stack.push({
                kind: "object",
                data,
                keys: Object.keys(data),
                index: 0,
                path,
              });
            }
          }
        } else if (item.kind === "array") {
          const { data, index, path } = item;
          if (index < data.length) {
            // Push next iterator state first (so it's processed later)
            stack.push({ kind: "array", data, index: index + 1, path });
            // Push current node (so it's processed now)
            stack.push({
              kind: "node",
              data: data[index],
              path: joinPath(path, index),
              keyToCheck: null,
            });
          }
        } else if (item.kind === "object") {
          const { data, keys, index, path } = item;
          if (index < keys.length) {
            // Push next iterator state
            stack.push({ kind: "object", data, keys, index: index + 1, path });
            // Push current node
            const key = keys[index];
            stack.push({
              kind: "node",
              data: data[key],
              path: joinPath(path, key),
              keyToCheck: key,
            });
          }
        }
      }

      if (!isCancelled) {
        const overloadReason = hitMatchLimit
          ? ("match-limit" as const)
          : hitNodeLimit
          ? ("node-limit" as const)
          : hitExpandLimit
          ? ("expand-limit" as const)
          : null;

        if (overloadReason) {
          setSearchOverload({
            reason: overloadReason,
            limit:
              overloadReason === "match-limit"
                ? MATCH_LIMIT
                : overloadReason === "node-limit"
                ? MAX_NODES
                : EXPAND_PATH_LIMIT,
          });
        }

        setMatches(found);
        setCurrentMatchIdx(found.length > 0 ? 0 : -1);
      }
    };

    runSearch();

    return () => {
      isCancelled = true;
    };
  }, [jsonOutput, debouncedSearchQuery, isSearchDisabled]);

  const navigateSearch = (direction: "next" | "prev") => {
    if (matches.length === 0) return;
    if (direction === "next") {
      setCurrentMatchIdx((prev) => (prev + 1) % matches.length);
    } else {
      setCurrentMatchIdx(
        (prev) => (prev - 1 + matches.length) % matches.length
      );
    }
  };

  const handleCopy = () => {
    if (!jsonOutput) return;
    const text = isCompact
      ? JSON.stringify(jsonOutput)
      : JSON.stringify(jsonOutput, null, 2);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDemo = () => {
    const demoData = DEMO_PYTHON_DATA.trim();
    setInput(demoData);
    setError(null);
    handleConvert(demoData);
  };

  const clearAll = () => {
    setInput("");
    setJsonOutput(null);
    setError(null);
    setSearchQuery("");
    setDebouncedSearchQuery("");
    setOpenPaths(new Set(["root"]));
    if (autoConvertTimerRef.current) {
      clearTimeout(autoConvertTimerRef.current);
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === "en" ? "zh" : "en");
  };

  const handleExpandAll = () => {
    if (!jsonOutput) return;

    setOpenPaths(computeExpandAllOpenPaths(jsonOutput));
  };

  const handleCollapseAll = () => {
    setOpenPaths(new Set(["root"]));
  };

  const effectiveSearchQuery = React.useMemo(() => {
    const trimmed = debouncedSearchQuery.trim();
    if (isSearchDisabled) return "";
    if (!trimmed) return "";
    if (trimmed.length > MAX_SEARCH_QUERY_LENGTH) return "";
    return trimmed;
  }, [debouncedSearchQuery, isSearchDisabled, MAX_SEARCH_QUERY_LENGTH]);

  const searchRegex = useMemo(() => {
    if (!effectiveSearchQuery) return null;
    try {
      const escaped = effectiveSearchQuery.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );
      return new RegExp(`(${escaped})`, "gi");
    } catch {
      return null;
    }
  }, [effectiveSearchQuery]);

  const activeMatch =
    currentMatchIdx >= 0 && currentMatchIdx < matches.length
      ? matches[currentMatchIdx]
      : null;
  const activePath = activeMatch?.path ?? null;

  const searchExpandPaths = useMemo(() => {
    if (!effectiveSearchQuery || !activePath) return new Set<string>();
    return buildAncestorPaths(activePath);
  }, [effectiveSearchQuery, activePath]);

  const expandedPathsForView = useMemo(() => {
    const merged = new Set<string>(openPaths);
    for (const p of searchExpandPaths) merged.add(p);
    // Always keep root expanded for usability
    merged.add("root");
    return merged;
  }, [openPaths, searchExpandPaths]);

  const flatNodes = useMemo(() => {
    if (!jsonOutput) return [];
    return flattenTree(jsonOutput, expandedPathsForView, "root", {
      activePath,
      maxFlatNodes: 50000,
      headChildren: 200,
      contextChildren: 5,
    });
  }, [jsonOutput, expandedPathsForView, activePath]);

  const pathIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    for (let i = 0; i < flatNodes.length; i++) {
      map.set(flatNodes[i].id, i);
    }
    return map;
  }, [flatNodes]);

  const activeIndex = activePath ? pathIndexMap.get(activePath) ?? null : null;

  const handleTogglePath = useCallback((path: string) => {
    setOpenPaths((prev) => {
      const next = new Set<string>(prev);
      const prefix = `${path}/`;
      if (next.has(path)) {
        next.delete(path);
        // Drop descendants to keep state small.
        for (const p of Array.from(next)) {
          if (p.startsWith(prefix)) next.delete(p);
        }
      } else {
        next.add(path);
      }
      next.add("root");
      return next;
    });
  }, []);

  return (
    <div className="flex flex-col h-screen bg-duck-bg text-duck-text font-sans overflow-hidden">
      {/* Top Navigation Bar */}
      <nav className="h-16 border-b border-duck-border flex items-center justify-between px-6 bg-duck-bg z-20 shrink-0">
        <div className="flex items-center gap-4">
          <a
            href="/"
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            title={t("nav.home")}
            aria-label="PySon Converter - Python to JSON tool"
          >
            <Logo />
            <div className="flex flex-col">
              <h1 className="text-lg font-mono font-bold tracking-tight leading-none">
                PySon
              </h1>
              <span className="text-[10px] uppercase tracking-widest text-duck-text/60 font-bold mt-0.5">
                {t("nav.subtitle")}
              </span>
            </div>
          </a>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/"
            className="flex items-center gap-2 px-3 py-2 text-sm font-bold text-duck-text hover:bg-duck-hover rounded-duck transition-colors"
          >
            <Home size={16} />
            <span className="hidden sm:inline">{t("nav.home")}</span>
          </a>

          <div className="relative" ref={toolsMenuRef}>
            <button
              onClick={() => setShowToolsMenu(!showToolsMenu)}
              className={`flex items-center gap-2 px-3 py-2 text-sm font-bold rounded-duck transition-all border ${
                showToolsMenu
                  ? "bg-duck-hover border-duck-border"
                  : "border-transparent hover:bg-duck-hover hover:border-duck-border/20"
              }`}
              title={t("nav.moreTools")}
            >
              <Grid size={16} />
              <span className="hidden sm:inline">{t("nav.moreTools")}</span>
              <ChevronDown
                size={12}
                className={`transition-transform ${
                  showToolsMenu ? "rotate-180" : ""
                }`}
              />
            </button>

            {showToolsMenu && (
              <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-duck-border rounded-duck shadow-[4px_4px_0px_0px_rgba(56,56,56,1)] z-50 p-2 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="p-3 text-center text-duck-text/50">
                  <span className="text-xs font-bold">
                    {t("nav.underDevelopment")}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="h-6 w-px bg-duck-border/20 mx-1"></div>

          <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-duck bg-white border border-duck-border shadow-[2px_2px_0px_0px_rgba(56,56,56,1)]">
            <Cpu size={14} className="text-duck-text" />
            <span className="text-xs font-mono font-bold">
              {t("nav.localEngine")}
            </span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="font-bold flex items-center gap-1.5 px-2"
            onClick={toggleLanguage}
            title={
              language === "en" ? "Switch to Chinese" : "Switch to English"
            }
          >
            <Globe size={16} />
            {language === "en" ? "EN" : "中文"}
          </Button>
        </div>
      </nav>

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* INPUT PANE */}
        <div className="flex-1 flex flex-col border-r border-duck-border min-w-0 bg-duck-bg">
          {/* Toolbar */}
          <div className="h-12 flex items-center justify-between px-4 border-b border-duck-border bg-duck-bg shrink-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-mono font-bold text-duck-text uppercase flex items-center gap-2 px-2 py-1 bg-white border border-duck-border rounded-duck">
                <Code2 size={14} />
                {t("input.title")}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              {!input && (
                <Button variant="secondary" size="sm" onClick={handleDemo}>
                  {t("input.loadDemo")}
                </Button>
              )}
              <Button
                variant="icon"
                onClick={clearAll}
                className="hover:text-red-600 hover:border-red-600"
              >
                <Trash2 size={16} />
              </Button>
            </div>
          </div>

          {/* Editor */}
          <div className="flex-1 relative bg-white">
            <textarea
              value={input}
              onChange={handleInputChange}
              placeholder={t("input.placeholder")}
              aria-label="Python code input"
              className="w-full h-full bg-white p-6 font-mono text-sm text-duck-text resize-none focus:outline-none leading-relaxed selection:bg-duck-yellow selection:text-black"
              spellCheck={false}
            />

            <div className="absolute bottom-6 right-6 z-10 opacity-50 hover:opacity-100 transition-opacity">
              <Button
                variant="primary"
                onClick={() => handleConvert(input)}
                disabled={loading || !input}
                className="shadow-[4px_4px_0px_0px_rgba(56,56,56,1)] hover:shadow-[2px_2px_0px_0px_rgba(56,56,56,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all border-2 border-duck-border"
              >
                {loading ? (
                  <span className="animate-spin mr-2">⟳</span>
                ) : (
                  <Play size={16} fill="currentColor" />
                )}
                {t("input.convert")}
              </Button>
            </div>
          </div>
        </div>

        {/* OUTPUT PANE */}
        <div className="flex-1 flex flex-col min-w-0 bg-duck-bg relative">
          {/* Toolbar */}
          <div className="h-12 flex items-center justify-between px-4 border-b border-duck-border bg-duck-bg shrink-0">
            <div className="flex items-center gap-4">
              <h2 className="flex items-center gap-2 text-sm font-mono font-bold text-duck-text uppercase px-2 py-1 bg-white border border-duck-border rounded-duck">
                <Braces size={14} />
                {t("output.title")}
              </h2>

              {jsonOutput && (
                <div className="flex items-center gap-2">
                  <div className="flex bg-white rounded-duck border border-duck-border p-0.5 shadow-[2px_2px_0px_0px_rgba(56,56,56,0.1)]">
                    <button
                      onClick={() => setViewMode(ViewMode.TREE)}
                      className={`px-3 py-1 text-xs font-bold rounded-sm transition-all ${
                        viewMode === ViewMode.TREE
                          ? "bg-duck-border text-white"
                          : "text-duck-text hover:bg-duck-hover"
                      }`}
                    >
                      {t("output.tree")}
                    </button>
                    <button
                      onClick={() => setViewMode(ViewMode.RAW)}
                      className={`px-3 py-1 text-xs font-bold rounded-sm transition-all ${
                        viewMode === ViewMode.RAW
                          ? "bg-duck-border text-white"
                          : "text-duck-text hover:bg-duck-hover"
                      }`}
                    >
                      {t("output.raw")}
                    </button>
                  </div>

                  {viewMode === ViewMode.TREE && (
                    <>
                      <Button
                        variant={wordWrap ? "primary" : "secondary"}
                        size="sm"
                        onClick={() => setWordWrap(!wordWrap)}
                        title={
                          wordWrap
                            ? t("output.disableWrap")
                            : t("output.enableWrap")
                        }
                        className="px-2"
                      >
                        <WrapText size={14} />
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleExpandAll}
                        className="px-2"
                        title="全部展开"
                      >
                        <ChevronDown size={14} />
                        <span className="hidden sm:inline ml-1">展开</span>
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleCollapseAll}
                        className="px-2"
                        title="全部收起"
                      >
                        <ChevronUp size={14} />
                        <span className="hidden sm:inline ml-1">收起</span>
                      </Button>
                    </>
                  )}

                  {viewMode === ViewMode.RAW && (
                    <Button
                      variant={isCompact ? "primary" : "secondary"}
                      size="sm"
                      onClick={() => setIsCompact(!isCompact)}
                      title={
                        isCompact ? t("output.expand") : t("output.compact")
                      }
                      className="px-2"
                    >
                      {isCompact ? (
                        <Maximize2 size={14} />
                      ) : (
                        <Minimize2 size={14} />
                      )}
                      <span className="hidden sm:inline ml-1">
                        {isCompact ? t("output.expand") : t("output.compact")}
                      </span>
                    </Button>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {jsonOutput && (
                <>
                  {viewMode === ViewMode.TREE && (
                    <div className="relative group flex items-center bg-white border border-duck-border rounded-duck transition-all focus-within:ring-2 focus-within:ring-duck-yellow px-1">
                      <Search
                        size={14}
                        className="ml-1 text-duck-text/50 shrink-0"
                      />
                      <input
                        type="text"
                        placeholder={t("output.filter")}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        aria-label="Search JSON output"
                        className="h-9 min-w-[60px] flex-1 pl-2 pr-1 text-xs font-mono text-duck-text focus:outline-none bg-transparent disabled:text-duck-text/40"
                        disabled={isSearchDisabled}
                      />

                      {searchQuery && (
                        <button
                          onClick={() => {
                            setSearchQuery("");
                            setDebouncedSearchQuery("");
                          }}
                          className="shrink-0 p-1 hover:bg-duck-hover rounded-sm text-duck-text/60 hover:text-red-500 transition-colors"
                        >
                          <X size={12} />
                        </button>
                      )}

                      {matches.length > 0 && !isSearchDisabled && (
                        <div className="flex items-center border-l border-duck-border/30 pl-1 ml-1 shrink-0">
                          <span className="text-[10px] font-mono text-duck-text/50 mr-2 min-w-[30px] text-center">
                            {currentMatchIdx + 1}/
                            {matches.length >= SEARCH_MATCH_DISPLAY_CAP
                              ? `${SEARCH_MATCH_DISPLAY_CAP}+`
                              : matches.length}
                          </span>
                          <button
                            onClick={() => navigateSearch("prev")}
                            className="p-1 hover:bg-duck-hover rounded-sm text-duck-text"
                          >
                            <ChevronUp size={14} />
                          </button>
                          <button
                            onClick={() => navigateSearch("next")}
                            className="p-1 hover:bg-duck-hover rounded-sm text-duck-text"
                          >
                            <ChevronDown size={14} />
                          </button>
                        </div>
                      )}
                      {searchOverload && (
                        <span className="ml-2 text-[10px] font-mono text-red-500 whitespace-nowrap">
                          {searchOverload.reason === "match-limit"
                            ? t("output.searchTooMany", {
                                limit: searchOverload.limit,
                              })
                            : searchOverload.reason === "node-limit"
                            ? t("output.searchTooLarge")
                            : t("output.searchTooWide")}
                        </span>
                      )}
                      {isSearchDisabled && (
                        <span className="ml-2 text-[10px] font-mono text-red-500 whitespace-nowrap">
                          Search disabled for large JSON
                        </span>
                      )}
                    </div>
                  )}

                  <Button
                    variant="secondary"
                    onClick={handleCopy}
                    title={t("output.copy")}
                    className="px-3"
                  >
                    {copied ? (
                      <Check size={16} className="text-green-600" />
                    ) : (
                      <Copy size={16} />
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Result Area */}
          <div className="flex-1 p-6 bg-white relative overflow-hidden">
            {!jsonOutput && !error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-duck-border/20 select-none pointer-events-none">
                <div className="w-24 h-24 border-4 border-current rounded-full flex items-center justify-center mb-6">
                  <Layout size={48} strokeWidth={2} />
                </div>
                <p className="text-xl font-mono font-bold text-duck-text/30">
                  {t("input.waiting")}
                </p>
              </div>
            )}

            {error && (
              <div className="p-4 rounded-duck border-2 border-red-500 bg-red-50 text-red-700 text-sm font-mono shadow-[4px_4px_0px_0px_rgba(239,68,68,1)]">
                <div className="flex items-center gap-2 mb-2 font-bold uppercase tracking-wider">
                  <div className="w-2 h-2 rounded-full bg-red-600"></div>
                  {t("input.parseError")}
                </div>
                {error}
              </div>
            )}

            {jsonOutput && viewMode === ViewMode.TREE && (
              <div className="text-sm animate-in fade-in duration-300 h-full">
                <VirtualList
                  items={flatNodes}
                  rowHeight={TREE_ROW_HEIGHT}
                  onToggle={handleTogglePath}
                  searchQuery={effectiveSearchQuery}
                  searchRegex={searchRegex}
                  activeMatchPath={activePath}
                  activeIndex={activeIndex}
                  matchedKeyPaths={matchedKeyPaths}
                  matchedValuePaths={matchedValuePaths}
                  wordWrap={wordWrap}
                />
              </div>
            )}

            {jsonOutput && viewMode === ViewMode.RAW && (
              <textarea
                readOnly
                aria-label="JSON output"
                className="w-full h-full bg-transparent font-mono text-xs leading-5 text-duck-text focus:outline-none resize-none"
                value={
                  isCompact
                    ? JSON.stringify(jsonOutput)
                    : JSON.stringify(jsonOutput, null, 2)
                }
              />
            )}
          </div>
        </div>
      </main>

      {/* Footer / Status Bar */}
      <footer className="h-8 bg-duck-bg border-t border-duck-border flex items-center justify-between px-6 text-[11px] font-mono text-duck-text/70 select-none shrink-0">
        <div className="flex items-center gap-6">
          {jsonOutput ? (
            <span>{t("footer.keysFound", { count: stats.keys })}</span>
          ) : (
            <span></span>
          )}
        </div>
        <div className="flex items-center gap-6">
          {/* Feedback Link for Developer */}
          <a
            href="mailto:contact@icy-cat.com"
            className="flex items-center gap-1.5 hover:text-duck-blue transition-colors font-bold group"
          >
            <MessageSquare size={12} />
            <span className="group-hover:underline decoration-duck-blue decoration-2 underline-offset-2">
              {t("footer.reportBug")}
            </span>
          </a>

          <div className="flex items-center gap-4 font-bold border-l border-duck-border/20 pl-4">
            {jsonOutput && <span>{(stats.size / 1024).toFixed(1)} kB</span>}
            <span>{t("footer.utf8")}</span>
            <span>{t("footer.json")}</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
