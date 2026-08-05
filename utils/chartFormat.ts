/**
 * Post-processes a gifted-charts auto-generated y-axis tick label (e.g. the
 * raw string "9080") into a thousands-separated one ("9,080"), without
 * needing to precompute tick values ourselves via yAxisLabelTexts. Passed as
 * `formatYLabel` on BarChart/LineChart.
 */
export function formatYAxisLabel(rawLabel: string): string {
  const value = Number(rawLabel);
  if (!Number.isFinite(value)) {
    return rawLabel;
  }
  return value.toLocaleString('en-US');
}
