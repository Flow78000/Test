declare module "plotly.js-dist-min" {
  type PlotData = Record<string, unknown>;
  type Layout = Record<string, unknown>;
  type Config = Record<string, unknown>;

  interface PlotlyStatic {
    newPlot(
      root: HTMLElement,
      data: PlotData[],
      layout?: Layout,
      config?: Config
    ): Promise<void>;
    react(
      root: HTMLElement,
      data: PlotData[],
      layout?: Layout,
      config?: Config
    ): Promise<void>;
    purge(root: HTMLElement): void;
    relayout(root: HTMLElement, layout: Layout): Promise<void>;
    restyle(root: HTMLElement, update: Record<string, unknown>): Promise<void>;
  }

  const Plotly: PlotlyStatic;
  export default Plotly;
}
