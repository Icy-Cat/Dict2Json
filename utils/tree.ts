import { joinPath, getNextChildKey } from "./path";

export interface FlatNode {
  id: string; // path
  key: string;
  value: any;
  level: number;
  type: "object" | "array" | "primitive" | "placeholder" | "closing";
  parentType?: "array" | "object" | null;
  isExpanded: boolean;
  hasChildren: boolean;
  parentPath: string;
  indexInParent: number;
  childCount: number; // Children count for this node (object keys length / array length)
  placeholder?: {
    kind: "hidden" | "truncated";
    hiddenCount?: number;
    message?: string;
  };
}

export interface FlattenOptions {
  maxFlatNodes?: number;
  headChildren?: number;
  contextChildren?: number;
  activePath?: string | null;
}

/**
 * Flattens the JSON object into a list of visible nodes based on expanded paths.
 * Optimized for performance using a stack-based approach to avoid recursion limits.
 */
export function flattenTree(
  data: any,
  expandedPaths: Set<string>,
  rootPath: string = "root",
  options: FlattenOptions = {}
): FlatNode[] {
  if (data === undefined) return [];

  const result: FlatNode[] = [];

  const maxFlatNodes = options.maxFlatNodes ?? 50000;
  const headChildren = options.headChildren ?? 200;
  const contextChildren = options.contextChildren ?? 5;
  const activePath = options.activePath ?? null;

  // Stack stores iterators/state to simulate recursion
  // We process the tree depth-first
  type StackItem =
    | {
        kind: "node";
        data: any;
        path: string;
        level: number;
        key: string;
        indexInParent: number;
        parentPath: string;
        parentType: "array" | "object";
      }
    | {
        kind: "placeholder";
        path: string;
        level: number;
        parentPath: string;
        indexInParent: number;
        placeholder: FlatNode["placeholder"];
        parentType: "array" | "object";
      }
    | {
        kind: "closing";
        path: string;
        level: number;
        parentPath: string;
        indexInParent: number;
        bracket: "}" | "]";
      };

  // Initial root node
  const rootIsObject = data !== null && typeof data === "object";
  const rootType = rootIsObject
    ? Array.isArray(data)
      ? "array"
      : "object"
    : "primitive";

  const rootChildCount = rootIsObject
    ? Array.isArray(data)
      ? data.length
      : Object.keys(data).length
    : 0;

  // We always add the root node first
  const rootNode: FlatNode = {
    id: rootPath,
    key: "root", // Or whatever display name
    value: data,
    level: 0,
    type: rootType,
    parentType: null,
    isExpanded: expandedPaths.has(rootPath),
    hasChildren: rootChildCount > 0,
    parentPath: "",
    indexInParent: 0,
    childCount: rootChildCount,
  };

  result.push(rootNode);

  // If root is not expanded or not an object, we are done
  if (!rootNode.isExpanded || !rootNode.hasChildren) {
    return result;
  }

  // Initialize stack with children of root
  // We need to push children in reverse order so they pop in correct order
  const pushChildrenToStack = (
    parentData: any,
    parentPath: string,
    parentLevel: number,
    stack: StackItem[]
  ) => {
    const parentType: "array" | "object" = Array.isArray(parentData)
      ? "array"
      : "object";
    const nextKeyOnActivePath = activePath
      ? getNextChildKey(parentPath, activePath)
      : null;

    if (Array.isArray(parentData)) {
      const len = parentData.length;
      if (len === 0) return;

      const activeIdx =
        nextKeyOnActivePath != null ? Number(nextKeyOnActivePath) : -1;
      const hasActive = Number.isFinite(activeIdx) && activeIdx >= 0;

      // Windowing strategy:
      // - Always include head [0..headChildren)
      // - If active index is far, include a small context window around it
      // - Insert placeholder rows for gaps

      const headEnd = Math.min(headChildren, len);
      const windowStart =
        hasActive && activeIdx >= headEnd
          ? Math.max(headEnd, activeIdx - contextChildren)
          : headEnd;
      const windowEnd =
        hasActive && activeIdx >= headEnd
          ? Math.min(len, activeIdx + contextChildren + 1)
          : headEnd;

      const hiddenBetween = windowStart - headEnd;
      const hiddenTail = len - windowEnd;

      // Push tail placeholder first so it appears last.
      if (hiddenTail > 0) {
        stack.push({
          kind: "placeholder",
          path: `${parentPath}#__tail__`,
          level: parentLevel + 1,
          parentPath,
          indexInParent: windowEnd,
          placeholder: { kind: "hidden", hiddenCount: hiddenTail },
          parentType,
        });
      }

      // Push context window children in reverse
      for (let i = windowEnd - 1; i >= windowStart; i--) {
        stack.push({
          kind: "node",
          data: parentData[i],
          path: joinPath(parentPath, i),
          level: parentLevel + 1,
          key: String(i),
          indexInParent: i,
          parentPath,
          parentType,
        });
      }

      if (hiddenBetween > 0) {
        stack.push({
          kind: "placeholder",
          path: `${parentPath}#__gap__`,
          level: parentLevel + 1,
          parentPath,
          indexInParent: headEnd,
          placeholder: { kind: "hidden", hiddenCount: hiddenBetween },
          parentType,
        });
      }

      for (let i = headEnd - 1; i >= 0; i--) {
        stack.push({
          kind: "node",
          data: parentData[i],
          path: joinPath(parentPath, i),
          level: parentLevel + 1,
          key: String(i),
          indexInParent: i,
          parentPath,
          parentType,
        });
      }
      return;
    }

    // Object
    const keys = Object.keys(parentData);
    const len = keys.length;
    if (len === 0) return;

    const activeKey = nextKeyOnActivePath;
    const activeIndex = activeKey != null ? keys.indexOf(activeKey) : -1;
    const hasActive = activeIndex >= 0;

    const headEnd = Math.min(headChildren, len);
    const windowStart =
      hasActive && activeIndex >= headEnd
        ? Math.max(headEnd, activeIndex - contextChildren)
        : headEnd;
    const windowEnd =
      hasActive && activeIndex >= headEnd
        ? Math.min(len, activeIndex + contextChildren + 1)
        : headEnd;

    const hiddenBetween = windowStart - headEnd;
    const hiddenTail = len - windowEnd;

    if (hiddenTail > 0) {
      stack.push({
        kind: "placeholder",
        path: `${parentPath}#__tail__`,
        level: parentLevel + 1,
        parentPath,
        indexInParent: windowEnd,
        placeholder: { kind: "hidden", hiddenCount: hiddenTail },
        parentType,
      });
    }

    for (let i = windowEnd - 1; i >= windowStart; i--) {
      const k = keys[i];
      stack.push({
        kind: "node",
        data: parentData[k],
        path: joinPath(parentPath, k),
        level: parentLevel + 1,
        key: k,
        indexInParent: i,
        parentPath,
        parentType,
      });
    }

    if (hiddenBetween > 0) {
      stack.push({
        kind: "placeholder",
        path: `${parentPath}#__gap__`,
        level: parentLevel + 1,
        parentPath,
        indexInParent: headEnd,
        placeholder: { kind: "hidden", hiddenCount: hiddenBetween },
        parentType,
      });
    }

    for (let i = headEnd - 1; i >= 0; i--) {
      const k = keys[i];
      stack.push({
        kind: "node",
        data: parentData[k],
        path: joinPath(parentPath, k),
        level: parentLevel + 1,
        key: k,
        indexInParent: i,
        parentPath,
        parentType,
      });
    }
  };

  const stack: StackItem[] = [];
  // Root also needs a closing bracket line to make indentation/structure complete.
  if (rootType === "object" || rootType === "array") {
    stack.push({
      kind: "closing",
      path: `${rootPath}#__close__`,
      level: 0,
      parentPath: "",
      indexInParent: 0,
      bracket: rootType === "array" ? "]" : "}",
    });
  }
  pushChildrenToStack(data, rootPath, 0, stack);

  while (stack.length > 0) {
    if (result.length >= maxFlatNodes) {
      result.push({
        id: `${rootPath}#__truncated__`,
        key: "",
        value: null,
        level: 0,
        type: "placeholder",
        isExpanded: false,
        hasChildren: false,
        parentPath: "",
        indexInParent: 0,
        childCount: 0,
        placeholder: { kind: "truncated", message: "Output truncated" },
      });
      break;
    }

    const item = stack.pop()!;

    if (item.kind === "placeholder") {
      result.push({
        id: item.path,
        key: "",
        value: null,
        level: item.level,
        type: "placeholder",
        parentType: item.parentType,
        isExpanded: false,
        hasChildren: false,
        parentPath: item.parentPath,
        indexInParent: item.indexInParent,
        childCount: 0,
        placeholder: item.placeholder,
      });
      continue;
    }

    if (item.kind === "closing") {
      result.push({
        id: item.path,
        key: "",
        value: item.bracket,
        level: item.level,
        type: "closing",
        parentType: null,
        isExpanded: false,
        hasChildren: false,
        parentPath: item.parentPath,
        indexInParent: item.indexInParent,
        childCount: 0,
      });
      continue;
    }

    const isObject = item.data !== null && typeof item.data === "object";
    const type = isObject
      ? Array.isArray(item.data)
        ? "array"
        : "object"
      : "primitive";

    const childCount = isObject
      ? Array.isArray(item.data)
        ? item.data.length
        : Object.keys(item.data).length
      : 0;

    const hasChildren = childCount > 0;
    const isExpanded = expandedPaths.has(item.path);

    const node: FlatNode = {
      id: item.path,
      key: item.key,
      value: item.data,
      level: item.level,
      type,
      parentType: item.parentType,
      isExpanded,
      hasChildren,
      parentPath: item.parentPath,
      indexInParent: item.indexInParent,
      childCount,
    };

    result.push(node);

    if (isExpanded && hasChildren) {
      // Insert a closing bracket row after children for correct visual indentation.
      if (type === "object" || type === "array") {
        stack.push({
          kind: "closing",
          path: `${item.path}#__close__`,
          level: item.level,
          parentPath: item.parentPath,
          indexInParent: item.indexInParent,
          bracket: type === "array" ? "]" : "}",
        });
      }
      pushChildrenToStack(item.data, item.path, item.level, stack);
    }
  }

  return result;
}
