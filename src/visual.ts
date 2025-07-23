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

import { SankeyLink, SankeyNode } from "./interface/types";

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

    // // Step 1: Build raw nodes and links
    // const rawNodes: SankeyNode[] = [];
    // const rawLinks: SankeyLink[] = [];

    // categories.forEach((category, index) => {
    //   const categoryValues = category.values.map(String);

    //   categoryValues.forEach((value, i) => {
    //     rawNodes.push({ name: value });

    //     if (index < categories.length - 1) {
    //       const nextCategoryValues = categories[index + 1].values.map(String);
    //       const targetValue = nextCategoryValues[i];

    //       rawNodes.push({ name: targetValue });

    //       rawLinks.push({
    //         source: { name: value },
    //         target: { name: targetValue },
    //         value: (values[0].values[i] as number) || 1,
    //       });
    //     }
    //   });
    // });

    // // Step 2: Sanitize data
    // const { nodes, links } = sanitizeSankeyData(rawNodes, rawLinks);
    const nodeMap: { [key: string]: number } = {};
    const displayNameMap: { [key: string]: string } = {};

    const nodes: SankeyNode[] = [];
    const links: SankeyLink[] = [];

    // Step 3 node/link generation

    categories.forEach((category, index) => {
      const categoryValues = category.values.map(String);

      categoryValues.forEach((value, i) => {
        const sourceKey = `${value}__${index}`;

        if (!(sourceKey in nodeMap)) {
          nodeMap[sourceKey] = nodes.length;
          displayNameMap[sourceKey] = value;
          nodes.push({ name: sourceKey, displayName: value });
        }

        if (index < categories.length - 1) {
          const nextCategoryValues = categories[index + 1].values.map(String);
          const targetValue = nextCategoryValues[i];
          const targetKey = `${targetValue}__${index + 1}`;

          if (!(targetKey in nodeMap)) {
            nodeMap[targetKey] = nodes.length;
            displayNameMap[targetKey] = targetValue;
            nodes.push({ name: targetKey, displayName: targetValue });
          }

          links.push({
            source: nodeMap[sourceKey],
            target: nodeMap[targetKey],
            value: (values[0].values[i] as number) || 1,
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
      .attr("x", (d: any) => (isNaN(d.x0) ? 0 : d.x0))
      .attr("y", (d: any) => (isNaN(d.y0) ? 0 : d.y0))
      .attr("height", (d: any) => (isNaN(d.y1 - d.y0) ? 0 : d.y1 - d.y0))
      .attr("width", (d: any) => (isNaN(d.x1 - d.x0) ? 0 : d.x1 - d.x0))

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
          `${(d.source as SankeyNode).displayName} → ${
            (d.target as SankeyNode).displayName
          }\n${d.value}`
      );

    this.svg
      .append("g")
      .selectAll("text")
      .data(sankeyData.nodes)
      .enter()
      .append("text")
      .attr("x", (d: any) => (isNaN(d.x1) ? 0 : d.x1) + 6)
      .attr("y", (d: any) => (isNaN(d.y0) ? 0 : (d.y0 + d.y1) / 2))
      .attr("dy", "0.35em")
      .text((d: SankeyNode) => d.displayName || d.name)
      .style("font-size", "10px")
      .style("fill", "#333");
  }
  public getFormattingModel(): powerbi.visuals.FormattingModel {
    return this.formattingSettingsService.buildFormattingModel(
      this.formattingSettings
    );
  }
}
