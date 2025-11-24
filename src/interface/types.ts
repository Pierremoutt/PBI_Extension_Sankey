import powerbi from "powerbi-visuals-api";

export interface SankeyNode {
  name: string;
  displayName?: string; // clean label for U
  x0?: number;
  x1?: number;
  y0?: number;
  y1?: number;
  index?: number;
  value?: number;
  color?: string;
  category?: string;
  selectionId?: powerbi.visuals.ISelectionId;
  savedColor?: string;
}

export interface SankeyLink {
  source: SankeyNode | number;
  target: SankeyNode | number;
  value: number;
  width?: number;
}
