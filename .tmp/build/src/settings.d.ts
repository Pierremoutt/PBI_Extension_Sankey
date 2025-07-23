import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";
import Card = formattingSettings.SimpleCard;
import Model = formattingSettings.Model;
import Slice = formattingSettings.Slice;
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
export declare class FormatSettingsModel extends Model {
    enableAxis: EnableAxisCardSettings;
    colorSelector: ColorSelectorCardSettings;
    cards: Card[];
}
export {};
