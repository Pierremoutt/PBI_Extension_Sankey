import powerbi from "powerbi-visuals-api";
import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

import Card = formattingSettings.SimpleCard;
import Model = formattingSettings.Model;
import Slice = formattingSettings.Slice;
import ColorPicker = formattingSettings.ColorPicker;
import ToggleSwitch = formattingSettings.ToggleSwitch;
import Dropdown = formattingSettings.ItemDropdown;
import NumUpDown = formattingSettings.NumUpDown;

// --- 1. Settings pour les En-têtes de colonnes (Nouveau) ---
class ColumnHeadersCardSettings extends Card {
  show = new ToggleSwitch({
    name: "show",
    displayName: "Show Headers",
    value: true,
  });

  fontColor = new ColorPicker({
    name: "fontColor",
    displayName: "Font Color",
    value: { value: "#333333" },
  });

  fontSize = new NumUpDown({
    name: "fontSize",
    displayName: "Font Size",
    value: 12,
  });

  fontFamily = new Dropdown({
    name: "fontFamily",
    displayName: "Font Family",
    value: { displayName: "Segoe UI", value: "Segoe UI" },
    items: [
      { displayName: "Arial", value: "Arial" },
      { displayName: "Segoe UI", value: "Segoe UI" },
      { displayName: "Times New Roman", value: "Times New Roman" },
      { displayName: "Verdana", value: "Verdana" },
    ],
  });

  name: string = "columnHeaders";
  displayName: string = "Column Headers";
  slices: Slice[] = [this.show, this.fontColor, this.fontSize, this.fontFamily];
}

// --- 2. Settings pour les Liens (Refondu) ---
class LinkSettingsCard extends Card {
  linkColorSource = new Dropdown({
    name: "linkColorSource",
    displayName: "Link Color Source",
    value: { displayName: "Source", value: "source" },
    items: [
      { displayName: "Source", value: "source" },
      { displayName: "Target", value: "target" },
    ],
  });

  fillOpacity = new NumUpDown({
    name: "fillOpacity",
    displayName: "Opacity (%)",
    value: 50,
    options: {
      minValue: { type: powerbi.visuals.ValidatorType.Min, value: 0 },
      maxValue: { type: powerbi.visuals.ValidatorType.Max, value: 100 },
    },
  });

  name: string = "linkSettings";
  displayName: string = "Links";
  slices: Slice[] = [this.linkColorSource, this.fillOpacity];
}

// --- 3. Settings pour les Noeuds (Amélioré) ---
class NodesCardSettings extends Card {
  nodeWidth = new NumUpDown({
    name: "nodeWidth",
    displayName: "Node Width",
    value: 5,
  });

  nodePadding = new NumUpDown({
    name: "nodePadding",
    displayName: "Node Padding",
    value: 10,
  });

  stroke = new ColorPicker({
    name: "stroke",
    displayName: "Border Color",
    value: { value: "#000000" },
  });

  strokeWidth = new NumUpDown({
    name: "strokeWidth",
    displayName: "Border Width",
    value: 0,
  });

  name: string = "nodeSettings";
  displayName: string = "Nodes";
  slices: Slice[] = [
    this.nodeWidth,
    this.nodePadding,
    this.stroke,
    this.strokeWidth,
  ];
}

// --- 4. Settings pour les Labels de Données (Nouveau) ---
class DataLabelsCardSettings extends Card {
  show = new ToggleSwitch({
    name: "show",
    displayName: "Show Labels",
    value: true,
  });

  color = new ColorPicker({
    name: "color",
    displayName: "Color",
    value: { value: "#333333" },
  });

  fontSize = new NumUpDown({
    name: "fontSize",
    displayName: "Font Size",
    value: 10,
  });

  fontFamily = new Dropdown({
    name: "fontFamily",
    displayName: "Font Family",
    value: { displayName: "Segoe UI", value: "Segoe UI" },
    items: [
      { displayName: "Arial", value: "Arial" },
      { displayName: "Segoe UI", value: "Segoe UI" },
      { displayName: "Times New Roman", value: "Times New Roman" },
    ],
  });

  name: string = "dataLabels";
  displayName: string = "Data Labels";
  slices: Slice[] = [this.show, this.color, this.fontSize, this.fontFamily];
}

// --- 5. Settings pour les Couleurs de Noeuds (Existant conservé) ---
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

  nodeColors: { [nodeName: string]: ColorPicker } = {};

  name: string = "nodeColorSettings";
  displayName: string = "Node Colors";

  slices: Slice[] = [
    this.colorMode,
    this.fixedColor,
    this.paletteColor1,
    this.paletteColor2,
  ];

  addNodeColor(
    nodeName: string,
    displayName: string,
    selectionId: powerbi.visuals.ISelectionId,
    savedColor: string,
  ) {
    if (!this.nodeColors[nodeName]) {
      const colorPicker = new ColorPicker({
        name: "fill",
        displayName: displayName,
        value: { value: savedColor || "#cccccc" },
        selector: selectionId.getSelector(),
        visible: true,
        uid: nodeName,
      } as any);
      this.nodeColors[nodeName] = colorPicker;
      this.slices.push(colorPicker);
    }
  }
}

// --- MODÈLE PRINCIPAL ---
export class FormatSettingsModel extends Model {
  // enableAxis = new EnableAxisCardSettings(); // J'ai retiré celui-ci car peu utile pour un Sankey standard
  columnHeaders = new ColumnHeadersCardSettings();
  linkSettings = new LinkSettingsCard();
  nodeSettings = new NodesCardSettings();
  dataLabels = new DataLabelsCardSettings();
  nodeColor = new NodeColorCardSettings();

  cards: Card[] = [
    this.columnHeaders,
    this.linkSettings,
    this.nodeSettings,
    this.dataLabels,
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
    selectionId: powerbi.visuals.ISelectionId,
    savedColor: string,
  ) {
    this.nodeColor.addNodeColor(nodeName, displayName, selectionId, savedColor);
  }
}
