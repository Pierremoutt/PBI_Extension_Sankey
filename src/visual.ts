"use strict";

import * as d3 from "d3";
import { sankey, sankeyLinkHorizontal } from "d3-sankey";
import powerbiVisualsApi from "powerbi-visuals-api";
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import { FormatSettingsModel } from "./settings";
import IVisual = powerbiVisualsApi.extensibility.visual.IVisual;
import VisualUpdateOptions = powerbiVisualsApi.extensibility.visual.VisualUpdateOptions;
import VisualObjectInstance = powerbiVisualsApi.VisualObjectInstance;
import VisualObjectInstanceEnumeration = powerbiVisualsApi.VisualObjectInstanceEnumeration;
import EnumerateVisualObjectInstancesOptions = powerbiVisualsApi.EnumerateVisualObjectInstancesOptions;
import VisualConstructorOptions = powerbiVisualsApi.extensibility.visual.VisualConstructorOptions;
import DataView = powerbiVisualsApi.DataView;
import DataViewCategorical = powerbiVisualsApi.DataViewCategorical;
import DataViewValueColumn = powerbiVisualsApi.DataViewValueColumn;
import DataViewCategoryColumn = powerbiVisualsApi.DataViewCategoryColumn;

import { SankeyLink, SankeyNode } from "./interface/types";

// A custom wrapper that mimics a SelectionId but uses a Value-Based selector
class ValueBasedSelectionId implements powerbi.visuals.ISelectionId {
  private selector: powerbi.data.Selector;
  private key: string;

  constructor(columnSource: powerbi.DataViewMetadataColumn, value: string) {
    // Construct the selector manually based on Column + Value
    this.selector = {
      data: [
        {
          source: columnSource,
          values: [value],
        },
      ],
    };

    // Create a unique key for internal maps (Column Name + Value)
    this.key = JSON.stringify({ col: columnSource.queryName, val: value });
  }

  public getSelector(): powerbi.data.Selector {
    return this.selector;
  }

  public getKey(): string {
    return this.key;
  }

  // --- The Missing Method ---
  public getSelectorsByColumn(): powerbi.data.Selector {
    // For our purpose, we can just return the main selector
    // or undefined if you don't need slicing interaction.
    return this.selector;
  }

  // --- Boilerplate Methods Required by Interface ---

  public equals(other: powerbi.visuals.ISelectionId): boolean {
    // Simple string comparison of our keys
    return other && this.getKey() === other.getKey();
  }

  public includes(
    other: powerbi.visuals.ISelectionId,
    ignoreHighlight?: boolean,
  ): boolean {
    // For this workaround, we assume exact match only
    return this.equals(other);
  }

  public hasIdentity(): boolean {
    return true;
  }
}

export class Visual implements IVisual {
  private target: HTMLElement;
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  private formattingSettings: FormatSettingsModel;
  private formattingSettingsService: FormattingSettingsService;
  private host: powerbiVisualsApi.extensibility.visual.IVisualHost;

  constructor(options: VisualConstructorOptions) {
    this.host = options.host;
    this.target = options.element;
    this.svg = d3
      .select(this.target)
      .append("svg")
      .classed("sankeyDiagram", true);
    this.formattingSettingsService = new FormattingSettingsService();
  }

  public update(options: VisualUpdateOptions): void {
    console.log("Update triggered");
    try {
      this.formattingSettings =
        this.formattingSettingsService.populateFormattingSettingsModel(
          FormatSettingsModel,
          options.dataViews?.[0],
        );
      const { width, height } = options.viewport;
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

      const { nodes, links, columnNames } = this.processData(
        categories,
        values,
      );
      // Add node-specific color settings
      nodes.forEach((node) => {
        this.formattingSettings.addNodeColor(
          node.name,
          node.displayName,
          node.selectionId,
          node.savedColor,
        );
      });

      const { sankeyData, colorScale } = this.createSankeyLayout(
        nodes,
        links,
        width,
        height,
      );

      this.drawSankeyDiagram(sankeyData, colorScale, columnNames);
      console.log(
        "Formatting Model:",
        this.formattingSettingsService.buildFormattingModel(
          this.formattingSettings,
        ),
      );
    } catch (error) {
      console.error("Error updating visual:", error);
    }
  }

  private processData(
    categories: DataViewCategoryColumn[],
    values: DataViewValueColumn[],
  ): { nodes: SankeyNode[]; links: SankeyLink[]; columnNames: string[] } {
    const nodeMap: { [key: string]: number } = {};
    const displayNameMap: { [key: string]: string } = {};
    const nodes: SankeyNode[] = [];
    const links: SankeyLink[] = [];
    const columnNames = categories.map((c) => c.source.displayName);
    console.log(categories);

    categories.forEach((category, index) => {
      const categoryValues = category.values.map(String);

      categoryValues.forEach((value, i) => {
        const sourceKey = `${value}__${index}`;
        let debugSourceId = null; // 1. Lift variable to outer scope

        // -------------------------------------------------------
        // 1. PROCESS SOURCE NODE
        // -------------------------------------------------------
        if (!(sourceKey in nodeMap)) {
          nodeMap[sourceKey] = nodes.length;

          const sourceSelectionId = new ValueBasedSelectionId(
            category.source,
            value,
          );

          // B. Retrieve Saved Color
          const objects = category.objects?.[i];
          const savedColor = objects?.["nodeColorSettings"]?.["fill"]
            ? (objects["nodeColorSettings"]["fill"] as any).solid.color
            : null;

          nodes.push({
            name: sourceKey,
            displayName: value,
            selectionId: sourceSelectionId,
            savedColor: null,
          } as any);
        }

        // -------------------------------------------------------
        // 2. PROCESS TARGET NODE
        // -------------------------------------------------------
        if (index < categories.length - 1) {
          const nextCategoryValues = categories[index + 1].values.map(String);
          const targetValue = nextCategoryValues[i];
          const targetKey = `${targetValue}__${index + 1}`;

          if (!(targetKey in nodeMap)) {
            nodeMap[targetKey] = nodes.length;
            displayNameMap[targetKey] = targetValue;

            const targetCategory = categories[index + 1];
            const targetSelectionId = new ValueBasedSelectionId(
              targetCategory.source,
              targetValue,
            );

            const targetObjects = targetCategory.objects?.[i];
            const targetSavedColor = targetObjects?.["nodeColorSettings"]?.[
              "fill"
            ]
              ? (targetObjects["nodeColorSettings"]["fill"] as any).solid.color
              : null;

            nodes.push({
              name: targetKey,
              displayName: targetValue,
              selectionId: targetSelectionId,
              savedColor: targetSavedColor,
            });
          }

          // -------------------------------------------------------
          // 3. PROCESS LINKS
          // -------------------------------------------------------
          const sourceIndex = nodeMap[sourceKey];
          const targetIndex = nodeMap[targetKey];
          const linkValue = (values[0].values[i] as number) || 0;
          // Check if this link already exists in our array
          const existingLink = links.find(
            (l) => l.source === sourceIndex && l.target === targetIndex,
          );

          if (existingLink) {
            existingLink.value += linkValue;
          } else {
            links.push({
              source: sourceIndex,
              target: targetIndex,
              value: linkValue,
            });
          }
        }
      });
    });

    return { nodes, links, columnNames };
  }

  private createSankeyLayout(
    nodes: SankeyNode[],
    links: SankeyLink[],
    width: number,
    height: number,
  ): { sankeyData: any; colorScale: d3.ScaleOrdinal<string, unknown> } {
    const nodeWidth = this.formattingSettings.nodeSettings.nodeWidth.value ?? 5;
    const nodePadding =
      this.formattingSettings.nodeSettings.nodePadding.value ?? 10;

    const topMargin = 25;

    const sankeyLayout = sankey<SankeyNode, SankeyLink>()
      .nodeWidth(nodeWidth * 5)
      .nodePadding(nodePadding)
      .extent([
        [1, topMargin],
        [width - 1, height - 1],
      ]);

    const sankeyData = sankeyLayout({
      nodes: nodes.map((d) => Object.assign({}, d)),
      links: links.map((d) => Object.assign({}, d)),
    });

    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

    sankeyData.nodes.forEach((node: any) => {
      node.color = colorScale(node.name);
    });

    return { sankeyData, colorScale };
  }

  private drawSankeyDiagram(
    sankeyData: any,
    colorScale: d3.ScaleOrdinal<string, unknown>,
    columnNames: string[],
  ): void {
    const colorSource =
      this.formattingSettings.linkSettings.linkColorSource.value.value;
    const colorMode = this.formattingSettings.nodeColor.colorMode.value.value;
    const fixedColor = this.formattingSettings.nodeColor.fixedColor.value.value;
    const paletteColor1 =
      this.formattingSettings.nodeColor.paletteColor1.value.value;
    const paletteColor2 =
      this.formattingSettings.nodeColor.paletteColor2.value.value;
    const linkOpacity =
      this.formattingSettings.linkSettings.fillOpacity.value / 100;

    const showHeaders = this.formattingSettings.columnHeaders.show.value;
    const headerColor =
      this.formattingSettings.columnHeaders.fontColor.value.value;
    const headerFontSize = this.formattingSettings.columnHeaders.fontSize.value;
    const headerFontFamily =
      this.formattingSettings.columnHeaders.fontFamily.value.value;
    const strokeColor = this.formattingSettings.nodeSettings.stroke.value.value;
    const strokeWidth = this.formattingSettings.nodeSettings.strokeWidth.value;
    const labelColor = this.formattingSettings.dataLabels.color.value.value;
    const labelFontSize = this.formattingSettings.dataLabels.fontSize.value;
    const labelFontFamily =
      this.formattingSettings.dataLabels.fontFamily.value.value;

    // Assign colors to nodes based on the selected color mode
    sankeyData.nodes.forEach((node: any) => {
      switch (colorMode) {
        case "fixed":
          node.color = fixedColor;
          break;
        case "byCategory":
          node.color = colorScale(node.name);
          break;
        case "byValue":
          const setting =
            this.formattingSettings.nodeColor.nodeColors[node.name];
          console.log(
            `Rendering node '${node.name}' with color:`,
            setting?.value?.value,
          );

          if (setting && setting.value?.value) {
            node.color = setting.value.value;
          } else {
            node.color = colorScale(node.name);
          }
          break;
        case "customPalette":
          node.color = node.name.includes("Category1")
            ? paletteColor1
            : paletteColor2;
          break;
        default:
          node.color = colorScale(node.name);
      }
    });

    this.formattingSettings.updateVisibility();

    if (showHeaders) {
      columnNames.forEach((name, index) => {
        const nodesInColumn = sankeyData.nodes.filter((n: any) =>
          n.name.endsWith(`__${index}`),
        );

        if (nodesInColumn.length > 0) {
          const firstNode = nodesInColumn[0];
          const columnX = (firstNode.x0 + firstNode.x1) / 2;

          this.svg
            .append("text")
            .attr("x", columnX)
            .attr("y", 15)
            .attr("text-anchor", "middle")
            .style("font-size", `${headerFontSize}px`) // <--- Dynamique
            .style("font-family", headerFontFamily) // <--- Dynamique
            .style("font-weight", "bold")
            .style("fill", headerColor) // <--- Dynamique
            .text(name);
        }
      });
    }

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
      .style("fill", (d: any) => d.color)
      .style("fill", (d: any) => d.color)
      .style("stroke", strokeColor) // <--- Dynamique
      .style("stroke-width", strokeWidth); // <--- Dynamique

    // Draw links
    this.svg
      .append("g")
      .selectAll("path")
      .data(sankeyData.links as SankeyLink[])
      .enter()
      .append("path")
      .attr("d", sankeyLinkHorizontal<SankeyNode, SankeyLink>())
      .attr("stroke-width", (d: SankeyLink) => Math.max(1, d.width!))
      .attr("stroke", (d: any) =>
        colorSource === "source" ? d.source.color : d.target.color,
      )
      .attr("fill", "none")
      .attr("fill-opacity", linkOpacity)
      .append("title")
      .text(
        (d: SankeyLink) =>
          `${(d.source as SankeyNode).displayName} → ${
            (d.target as SankeyNode).displayName
          }\n${d.value}`,
      );

    // Draw labels
    this.svg
      .append("g")
      .selectAll("text")
      .data(sankeyData.nodes)
      .enter()
      .append("text")
      .attr("x", (d: any) => {
        if (!d.sourceLinks || d.sourceLinks.length === 0) {
          return (isNaN(d.x0) ? 0 : d.x0) - 6;
        }
        return (isNaN(d.x1) ? 0 : d.x1) + 6;
      })
      .attr("y", (d: any) => (isNaN(d.y0) ? 0 : (d.y0 + d.y1) / 2))
      .attr("dy", "0.35em")
      .attr("text-anchor", (d: any) => {
        if (!d.sourceLinks || d.sourceLinks.length === 0) {
          return "end";
        }
        return "start";
      })
      .text((d: SankeyNode) => d.displayName || d.name)
      .style("font-size", `${labelFontSize}px`) // <--- Dynamique
      .style("font-family", labelFontFamily) // <--- Dynamique
      .style("fill", labelColor);
  }

  public getFormattingModel(): powerbi.visuals.FormattingModel {
    return this.formattingSettingsService.buildFormattingModel(
      this.formattingSettings,
    );
  }
}
