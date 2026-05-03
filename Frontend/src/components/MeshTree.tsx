/**
 * @file MeshTree — render the platoon mesh hierarchy from `state.mesh`.
 *
 * Builds a tree from `mesh.root` + `mesh.edges`. Leaf nodes light up when
 * their `id` matches the `metadata.sender_id` of a recent (last N) event.
 * Non-leaf nodes (PL, squads) light when any descendant is active.
 */

import { useMemo } from "react";
import "../styles/meshtree.css";
import type { Mesh, MeshNode, RavenGapEvent } from "../types/ravenGap";

type Props = {
  mesh?: Mesh;
  events?: RavenGapEvent[];
  /** How many trailing events count as "recent" for activation. */
  activeWindow?: number;
};

type TreeNode = MeshNode & {
  children: TreeNode[];
  active: boolean;
};

export default function MeshTree({ mesh, events = [], activeWindow = 8 }: Props) {
  const activeIds = useMemo(() => {
    const tail = Array.isArray(events) ? events.slice(-activeWindow) : [];
    const set = new Set<string>();
    for (const evt of tail) {
      const sender = evt?.metadata?.sender_id;
      if (typeof sender === "string" && sender.length > 0) {
        set.add(sender);
      }
    }
    return set;
  }, [events, activeWindow]);

  const tree = useMemo(() => {
    if (!mesh?.root) return null;
    return buildTree(mesh, activeIds);
  }, [mesh, activeIds]);

  if (!tree) {
    return (
      <div className="panel mesh-panel empty">
        <div className="panel-header">
          <h2>MESH HIERARCHY</h2>
        </div>
        <div className="mesh-empty">No mesh data.</div>
      </div>
    );
  }

  const activeCount = activeIds.size;

  return (
    <div className="panel mesh-panel">
      <div className="panel-header">
        <h2>MESH HIERARCHY</h2>
        <span className="mesh-active-count">{activeCount} ACTIVE</span>
      </div>

      <div className="mesh-tree">
        <MeshTreeNode node={tree} depth={0} />
      </div>
    </div>
  );
}

function MeshTreeNode({ node, depth }: { node: TreeNode; depth: number }) {
  const hasChildren = node.children.length > 0;
  return (
    <div className={`mesh-node depth-${depth} ${node.active ? "active" : ""}`}>
      <div className="mesh-node-row">
        <span className="mesh-node-bullet" aria-hidden="true">
          {hasChildren ? "▾" : "•"}
        </span>
        <span className="mesh-node-label">{node.label}</span>
        {node.active && <span className="mesh-node-pulse" aria-hidden="true" />}
      </div>
      {hasChildren && (
        <div className="mesh-node-children">
          {node.children.map((child) => (
            <MeshTreeNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function buildTree(mesh: Mesh, activeIds: Set<string>): TreeNode {
  const labelById = new Map<string, string>();
  if (mesh.nodes) {
    for (const [id, node] of Object.entries(mesh.nodes)) {
      labelById.set(id, node.label);
    }
  }
  if (mesh.root) labelById.set(mesh.root.id, mesh.root.label);

  const childrenByParent = new Map<string, string[]>();
  for (const edge of mesh.edges || []) {
    const list = childrenByParent.get(edge.parent) || [];
    list.push(edge.child);
    childrenByParent.set(edge.parent, list);
  }

  const visit = (id: string, seen: Set<string>): TreeNode => {
    seen.add(id);
    const childIds = (childrenByParent.get(id) || []).filter((c) => !seen.has(c));
    const children = childIds.map((c) => visit(c, seen));
    const selfActive = activeIds.has(id);
    const childActive = children.some((c) => c.active);
    return {
      id,
      label: labelById.get(id) || id,
      children,
      active: selfActive || childActive,
    };
  };

  return visit(mesh.root.id, new Set());
}
