import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

import Card = formattingSettings.SimpleCard;
import Model = formattingSettings.Model;
import Slice = formattingSettings.Slice;
import ColorPicker = formattingSettings.ColorPicker;
import ToggleSwitch = formattingSettings.ToggleSwitch;
import Dropdown = formattingSettings.ItemDropdown;
import NumUpDown = formattingSettings.NumUpDown;

/**
 * Enable Axis Formatting Card
 */
class EnableAxisCardSettings extends Card {
  show = new ToggleSwitch({
    name: "show",
    displayName: undefined,
    value: false,
  });

  fill = new ColorPicker({
    name: "fill",
    displayName: "Color",
    value: { value: "#000000" },
  });
  topLevelSlice: ToggleSwitch = this.show;
  name: string = "enableAxis";
  displayName: string = "Enable Axis";
  slices: Slice[] = [this.fill];
}

/**
 * Color Selector Formatting Card
 */
class ColorSelectorCardSettings extends Card {
  linkColorSource = new Dropdown({
    name: "linkColorSource",
    displayName: "Link Color Source",
    value: { displayName: "Source", value: "source" },
    items: [
      { displayName: "Source", value: "source" },
      { displayName: "Target", value: "target" },
    ],
  });

  name: string = "colorSelector";
  displayName: string = "Data Colors";

  // slices will be populated in barChart settings model `populateColorSelector` method
  slices: Slice[] = [this.linkColorSource];
}

class NodesCardSettings extends Card {
  nodeWidth = new NumUpDown({
    name: "nodeWidth",
    displayName: "Node Width",
    value: 5, // valeur par défaut
  });

  nodePadding = new NumUpDown({
    name: "nodePadding",
    displayName: "Node Padding",
    value: 5, // valeur par défaut
  });

  name: string = "nodeSettings";
  displayName: string = "Nodes";

  slices: Slice[] = [this.nodeWidth, this.nodePadding];
}

class NodeColorCardSettings extends Card {
  colorMode = new Dropdown({
    name: "colorMode",
    displayName: "Node Color Mode",
    value: { displayName: "By Category", value: "byCategory" },
    items: [
      { displayName: "Fixed", value: "fixed" },
      { displayName: "By Category", value: "byCategory" },
      { displayName: "By Value", value: "byValue" },
      { displayName: "Custom Palette", value: "customPalette" },
    ],
  });

  fixedColor = new ColorPicker({
    name: "fixedColor",
    displayName: "Fixed Node Color",
    value: { value: "#1f77b4" },
    visible: false,
  });

  paletteColor1 = new ColorPicker({
    name: "paletteColor1",
    displayName: "Color 1",
    value: { value: "#ff0000" },
    visible: false,
  });

  paletteColor2 = new ColorPicker({
    name: "paletteColor2",
    displayName: "Color 2",
    value: { value: "#00ff00" },
    visible: false,
  });

  nodeColors: {
    [nodeName: string]: ColorPicker;
  } = {};

  name: string = "nodeColorSettings";
  displayName: string = "Node Colors";

  slices: Slice[] = [
    this.colorMode,
    this.fixedColor,
    this.paletteColor1,
    this.paletteColor2,

    ...Object.values(this.nodeColors),
  ];

  // addNodeColor(
  //   nodeName: string,
  //   displayName: string,
  //   defaultColor: string = "#000000"
  // ) {
  //   if (!this.nodeColors[nodeName]) {
  //     const colorPicker = new ColorPicker({
  //       name: nodeName, // important : identifiant unique
  //       displayName: displayName,
  //       value: { value: defaultColor },
  //       visible: true,
  //     });

  //     this.nodeColors[nodeName] = colorPicker;

  //     // Ajout dans slices pour que Power BI l'affiche
  //     this.slices.push(colorPicker);

  //     // // Optionnel : exposer aussi comme propriété directe si nécessaire
  //     // (this as any)[nodeName] = colorPicker;
  //   }
  // }
  addNodeColor(
    nodeName: string,
    displayName: string,
    storedColor: string = "#000000"
  ) {
    if (!this.nodeColors[nodeName]) {
      const colorPicker = new ColorPicker({
        name: nodeName,
        displayName: displayName,
        value: { value: storedColor },
        visible: true,
      });

      this.nodeColors[nodeName] = colorPicker;
      this.slices.push(colorPicker);
    }
  }
}

export class FormatSettingsModel extends Model {
  enableAxis = new EnableAxisCardSettings();
  colorSelector = new ColorSelectorCardSettings();
  nodeSettings = new NodesCardSettings();
  nodeColor = new NodeColorCardSettings();

  cards: Card[] = [
    this.enableAxis,
    this.colorSelector,
    this.nodeSettings,
    this.nodeColor,
  ];

  updateVisibility() {
    const colorMode = this.nodeColor.colorMode.value.value;

    this.nodeColor.fixedColor.visible = colorMode === "fixed";
    this.nodeColor.paletteColor1.visible = colorMode === "customPalette";
    this.nodeColor.paletteColor2.visible = colorMode === "customPalette";

    const showNodeColors = colorMode === "byValue";
    for (const nodeName in this.nodeColor.nodeColors) {
      this.nodeColor.nodeColors[nodeName].visible = showNodeColors;
    }
  }

  addNodeColor(
    nodeName: string,
    displayName: string,
    defaultColor: string = "#000000"
  ) {
    const existing = this.nodeColor.nodeColors[nodeName];
    const storedColor = existing?.value?.value ?? defaultColor;

    // Only add if not already present
    if (!existing) {
      this.nodeColor.addNodeColor(nodeName, displayName, storedColor);
    }
  }
}
