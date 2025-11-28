/**
 * OrderLine TypeScript Interface
 * Represents a style+color+CAD combination with all commercial and approval data
 * 
 * Each line represents one of these combinations:
 * - (Style, Color, CAD)
 * - (Style, Color, no CAD)
 * - (Style, no Color, CAD)
 * - (Style, no Color, no CAD) - style-only line
 */

export interface OrderLine {
  id: string;
  styleId: string;
  styleNumber?: string;
  orderId?: string;
  
  // Optional dimensions
  colorCode?: string;
  colorName?: string;
  cadCode?: string;
  cadName?: string;
  
  // Quantity (required for every line)
  quantity: number;
  unit: string;
  
  // Pricing
  millName?: string;
  millPrice?: number;
  provaPrice?: number;
  commission?: number;
  currency: string;
  
  // Dates
  etd?: string;
  eta?: string;
  submissionDate?: string;
  approvalDate?: string;
  
  // Approval status per approval type
  approvalStatus?: {
    labDip?: string;
    strikeOff?: string;
    handloom?: string;
    aop?: string;
    qualityTest?: string;
    quality?: string;
    bulkSwatch?: string;
    price?: string;
    ppSample?: string;
  };
  
  // Notes
  notes?: string;
  
  // Computed fields
  totalValue?: number;
  totalCost?: number;
  totalCommission?: number;
  profit?: number;
  lineLabel?: string;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface OrderLineFormData {
  id?: string;
  colorCode?: string;
  colorName?: string;
  cadCode?: string;
  cadName?: string;
  quantity: string;
  unit: string;
  millName?: string;
  millPrice?: string;
  provaPrice?: string;
  commission?: string;
  currency: string;
  etd?: string;
  eta?: string;
  submissionDate?: string;
  approvalDate?: string;
  approvalStatus?: Record<string, string>;
  notes?: string;
}

export interface StyleFormData {
  id?: string;
  description?: string;
  fabricType?: string;
  fabricComposition?: string;
  gsm?: string;
  finishType?: string;
  construction?: string;
  cuttableWidth?: string;
  finishingWidth?: string;
  etd?: string;
  eta?: string;
  submissionDate?: string;
  notes?: string;
  lines: OrderLineFormData[];  // Changed from colors to lines
}
