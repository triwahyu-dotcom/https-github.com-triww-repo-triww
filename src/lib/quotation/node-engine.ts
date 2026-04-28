import { QuotationNode, ViewMode, QuotationView, NodeType } from "./node-types";

/**
 * Calculates the amount for a node and recursively for its children.
 * Returns the total amount for the node.
 */
export function calculateNodeAmount(node: QuotationNode): number {
  if (node.type === 'line' || node.type === 'by_client') {
    const qty = node.qty || 0;
    const freq = node.freq || 1;
    const price = node.unitPrice || 0;
    node.amount = qty * freq * price;
    return node.amount;
  }

  if (node.type === 'complimentary') {
    node.amount = 0;
    return 0;
  }

  if (node.children && node.children.length > 0) {
    const total = node.children.reduce((sum, child) => sum + calculateNodeAmount(child), 0);
    node.amount = total;
    return total;
  }

  return node.amount || 0;
}

/**
 * Transforms a flat list of nodes into a grouped view based on the selected mode.
 */
export function createQuotationView(flatNodes: QuotationNode[], mode: ViewMode): QuotationView {
  // 1. First, ensure all amounts are calculated
  flatNodes.forEach(node => calculateNodeAmount(node));

  // 2. Determine grouping key based on mode
  const getGroupKey = (node: QuotationNode): string => {
    switch (mode) {
      case 'zone': return node.zone || "Uncategorized Zone";
      case 'owner': return node.owner || "EO";
      case 'coa': return node.coaCode || "No CoA";
      case 'category':
      default:
        // Default category grouping could be based on a tag or metadata
        return node.tags?.[0] || "General";
    }
  };

  // 3. Group nodes
  const groups = new Map<string, QuotationNode[]>();
  flatNodes.forEach(node => {
    // Only group top-level or relevant nodes for the view
    // In a real implementation, we might want to flatten and re-group differently
    const key = getGroupKey(node);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(node);
  });

  // 4. Create root nodes for the groups
  const rootNodes: QuotationNode[] = Array.from(groups.entries()).map(([key, children]) => ({
    id: `group-${key}`,
    type: 'group',
    title: key,
    children,
    amount: children.reduce((sum, child) => sum + (child.amount || 0), 0)
  }));

  // 5. Calculate global summary
  const summary = flatNodes.reduce((acc, node) => {
    const amount = node.amount || 0;
    if (node.type === 'by_client' || node.owner === 'Client') {
      acc.totalClient += amount;
    } else if (node.owner === 'Rider') {
      acc.totalRider += amount;
    } else {
      acc.totalEO += amount;
    }
    return acc;
  }, { totalEO: 0, totalClient: 0, totalRider: 0, grandTotal: 0 });

  summary.grandTotal = summary.totalEO; // Usually only EO total is the final price

  return { mode, rootNodes, summary };
}

/**
 * Helper to create a node from ratecard data
 */
export function createNodeFromRatecard(item: any, overrides: Partial<QuotationNode> = {}): QuotationNode {
  return {
    id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: item.unit_price === 0 || item.unit_price === null ? 'complimentary' : 'line',
    title: item.item_name,
    unitPrice: item.unit_price || 0,
    qty: item.qty_default || 1,
    qtyUnit: item.qty_unit,
    freq: item.freq_default || 1,
    freqUnit: item.freq_unit,
    coaCode: item.category_code,
    tags: [item.category, item.section_name],
    ...overrides
  };
}
