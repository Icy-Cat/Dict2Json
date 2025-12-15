import React, { useRef, useEffect, useState, useMemo } from "react";
import { FlatNode } from "../utils/tree";
import { JsonRow } from "./JsonRow";

interface VirtualListProps {
  items: FlatNode[];
  rowHeight: number;
  onToggle: (path: string) => void;
  searchQuery: string;
  searchRegex: RegExp | null;
  activeMatchPath?: string | null;
  activeIndex?: number | null;
  matchedKeyPaths?: Set<string>;
  matchedValuePaths?: Set<string>;
  wordWrap?: boolean;
  containerHeight?: number; // Optional explicit height
}

export const VirtualList: React.FC<VirtualListProps> = ({
  items,
  rowHeight,
  onToggle,
  searchQuery,
  searchRegex,
  activeMatchPath,
  activeIndex,
  matchedKeyPaths,
  matchedValuePaths,
  wordWrap,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(600); // Default fallback
  const lastAutoScrollIndexRef = useRef<number | null>(null);

  // Update viewport height on resize
  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setViewportHeight(entry.contentRect.height);
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Handle scroll
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  // Calculate visible range
  const totalHeight = items.length * rowHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - 5); // Buffer 5 rows
  const endIndex = Math.min(
    items.length,
    Math.ceil((scrollTop + viewportHeight) / rowHeight) + 5
  );

  const visibleItems = useMemo(() => {
    return items.slice(startIndex, endIndex).map((item, index) => ({
      item,
      index: startIndex + index,
    }));
  }, [items, startIndex, endIndex]);

  // Scroll to active match
  useEffect(() => {
    if (activeIndex == null || !containerRef.current) return;
    if (activeIndex < 0 || activeIndex >= items.length) return;
    if (lastAutoScrollIndexRef.current === activeIndex) return;

    const currentScrollTop = containerRef.current.scrollTop;
    const top = activeIndex * rowHeight;
    if (
      top < currentScrollTop ||
      top > currentScrollTop + viewportHeight - rowHeight
    ) {
      containerRef.current.scrollTo({ top, behavior: "auto" });
    }
    lastAutoScrollIndexRef.current = activeIndex;
  }, [activeIndex, items.length, rowHeight, viewportHeight]);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="w-full h-full overflow-auto relative scrollbar-thin"
      style={{ willChange: "transform" }} // Hint for GPU
    >
      <div style={{ height: totalHeight, position: "relative" }}>
        {visibleItems.map(({ item, index }) => (
          <JsonRow
            key={item.id} // Use path as key for stability
            node={item}
            style={{
              position: "absolute",
              top: index * rowHeight,
              left: 0,
              width: "100%",
              height: rowHeight,
            }}
            onToggle={onToggle}
            searchQuery={searchQuery}
            searchRegex={searchRegex}
            activeMatchPath={activeMatchPath}
            matchedKeyPaths={matchedKeyPaths}
            matchedValuePaths={matchedValuePaths}
            wordWrap={wordWrap}
          />
        ))}
      </div>
    </div>
  );
};
