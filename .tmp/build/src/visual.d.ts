import powerbiVisualsApi from "powerbi-visuals-api";
import IVisual = powerbiVisualsApi.extensibility.visual.IVisual;
import VisualUpdateOptions = powerbiVisualsApi.extensibility.visual.VisualUpdateOptions;
import VisualConstructorOptions = powerbiVisualsApi.extensibility.visual.VisualConstructorOptions;
export declare class Visual implements IVisual {
    private target;
    private svg;
    private formattingSettings;
    private formattingSettingsService;
    private host;
    constructor(options: VisualConstructorOptions);
    update(options: VisualUpdateOptions): void;
    private processData;
    private createSankeyLayout;
    private drawSankeyDiagram;
    getFormattingModel(): powerbi.visuals.FormattingModel;
}
