import { SankeyLink, SankeyNode } from "../interface/types";

export function sanitizeSankeyData(
  rawNodes: SankeyNode[],
  rawLinks: SankeyLink[]
): { nodes: SankeyNode[]; links: SankeyLink[] } {
  const nodeMap = new Map<string, number>();
  const nodes: SankeyNode[] = [];
  const links: SankeyLink[] = [];

  // Build node map and deduplicate
  rawNodes.forEach((node) => {
    if (node.name && !nodeMap.has(node.name)) {
      nodeMap.set(node.name, nodes.length);
      nodes.push({ name: node.name });
    }
  });

  // Validate and map links
  rawLinks.forEach((link) => {
    const sourceName =
      typeof link.source === "object" ? link.source.name : null;
    const targetName =
      typeof link.target === "object" ? link.target.name : null;

    if (
      sourceName &&
      targetName &&
      nodeMap.has(sourceName) &&
      nodeMap.has(targetName) &&
      !isNaN(link.value)
    ) {
      links.push({
        source: nodeMap.get(sourceName)!,
        target: nodeMap.get(targetName)!,
        value: link.value,
      });
    }
  });

  // Track node usage
  const usedAsSource = new Set<number>();
  const usedAsTarget = new Set<number>();
  links.forEach((link) => {
    usedAsSource.add(link.source as number);
    usedAsTarget.add(link.target as number);
  });

  nodes.forEach((node, index) => {
    const isOrphan = !usedAsSource.has(index) && !usedAsTarget.has(index);
    if (isOrphan) {
      if (blankNodeIndex === null) {
        blankNodeIndex = nodes.length;
        nodes.push({ name: "Blank" });
      }

      // Link orphan node to "Blank"
      links.push({
        source: index,
        target: blankNodeIndex,
        value: 0.1,
      });
    }
  });

  // Add "Blank" node if needed
  let blankNodeIndex: number | null = null;

  console.log("Sanitized nodes:", nodes);
  console.log("Sanitized links:", links);

  if (nodes.length === 0 || links.length === 0) {
    console.warn("No valid nodes or links to render.");
    return;
  }

  return { nodes, links };
}
