import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useTransition,
} from "react";
import { ChevronRight, ChevronDown, MoreHorizontal, Copy } from "lucide-react";
import { JsonNodeProps } from "../types";
import { useLanguage } from "../contexts/LanguageContext";
import { joinPath, getNextChildKey, pathToMatchElementId } from "../utils/path";

const PAGE_SIZE = 25;

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const highlightText = (
  text: string,
  query: string,
  isActive: boolean,
  searchRegex?: RegExp | null
) => {
  // CRASH PROTECTION & PERFORMANCE OPTIMIZATION

  // 1. If no query, return plain text
  if (!query) return text;

  // 1.5 Guard against extremely long queries (e.g. pasted huge strings)
  if (query.length > 128) return text;

  // 2. Length Guard: If text is too long, skip regex completely
  if (text.length > 1000) return text;

  // 3. Short Query Guard: If query is 1 char and text is relatively long, skip to avoid "confetti" effect
  if (query.length === 1 && text.length > 200) return text;

  try {
    let regex = searchRegex;
    if (!regex) {
      const escapedQuery = escapeRegExp(query);
      regex = new RegExp(`(${escapedQuery})`, "gi");
    }

    // 4. Density Guard: Check number of matches before splitting
    // String.match is faster than splitting and rendering DOM
    const matches = text.match(regex);
    if (!matches || matches.length > 50) return text; // Too many nodes to render safely

    const parts = text.split(regex);
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <span
              key={i}
              className={`${
                isActive
                  ? "bg-duck-blue text-white"
                  : "bg-duck-yellow text-black"
              } font-bold px-0.5 rounded-[1px] border border-black/10`}
            >
              {part}
            </span>
          ) : (
            part
          )
        )}
      </span>
    );
  } catch (e) {
    // Fallback if regex fails for any reason
    return text;
  }
};

const JsonNodeComponent: React.FC<JsonNodeProps> = ({
  data,
  name,
  isLast = true,
  depth = 0,
  searchQuery,
  searchRegex,
  path = "root",
  activeMatch,
  expandedPaths,
  matchedKeyPaths,
  matchedValuePaths,
  wordWrap = false,
  globalExpandMode = null,
  globalExpandVersion,
}) => {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(depth < 2); // Default open based on user preference
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [isHovered, setIsHovered] = useState(false);
  const [isPending, startTransition] = useTransition();
  const nodeRef = useRef<HTMLDivElement>(null);

  // O(1) Lookup for expansion state
  const shouldExpandFromSearch = useMemo(() => {
    return expandedPaths ? expandedPaths.has(path) : false;
  }, [expandedPaths, path]);

  // Sync open state with global expand/collapse
  useEffect(() => {
    if (!globalExpandMode) return;
    setIsOpen(globalExpandMode === "expand");
  }, [globalExpandMode, globalExpandVersion]);

  // When searching, only force-open paths that should be expanded.
  // CRITICAL FIX: Also force-close paths that are no longer in the search path
  // to prevent memory leaks and crashes when navigating large results.
  useEffect(() => {
    if (searchQuery) {
      if (shouldExpandFromSearch) {
        setIsOpen(true);
      } else if (isOpen) {
        // If we are open, but no longer in the search path, close it.
        // This ensures we only keep the *current* match context open.
        setIsOpen(false);
      }
    }
  }, [searchQuery, shouldExpandFromSearch]);

  // Reset pagination when closed to save memory, but keep if open
  useEffect(() => {
    if (!isOpen) {
      setVisibleCount(PAGE_SIZE);
    }
  }, [isOpen]);

  const isObject = data !== null && typeof data === "object";
  const isArray = Array.isArray(data);
  const indent = depth * 20;
  const isKeyActive = activeMatch?.type === "key" && activeMatch.path === path;
  const isValueActive =
    activeMatch?.type === "value" && activeMatch.path === path;
  const hasKeyMatch = matchedKeyPaths?.has(path) ?? false;
  const hasValueMatch = matchedValuePaths?.has(path) ?? false;
  const shouldHighlightKey = !!searchQuery && (hasKeyMatch || isKeyActive);
  const shouldHighlightValue =
    !!searchQuery && (hasValueMatch || isValueActive);

  // Memoize keys
  const objectKeys = useMemo(() => {
    if (!isObject || isArray) return [] as string[];
    return Object.keys(data);
  }, [data, isObject, isArray]);

  const arrayLength = isArray ? (data as any[]).length : 0;
  const totalChildren = isArray ? arrayLength : objectKeys.length;
  const isEmpty = totalChildren === 0;

  // AUTO-EXPAND PAGINATION FOR ACTIVE MATCH
  // Optimized to avoid rendering thousands of nodes
  const activeKeyIndex = useMemo(() => {
    if (!activeMatch || !isOpen || isEmpty) return -1;
    const nextKey = getNextChildKey(path, activeMatch.path);
    if (nextKey == null) return -1;

    if (isArray) {
      const idx = Number(nextKey);
      return Number.isFinite(idx) ? idx : -1;
    }

    return objectKeys.indexOf(nextKey);
  }, [activeMatch, path, isOpen, isEmpty, isArray, objectKeys]);

  // Pagination logic (Moved to top level)
  // Instead of just slicing, we create a "windowed" list if the active match is far away
  const renderList = useMemo(() => {
    const list: {
      type: "node" | "placeholder";
      key?: string;
      index: number;
      count?: number;
    }[] = [];
    const HEAD_SIZE = visibleCount;
    const CONTEXT_SIZE = 5;

    // 1. Head
    const headEnd = Math.min(HEAD_SIZE, totalChildren);
    for (let i = 0; i < headEnd; i++) {
      list.push({
        type: "node",
        key: isArray ? String(i) : objectKeys[i],
        index: i,
      });
    }

    // 2. Active Match Context (if outside head)
    if (activeKeyIndex !== -1 && activeKeyIndex >= headEnd) {
      const start = Math.max(headEnd, activeKeyIndex - CONTEXT_SIZE);
      const end = Math.min(totalChildren, activeKeyIndex + CONTEXT_SIZE + 1);

      if (start > headEnd) {
        list.push({
          type: "placeholder",
          count: start - headEnd,
          index: headEnd,
        });
      }

      for (let i = start; i < end; i++) {
        list.push({
          type: "node",
          key: isArray ? String(i) : objectKeys[i],
          index: i,
        });
      }
    }

    return list;
  }, [isArray, objectKeys, totalChildren, visibleCount, activeKeyIndex]);

  const hasMore =
    totalChildren > visibleCount &&
    (activeKeyIndex === -1 || activeKeyIndex < totalChildren - 10);

  // Copy Value Helper
  const copyValue = (e: React.MouseEvent) => {
    e.stopPropagation();
    let valToCopy = "";
    if (typeof data === "object") valToCopy = JSON.stringify(data, null, 2);
    else valToCopy = String(data);

    navigator.clipboard.writeText(valToCopy);
  };

  // Render Key Logic
  const renderKey = () => {
    if (name === undefined) return null;
    const keyStr = String(name);
    const matchId = pathToMatchElementId(path, "key");
    const highlightedKey = shouldHighlightKey
      ? highlightText(keyStr, searchQuery, isKeyActive, searchRegex)
      : keyStr;

    return (
      <span
        className={`mr-2 text-[#660099] font-bold shrink-0 ${
          wordWrap ? "" : "whitespace-nowrap"
        }`}
        id={matchId}
      >
        "
        <span
          className={
            isKeyActive ? "bg-duck-blue text-white px-0.5 rounded-sm" : ""
          }
        >
          {highlightedKey}
        </span>
        "<span className="text-duck-text">:</span>
      </span>
    );
  };

  // Scroll into view logic
  useEffect(() => {
    if ((isKeyActive || isValueActive) && nodeRef.current) {
      nodeRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [isKeyActive, isValueActive]);

  // Primitive Value Logic
  if (!isObject) {
    let valueClass = "text-[#007020] font-medium";

    if (typeof data === "number") valueClass = "text-[#B04000] font-bold";
    if (typeof data === "boolean") valueClass = "text-[#0055AA] font-bold";
    if (data === null) {
      valueClass = "text-gray-500 italic font-medium";
    }

    // Add wrap classes based on prop
    // Use break-all to ensure very long strings without spaces still wrap
    valueClass += wordWrap
      ? " whitespace-pre-wrap break-all"
      : " whitespace-nowrap";

    const rawString = String(data);
    const matchId = pathToMatchElementId(path, "value");

    // CRASH PROTECTION:
    // Even if wordWrap is on, we cannot render 1MB string in a single node safely.
    // We enforce a hard limit of 2,000 chars for display (reduced from 10k).
    const MAX_DISPLAY_CHARS = 2000;

    let displayString = rawString;
    let isTruncated = false;

    if (rawString.length > MAX_DISPLAY_CHARS) {
      displayString = rawString.slice(0, MAX_DISPLAY_CHARS) + "...";
      isTruncated = true;
    } else if (rawString.length > 300 && !wordWrap && !isValueActive) {
      // Also truncate in single-line mode if too long
      displayString = rawString.slice(0, 300) + "...";
      isTruncated = true;
    }

    return (
      <div
        ref={nodeRef}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{ marginLeft: indent }}
        className={`relative flex ${
          wordWrap ? "items-start" : "items-center"
        } font-mono text-[13px] leading-6 px-1 rounded-sm transition-colors border-l border-transparent ${
          isValueActive
            ? "bg-duck-blue/10 border-duck-blue"
            : "hover:bg-duck-yellow/10 hover:border-duck-border/10"
        }`}
      >
        {renderKey()}
        <span
          className={valueClass}
          id={matchId}
          title={isTruncated ? t("node.valueTruncated") : undefined}
        >
          {typeof data === "string" ? '"' : ""}
          {shouldHighlightValue
            ? highlightText(
                displayString,
                searchQuery,
                isValueActive,
                searchRegex
              )
            : displayString}
          {typeof data === "string" ? '"' : ""}
        </span>
        {!isLast && <span className="text-duck-text">,</span>}

        {isHovered && (
          <button
            onClick={copyValue}
            className="ml-2 text-duck-text/40 hover:text-duck-blue shrink-0"
            title={t("node.copyValue")}
          >
            <Copy size={10} />
          </button>
        )}
      </div>
    );
  }

  const openBracket = isArray ? "[" : "{";
  const closeBracket = isArray ? "]" : "}";

  if (isEmpty) {
    return (
      <div
        style={{ marginLeft: indent }}
        className="font-mono text-[13px] leading-6 hover:bg-duck-yellow/10 px-1 rounded-sm transition-colors whitespace-nowrap"
      >
        {renderKey()}
        <span className="text-duck-text font-bold">
          {openBracket}
          {closeBracket}
        </span>
        {!isLast && <span className="text-duck-text">,</span>}
      </div>
    );
  }

  return (
    <div className="font-mono text-[13px] leading-6">
      <div
        ref={nodeRef}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{ marginLeft: indent }}
        className="flex items-center cursor-pointer hover:bg-duck-yellow/10 px-1 rounded-sm transition-colors group select-none relative whitespace-nowrap"
        onClick={(e) => {
          e.stopPropagation();
          startTransition(() => {
            setIsOpen(!isOpen);
          });
        }}
      >
        <span
          className={`w-4 h-4 mr-1 text-duck-text/50 group-hover:text-black transition-opacity flex items-center justify-center shrink-0 ${
            isPending ? "opacity-30" : "opacity-100"
          }`}
        >
          {isOpen ? (
            <ChevronDown size={12} strokeWidth={3} />
          ) : (
            <ChevronRight size={12} strokeWidth={3} />
          )}
        </span>
        {renderKey()}
        <span className="text-duck-text font-bold">{openBracket}</span>
        {!isOpen && (
          <span className="text-duck-text/50 mx-2 text-[10px] bg-duck-bg border border-duck-border/30 px-1.5 rounded-sm font-medium">
            {isArray ? `${totalChildren}` : `${totalChildren}`}
          </span>
        )}
        {!isOpen && (
          <span className="text-duck-text font-bold">{closeBracket}</span>
        )}
        {!isOpen && !isLast && <span className="text-duck-text">,</span>}

        {isHovered && !isOpen && (
          <button
            onClick={copyValue}
            className="ml-2 text-duck-text/40 hover:text-duck-blue"
            title={t("node.copyValue")}
          >
            <Copy size={10} />
          </button>
        )}
      </div>

      {isOpen && (
        <div
          className="border-l border-duck-border/10 ml-[calc(1rem+4px)]"
          style={{
            contentVisibility: "auto",
            containIntrinsicSize: "1px 30px",
          }}
        >
          {renderList.map((item) => {
            if (item.type === "placeholder") {
              return (
                <div
                  key={`placeholder-${item.index}`}
                  style={{ marginLeft: -20 }}
                  className="pl-5 py-1"
                >
                  <div className="text-xs text-duck-text/40 italic px-2 py-1 border-l-2 border-duck-border/20">
                    ... {item.count} items hidden ...
                  </div>
                </div>
              );
            }
            const key = item.key!;
            return (
              <div key={key} style={{ marginLeft: -20 }}>
                <JsonNode
                  name={isArray ? undefined : key}
                  data={(data as any)[key]}
                  isLast={item.index === totalChildren - 1}
                  depth={depth + 1}
                  searchQuery={searchQuery}
                  searchRegex={searchRegex}
                  path={joinPath(path, key)}
                  activeMatch={activeMatch}
                  expandedPaths={expandedPaths}
                  matchedKeyPaths={matchedKeyPaths}
                  matchedValuePaths={matchedValuePaths}
                  wordWrap={wordWrap}
                  globalExpandMode={globalExpandMode}
                  globalExpandVersion={globalExpandVersion}
                />
              </div>
            );
          })}

          {hasMore && (
            <div style={{ marginLeft: -20 }} className="pl-5 py-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  startTransition(() => {
                    setVisibleCount((prev) => prev + PAGE_SIZE);
                  });
                }}
                className="text-xs font-bold text-duck-blue hover:underline hover:bg-duck-blue/5 flex items-center gap-2 px-2 py-1 rounded-sm border border-duck-blue/20 transition-colors"
              >
                <MoreHorizontal size={14} />
                {t("node.showMore")} (
                {t("node.remaining", { count: totalChildren - visibleCount })})
              </button>
            </div>
          )}

          <div
            style={{ marginLeft: indent }}
            className="hover:bg-duck-yellow/10 px-1 rounded-sm"
          >
            <span className="text-duck-text font-bold">{closeBracket}</span>
            {!isLast && <span className="text-duck-text">,</span>}
          </div>
        </div>
      )}
    </div>
  );
};

export const JsonNode = React.memo(JsonNodeComponent, (prev, next) => {
  // 1. Cheap checks for primitives & structural props
  if (
    prev.name !== next.name ||
    prev.isLast !== next.isLast ||
    prev.depth !== next.depth ||
    prev.path !== next.path ||
    prev.wordWrap !== next.wordWrap ||
    prev.globalExpandVersion !== next.globalExpandVersion ||
    prev.data !== next.data // Reference check for data
  ) {
    return false;
  }

  // 2. Check Search Context
  const path = next.path || "root";

  // Check Active Match Status
  const prevIsActive = prev.activeMatch?.path === path;
  const nextIsActive = next.activeMatch?.path === path;
  if (prevIsActive !== nextIsActive) return false;

  // Check Expansion Status (Did search force us open?)
  const prevExpanded = prev.expandedPaths?.has(path);
  const nextExpanded = next.expandedPaths?.has(path);
  if (prevExpanded !== nextExpanded) return false;

  // Check Match Status
  const prevKeyMatch = prev.matchedKeyPaths?.has(path);
  const nextKeyMatch = next.matchedKeyPaths?.has(path);
  if (prevKeyMatch !== nextKeyMatch) return false;

  const prevValueMatch = prev.matchedValuePaths?.has(path);
  const nextValueMatch = next.matchedValuePaths?.has(path);
  if (prevValueMatch !== nextValueMatch) return false;

  // 3. If Search Query Changed
  // We only need to re-render if we are "involved" in the search.
  // Being involved means:
  // - We are a match (checked above)
  // - We are expanded by search (checked above)
  // - We contain the active match (checked via expandedPaths)
  const searchChanged =
    prev.searchQuery !== next.searchQuery ||
    prev.searchRegex !== next.searchRegex;

  if (searchChanged) {
    // If we are expanded by search, or are a match, we must update to show/hide highlights
    // or pass new query to children.
    const isRelevant = nextExpanded || nextKeyMatch || nextValueMatch;
    const wasRelevant = prevExpanded || prevKeyMatch || prevValueMatch;

    if (isRelevant || wasRelevant) return false; // Re-render

    // If we are NOT relevant, we can skip re-render even if query changed!
    return true;
  }

  // If activeMatch object reference changed but didn't affect us (and query didn't change),
  // we might still need to pass it down if we are on the path to the active match.
  // If we are on the path, we are in expandedPaths.
  if (prev.activeMatch !== next.activeMatch) {
    if (nextExpanded || prevExpanded) return false;
    return true;
  }

  return true;
});
