
export class MetricsReporter {
  report(metric: string, value: any) {
    // In a real application, this would send metrics to a monitoring service.
    console.log(`Metric: ${metric}`, value);
  }
}
