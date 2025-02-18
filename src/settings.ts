import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

import Card = formattingSettings.SimpleCard;
import Model = formattingSettings.Model;
import Slice = formattingSettings.Slice;
import ColorPicker = formattingSettings.ColorPicker;
import ToggleSwitch = formattingSettings.ToggleSwitch;

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
  name: string = "colorSelector";
  displayName: string = "Data Colors";

  // slices will be populated in barChart settings model `populateColorSelector` method
  slices: Slice[] = [];
}

export class FormatSettingsModel extends Model {
  // Create formatting settings model formatting cards
  enableAxis = new EnableAxisCardSettings();
  colorSelector = new ColorSelectorCardSettings();
  cards: Card[] = [this.enableAxis, this.colorSelector];
}
