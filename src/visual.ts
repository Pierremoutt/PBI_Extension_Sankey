"use strict";

import * as d3 from "d3";
import { sankey, sankeyLinkHorizontal } from "d3-sankey";
import powerbiVisualsApi from "powerbi-visuals-api";
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import { FormatSettingsModel } from "./settings";
import IVisual = powerbiVisualsApi.extensibility.visual.IVisual;
import VisualUpdateOptions = powerbiVisualsApi.extensibility.visual.VisualUpdateOptions;
import VisualConstructorOptions = powerbiVisualsApi.extensibility.visual.VisualConstructorOptions;
import DataView = powerbiVisualsApi.DataView;
import DataViewCategorical = powerbiVisualsApi.DataViewCategorical;
import DataViewValueColumn = powerbiVisualsApi.DataViewValueColumn;

interface SankeyNode {
  name: string;
  x0?: number;
  x1?: number;
  y0?: number;
  y1?: number;
  index?: number;
  value?: number;
}

interface SankeyLink {
  source: SankeyNode | number;
  target: SankeyNode | number;
  value: number;
  width?: number;
}

export class Visual implements IVisual {
  private target: HTMLElement;
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  private formattingSettings: FormatSettingsModel;
  private formattingSettingsService: FormattingSettingsService;

  constructor(options: VisualConstructorOptions) {
    this.target = options.element;
    this.svg = d3
      .select(this.target)
      .append("svg")
      .classed("sankeyDiagram", true);
    this.formattingSettingsService = new FormattingSettingsService();
  }

  public update(options: VisualUpdateOptions): void {
    this.formattingSettings =
      this.formattingSettingsService.populateFormattingSettingsModel(
        FormatSettingsModel,
        options.dataViews?.[0]
      );
    const width = options.viewport.width;
    const height = options.viewport.height;

    this.svg.attr("width", width).attr("height", height);
    this.svg.selectAll("*").remove(); // Clear previous renderings

    const dataView: DataView = options.dataViews[0];
    if (!dataView || !dataView.categorical) {
      return;
    }

    const categorical: DataViewCategorical = dataView.categorical;
    const categories = categorical.categories || [];
    const values = categorical.values || [];

    if (categories.length < 2 || values.length === 0) {
      return;
    }

    // Extract data for Sankey
    const nodes: SankeyNode[] = [];
    const links: SankeyLink[] = [];
    const nodeMap: { [key: string]: number } = {};

    // Generate nodes and links
    categories.forEach((category, index) => {
      const categoryValues = category.values.map(String);

      categoryValues.forEach((value, i) => {
        if (!(value in nodeMap)) {
          nodeMap[value] = nodes.length;
          nodes.push({ name: value });
        }

        if (index < categories.length - 1) {
          const nextCategoryValues = categories[index + 1].values.map(String);
          const targetValue = nextCategoryValues[i];

          if (!(targetValue in nodeMap)) {
            nodeMap[targetValue] = nodes.length;
            nodes.push({ name: targetValue });
          }

          links.push({
            source: nodeMap[value],
            target: nodeMap[targetValue],
            value: (values[0].values[i] as number) || 1, // Default value to 1 if missing
          });
        }
      });
    });

    // Create Sankey Layout
    const sankeyLayout = sankey<SankeyNode, SankeyLink>()
      .nodeWidth(10)
      .nodePadding(10)
      .extent([
        [1, 1],
        [width - 1, height - 1],
      ]);

    const sankeyData = sankeyLayout({
      nodes: nodes.map((d) => Object.assign({}, d)),
      links: links.map((d) => Object.assign({}, d)),
    });

    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);
    // Draw nodes
    this.svg
      .append("g")
      .selectAll("rect")
      .data(sankeyData.nodes)
      .enter()
      .append("rect")
      .attr("x", (d: any) => d.x0)
      .attr("y", (d: any) => d.y0)
      .attr("height", (d: any) => d.y1 - d.y0)
      .attr("width", (d: any) => d.x1 - d.x0)
      .style("fill", (d: any) => (d.color = colorScale(d.name))) // Assign color using colorScale
      .style("stroke", "black");

    // Draw links
    this.svg
      .append("g")
      .selectAll("path")
      .data(sankeyData.links as SankeyLink[]) // Explicitly cast links
      .enter()
      .append("path")
      .attr("d", sankeyLinkHorizontal<SankeyNode, SankeyLink>())
      .attr("stroke-width", (d: SankeyLink) => Math.max(1, d.width!))
      .attr("stroke", (d: any) => d.source.color)
      .attr("fill", "none")
      .append("title")
      .text(
        (d: SankeyLink) =>
          `${(d.source as SankeyNode).name} → ${
            (d.target as SankeyNode).name
          }\\n${d.value}`
      );
  }
  public getFormattingModel(): powerbi.visuals.FormattingModel {
    return this.formattingSettingsService.buildFormattingModel(
      this.formattingSettings
    );
  }
}
