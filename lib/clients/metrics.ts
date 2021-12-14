import { Counter } from '@opentelemetry/api-metrics';
import * as VFMetrics from '@voiceflow/metrics';

import log from '@/logger';
import { Config } from '@/types';

export class Metrics extends VFMetrics.Client.Metrics {
  protected counters: {
    google: {
      invocation: Counter;
    };
  };

  constructor(config: Config) {
    super({ ...config, SERVICE_NAME: 'google-runtime' });

    super.once('ready', ({ port, path }: VFMetrics.Client.Events['ready']) => {
      log.info(`[metrics] exporter ready ${log.vars({ port, path })}`);
    });

    this.counters = {
      google: {
        invocation: this.meter.createCounter('google_invocation', { description: 'Google invocations' }),
      },
    };
  }

  invocation(): void {
    this.counters.google.invocation.add(1);
  }
}

const MetricsClient = (config: Config) => new Metrics(config);

export type MetricsType = Metrics;

export default MetricsClient;
