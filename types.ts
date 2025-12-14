export interface Match {
  path: string;
  type: "key" | "value";
}

export interface JsonNodeProps {
  data: any;
  name?: string | number;
  isLast?: boolean;
  depth?: number;
  searchQuery: string;
  searchRegex?: RegExp | null;
  forceExpand?: boolean;
  path?: string;
  activeMatch?: Match | null;
  expandedPaths?: Set<string>; // New prop for O(1) lookup
  matchedKeyPaths?: Set<string>;
  matchedValuePaths?: Set<string>;
  wordWrap?: boolean;
  globalExpandMode?: "expand" | "collapse" | null;
  globalExpandVersion?: number;
}

export enum ViewMode {
  TREE = "TREE",
  RAW = "RAW",
}
