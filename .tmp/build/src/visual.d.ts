import powerbiVisualsApi from "powerbi-visuals-api";
import IVisual = powerbiVisualsApi.extensibility.visual.IVisual;
import VisualUpdateOptions = powerbiVisualsApi.extensibility.visual.VisualUpdateOptions;
import VisualObjectInstanceEnumeration = powerbiVisualsApi.VisualObjectInstanceEnumeration;
import EnumerateVisualObjectInstancesOptions = powerbiVisualsApi.EnumerateVisualObjectInstancesOptions;
import VisualConstructorOptions = powerbiVisualsApi.extensibility.visual.VisualConstructorOptions;
export declare class Visual implements IVisual {
    private target;
    private svg;
    private formattingSettings;
    private formattingSettingsService;
    constructor(options: VisualConstructorOptions);
    enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstanceEnumeration;
    update(options: VisualUpdateOptions): void;
    private processData;
    private createSankeyLayout;
    private drawSankeyDiagram;
    getFormattingModel(): powerbi.visuals.FormattingModel;
}
