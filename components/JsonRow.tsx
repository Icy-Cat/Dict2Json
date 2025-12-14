import React, { memo } from "react";
import { ChevronRight, ChevronDown, Copy } from "lucide-react";
import { FlatNode } from "../utils/tree";
import { useLanguage } from "../contexts/LanguageContext";
import { pathToMatchElementId } from "../utils/path";

interface JsonRowProps {
  node: FlatNode;
  style: React.CSSProperties;
  onToggle: (path: string) => void;
  searchQuery: string;
  searchRegex: RegExp | null;
  activeMatchPath?: string | null;
  matchedKeyPaths?: Set<string>;
  matchedValuePaths?: Set<string>;
  wordWrap?: boolean;
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const highlightText = (
  text: string,
  query: string,
  isActive: boolean,
  searchRegex?: RegExp | null
) => {
  if (!query) return text;
  if (query.length > 128) return text;
  if (text.length > 1000) return text;

  try {
    let regex = searchRegex;
    if (!regex) {
      const escapedQuery = escapeRegExp(query);
      regex = new RegExp(`(${escapedQuery})`, "gi");
    }

    const matches = text.match(regex);
    if (!matches || matches.length > 50) return text;

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
    return text;
  }
};

export const JsonRow = memo(
  ({
    node,
    style,
    onToggle,
    searchQuery,
    searchRegex,
    activeMatchPath,
    matchedKeyPaths,
    matchedValuePaths,
    wordWrap,
  }: JsonRowProps) => {
    const { t } = useLanguage();
    const {
      id: path,
      key,
      value,
      level,
      type,
      isExpanded,
      hasChildren,
      childCount,
      placeholder,
    } = node;

    const indent = level * 20;
    const isKeyMatch = matchedKeyPaths?.has(path) ?? false;
    const isValueMatch = matchedValuePaths?.has(path) ?? false;

    // Active state
    const isActive = activeMatchPath === path;
    const isKeyActiveState = isActive && isKeyMatch;
    const isValueActiveState = isActive && isValueMatch;

    const shouldHighlightKey =
      !!searchQuery && (isKeyMatch || isKeyActiveState);
    const shouldHighlightValue =
      !!searchQuery && (isValueMatch || isValueActiveState);

    const handleCopy = (e: React.MouseEvent) => {
      e.stopPropagation();
      let valToCopy = "";
      if (typeof value === "object") valToCopy = JSON.stringify(value, null, 2);
      else valToCopy = String(value);
      navigator.clipboard.writeText(valToCopy);
    };

    const renderKey = () => {
      if (key === "root" && level === 0) return null; // Don't show root key usually, or maybe "root"?
      // Actually, usually root is hidden or shown as special. Let's show it if it's in the list.

      const keyStr = String(key);
      const matchId = pathToMatchElementId(path, "key");

      return (
        <span
          className={`mr-2 text-[#660099] font-bold shrink-0 whitespace-nowrap`}
          id={matchId}
        >
          "
          <span
            className={
              isKeyActiveState
                ? "bg-duck-blue text-white px-0.5 rounded-sm"
                : ""
            }
          >
            {shouldHighlightKey
              ? highlightText(
                  keyStr,
                  searchQuery,
                  isKeyActiveState,
                  searchRegex
                )
              : keyStr}
          </span>
          "<span className="text-duck-text">:</span>
        </span>
      );
    };

    // Placeholder rows (e.g. hidden gap / truncated)
    if (type === "placeholder") {
      const message =
        placeholder?.kind === "hidden"
          ? `... ${placeholder.hiddenCount ?? 0} items hidden ...`
          : placeholder?.message || "...";

      return (
        <div
          style={style}
          className="flex items-center font-mono text-[13px] leading-6 px-1 text-duck-text/40 italic"
        >
          <div style={{ paddingLeft: indent }}>{message}</div>
        </div>
      );
    }

    // Render Primitive Value
    if (type === "primitive") {
      let valueClass = "text-[#007020] font-medium";
      if (typeof value === "number") valueClass = "text-[#B04000] font-bold";
      if (typeof value === "boolean") valueClass = "text-[#0055AA] font-bold";
      if (value === null) valueClass = "text-gray-500 italic font-medium";

      // Word wrap handling
      // In virtual list, dynamic height is hard. We force single line by default (truncate).
      // If wordWrap is true, we might let it wrap but it might overlap next row if we don't calculate height.
      // For this "Safe" version, we will force truncate with ellipsis and show full on hover/title.
      // OR: We can use a fixed height but allow horizontal scroll?
      // Let's stick to truncation for stability first.
      valueClass += wordWrap
        ? " whitespace-pre-wrap break-all overflow-hidden block"
        : " whitespace-nowrap overflow-hidden text-ellipsis block";

      const rawString = String(value);
      const matchId = pathToMatchElementId(path, "value");

      // Truncate for display performance
      const MAX_DISPLAY_CHARS = 500;
      let displayString = rawString;
      if (rawString.length > MAX_DISPLAY_CHARS) {
        displayString = rawString.slice(0, MAX_DISPLAY_CHARS) + "...";
      }

      return (
        <div
          style={style}
          className={`flex items-center font-mono text-[13px] leading-6 px-1 transition-colors border-l border-transparent hover:bg-duck-yellow/10 group ${
            isValueActiveState ? "bg-duck-blue/10 border-duck-blue" : ""
          }`}
        >
          <div
            style={{
              paddingLeft: indent,
              display: "flex",
              alignItems: "center",
              width: "100%",
            }}
          >
            {renderKey()}
            <span
              className={valueClass}
              id={matchId}
              title={rawString} // Show full on hover
              style={{ maxWidth: "100%" }}
            >
              {typeof value === "string" ? '"' : ""}
              {shouldHighlightValue
                ? highlightText(
                    displayString,
                    searchQuery,
                    isValueActiveState,
                    searchRegex
                  )
                : displayString}
              {typeof value === "string" ? '"' : ""}
            </span>
            <button
              onClick={handleCopy}
              className="ml-2 text-duck-text/40 hover:text-duck-blue shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              title={t("node.copyValue")}
            >
              <Copy size={10} />
            </button>
          </div>
        </div>
      );
    }

    // Render Object/Array
    const openBracket = type === "array" ? "[" : "{";
    const closeBracket = type === "array" ? "]" : "}";
    const sizeInfo = !isExpanded ? (
      <span className="text-duck-text/50 mx-2 text-[10px] bg-duck-bg border border-duck-border/30 px-1.5 rounded-sm font-medium">
        {childCount}
      </span>
    ) : null;

    return (
      <div
        style={style}
        className="flex items-center font-mono text-[13px] leading-6 px-1 cursor-pointer hover:bg-duck-yellow/10 transition-colors select-none group"
        onClick={() => {
          if (!hasChildren) return;
          onToggle(path);
        }}
      >
        <div
          style={{ paddingLeft: indent, display: "flex", alignItems: "center" }}
        >
          <span className="w-4 h-4 mr-1 text-duck-text/50 group-hover:text-black transition-opacity flex items-center justify-center shrink-0">
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown size={12} strokeWidth={3} />
              ) : (
                <ChevronRight size={12} strokeWidth={3} />
              )
            ) : (
              <span className="w-3" />
            )}
          </span>

          {renderKey()}

          <span className="text-duck-text font-bold">{openBracket}</span>
          {sizeInfo}
          {!isExpanded && (
            <span className="text-duck-text font-bold">{closeBracket}</span>
          )}
          <button
            onClick={handleCopy}
            className="ml-2 text-duck-text/40 hover:text-duck-blue shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            title={t("node.copyValue")}
          >
            <Copy size={10} />
          </button>
        </div>
      </div>
    );
  }
);
