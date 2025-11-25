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

  // public enumerateObjectInstances(
  //   options: EnumerateVisualObjectInstancesOptions
  // ): VisualObjectInstanceEnumeration {
  //   const instances: VisualObjectInstance[] = [];

  //   if (options.objectName === "nodeColor") {
  //     const nodeColors = this.formattingSettings?.nodeColor?.nodeColors;

  //     if (nodeColors) {
  //       for (const nodeName in nodeColors) {
  //         const nodeSetting = nodeColors[nodeName];

  //         if (nodeSetting.visible) {
  //           instances.push({
  //             objectName: "nodeColor",
  //             displayName: nodeSetting.displayName || nodeName,
  //             properties: {
  //               value: nodeSetting.value?.value || "#cccccc",
  //             },
  //             selector: {
  //               data: [
  //                 {
  //                   name: "displayName", // The name of the field/identity property
  //                   kind: powerbiVisualsApi.VisualDataChangeType.Values, // Or Categories, depending on your data view structure
  //                   value: nodeSetting.displayName, // The actual value of the data point (e.g., "A", "B", "C")
  //                 },
  //               ],
  //             },
  //           });
  //         }
  //       }
  //     }
  //   }
  //   console.log(instances);
  //   return instances;
  // }

  public update(options: VisualUpdateOptions): void {
    console.log("Update triggered");
    try {
      this.formattingSettings =
        this.formattingSettingsService.populateFormattingSettingsModel(
          FormatSettingsModel,
          options.dataViews?.[0]
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

      const { nodes, links } = this.processData(categories, values);
      // Add node-specific color settings
      nodes.forEach((node) => {
        this.formattingSettings.addNodeColor(
          node.name,
          node.displayName,
          node.selectionId,
          node.savedColor
        );
      });

      const { sankeyData, colorScale } = this.createSankeyLayout(
        nodes,
        links,
        width,
        height
      );

      this.drawSankeyDiagram(sankeyData, colorScale);
      console.log(
        "Formatting Model:",
        this.formattingSettingsService.buildFormattingModel(
          this.formattingSettings
        )
      );
    } catch (error) {
      console.error("Error updating visual:", error);
    }
  }

  private processData(
    categories: DataViewCategoryColumn[],
    values: DataViewValueColumn[]
  ): { nodes: SankeyNode[]; links: SankeyLink[] } {
    const nodeMap: { [key: string]: number } = {};
    const displayNameMap: { [key: string]: string } = {};
    const nodes: SankeyNode[] = [];
    const links: SankeyLink[] = [];

    categories.forEach((category, index) => {
      const categoryValues = category.values.map(String);

      categoryValues.forEach((value, i) => {
        const sourceKey = `${value}__${index}`;

        // -------------------------------------------------------
        // 1. PROCESS SOURCE NODE
        // -------------------------------------------------------
        if (!(sourceKey in nodeMap)) {
          nodeMap[sourceKey] = nodes.length;
          displayNameMap[sourceKey] = value;
          const selectionId = this.host
            .createSelectionIdBuilder()
            .withCategory(category, i)
            .createSelectionId();
          const objects = category.objects?.[i];
          const savedColor =
            objects &&
            objects["nodeColorSettings"] &&
            objects["nodeColorSettings"]["fill"]
              ? (objects["nodeColorSettings"]["fill"] as any).solid.color
              : null;

          nodes.push({
            name: sourceKey,
            displayName: value,
            selectionId: selectionId, // <--- Pass ID
            savedColor: savedColor,
          });
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
            const targetSelectionId = this.host
              .createSelectionIdBuilder()
              .withCategory(categories[index + 1], i)
              .createSelectionId();
            const targetObjects = categories[index + 1].objects?.[i];
            const targetSavedColor =
              targetObjects &&
              targetObjects["nodeColorSettings"] &&
              targetObjects["nodeColorSettings"]["fill"]
                ? (targetObjects["nodeColorSettings"]["fill"] as any).solid
                    .color
                : null;

            // Inside Target Node block
            console.log("Checking IDs:", {
              sourceID: selectionId.getKey(),
              targetID: targetSelectionId.getKey(),
              areTheyEqual: selectionId.equals(targetSelectionId),
            });

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
            (l) => l.source === sourceIndex && l.target === targetIndex
          );

          if (existingLink) {
            // Aggregate: Add value to existing link
            existingLink.value += linkValue;
          } else {
            // Create new link
            links.push({
              source: sourceIndex,
              target: targetIndex,
              value: linkValue,
              // You can also add an ID here if you want link coloring later
            });
          }
        }
      });
    });

    return { nodes, links };
  }

  private createSankeyLayout(
    nodes: SankeyNode[],
    links: SankeyLink[],
    width: number,
    height: number
  ): { sankeyData: any; colorScale: d3.ScaleOrdinal<string, unknown> } {
    const nodeWidth = this.formattingSettings.nodeSettings.nodeWidth.value ?? 5;
    const nodePadding =
      this.formattingSettings.nodeSettings.nodePadding.value ?? 10;

    const sankeyLayout = sankey<SankeyNode, SankeyLink>()
      .nodeWidth(nodeWidth * 5)
      .nodePadding(nodePadding)
      .extent([
        [1, 1],
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
    colorScale: d3.ScaleOrdinal<string, unknown>
  ): void {
    const colorSource =
      this.formattingSettings.colorSelector.linkColorSource.value.value;
    const colorMode = this.formattingSettings.nodeColor.colorMode.value.value;
    const fixedColor = this.formattingSettings.nodeColor.fixedColor.value.value;
    const paletteColor1 =
      this.formattingSettings.nodeColor.paletteColor1.value.value;
    const paletteColor2 =
      this.formattingSettings.nodeColor.paletteColor2.value.value;

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
          const nodeColorSetting =
            this.formattingSettings.nodeColor.nodeColors[node.name];
          if (nodeColorSetting) {
            node.color = nodeColorSetting.value.value;
            // console.log(`Assigned color ${node.color} to node ${node.name}`);
          } else {
            node.color = colorScale(node.name);
          }
          const setting =
            this.formattingSettings.nodeColor.nodeColors[node.name];
          console.log(
            `Rendering node '${node.name}' with color:`,
            setting?.value?.value
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
      .style("stroke", "black");

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
        colorSource === "source" ? d.source.color : d.target.color
      )
      .attr("fill", "none")
      .append("title")
      .text(
        (d: SankeyLink) =>
          `${(d.source as SankeyNode).displayName} → ${
            (d.target as SankeyNode).displayName
          }\n${d.value}`
      );

    // Draw labels
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
