export interface SankeyNode {
    name: string;
    displayName?: string;
    x0?: number;
    x1?: number;
    y0?: number;
    y1?: number;
    index?: number;
    value?: number;
}
export interface SankeyLink {
    source: SankeyNode | number;
    target: SankeyNode | number;
    value: number;
    width?: number;
}
