import * as VFMetrics from '@voiceflow/metrics';

import MetricsClient from '@/lib/clients/metrics';

const metricsAsserter = new VFMetrics.Testing.MetricsAsserter(MetricsClient);

describe('metrics client unit tests', () => {
  it('invocation', async () => {
    const fixture = await metricsAsserter.assertMetric({ expected: /^google_invocation_total 1 \d+$/m });

    fixture.metrics.invocation();

    await fixture.assert();
  });
});
