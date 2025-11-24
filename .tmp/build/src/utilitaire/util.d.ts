import { SankeyLink, SankeyNode } from "../interface/types";
export declare function sanitizeSankeyData(rawNodes: SankeyNode[], rawLinks: SankeyLink[]): {
    nodes: SankeyNode[];
    links: SankeyLink[];
} | undefined;
export declare function getValue<T>(objects: powerbi.DataViewObjects, objectName: string, propertyName: string, defaultValue: T): T;
