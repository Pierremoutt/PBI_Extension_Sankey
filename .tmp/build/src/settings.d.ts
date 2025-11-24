import powerbi from "powerbi-visuals-api";
import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";
import Card = formattingSettings.SimpleCard;
import Model = formattingSettings.Model;
import Slice = formattingSettings.Slice;
import ColorPicker = formattingSettings.ColorPicker;
import ToggleSwitch = formattingSettings.ToggleSwitch;
/**
 * Enable Axis Formatting Card
 */
declare class EnableAxisCardSettings extends Card {
    show: formattingSettings.ToggleSwitch;
    fill: formattingSettings.ColorPicker;
    topLevelSlice: ToggleSwitch;
    name: string;
    displayName: string;
    slices: Slice[];
}
/**
 * Color Selector Formatting Card
 */
declare class ColorSelectorCardSettings extends Card {
    linkColorSource: formattingSettings.ItemDropdown;
    name: string;
    displayName: string;
    slices: Slice[];
}
declare class NodesCardSettings extends Card {
    nodeWidth: formattingSettings.NumUpDown;
    nodePadding: formattingSettings.NumUpDown;
    name: string;
    displayName: string;
    slices: Slice[];
}
declare class NodeColorCardSettings extends Card {
    colorMode: formattingSettings.ItemDropdown;
    fixedColor: formattingSettings.ColorPicker;
    paletteColor1: formattingSettings.ColorPicker;
    paletteColor2: formattingSettings.ColorPicker;
    nodeColors: {
        [nodeName: string]: ColorPicker;
    };
    name: string;
    displayName: string;
    slices: Slice[];
    addNodeColor(nodeName: string, displayName: string, selectionId: powerbi.visuals.ISelectionId, savedColor: string): void;
}
export declare class FormatSettingsModel extends Model {
    enableAxis: EnableAxisCardSettings;
    colorSelector: ColorSelectorCardSettings;
    nodeSettings: NodesCardSettings;
    nodeColor: NodeColorCardSettings;
    cards: Card[];
    updateVisibility(): void;
    addNodeColor(nodeName: string, displayName: string, selectionId: powerbi.visuals.ISelectionId, savedColor: string): void;
}
export {};
