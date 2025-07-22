import { SankeyLink, SankeyNode } from "../interface/types";
export declare function sanitizeSankeyData(rawNodes: SankeyNode[], rawLinks: SankeyLink[]): {
    nodes: SankeyNode[];
    links: SankeyLink[];
};
