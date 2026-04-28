export type NodeType = 
  | 'group'         // header/label, can be nested (e.g. "Outdoor Area", "Stage System")
  | 'bundle'        // packet with subtotal (e.g. "Multimedia Package")
  | 'line'          // priced item (e.g. "Futura Chair")
  | 'note'          // technical description or spec (e.g. "incl. cables", "dim. 300x500")
  | 'complimentary' // value 0 but displayed (e.g. "Ambulance for PSI")
  | 'by_client'     // client cost, excluded from EO total (e.g. "Venue by Client")

export interface QuotationNode {
  id: string;
  type: NodeType;
  title: string;
  description?: string;
  
  // Dimensions (The "Tagging" concept)
  zone?: string;       // e.g. "Holding Room", "Main Stage"
  tags?: string[];     // e.g. ["furniture", "rental", "foyer"]
  owner?: 'EO' | 'Client' | 'Rider';
  coaCode?: string;    // Chart of Accounts code (e.g. "5.1.5")

  // Calculation fields
  qty?: number;
  qtyUnit?: string;
  freq?: number;
  freqUnit?: string;
  unitPrice?: number;
  amount?: number;     // qty * freq * unitPrice (for line items)
  
  // Hierarchy
  parentId?: string;
  children?: QuotationNode[];
  
  // UI State
  isExpanded?: boolean;
  isLocked?: boolean;
  metadata?: Record<string, any>;
}

export type ViewMode = 
  | 'category'  // Grouping by CoA / Technical Category
  | 'zone'      // Grouping by Area / Zone
  | 'owner'     // Grouping by EO vs Rider vs Client
  | 'coa'       // Grouping by Financial Chart of Accounts

export interface QuotationView {
  mode: ViewMode;
  rootNodes: QuotationNode[];
  summary: {
    totalEO: number;
    totalClient: number;
    totalRider: number;
    grandTotal: number;
  };
}
