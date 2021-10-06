import * as Ingest from '@voiceflow/general-runtime/build/lib/clients/ingest-client';
import { expect } from 'chai';
import sinon from 'sinon';

import AnalyticsClient from '@/lib/clients/analytics';

describe('Analytics client unit tests', () => {
  describe('Track', () => {
    it('throws on unknown events', () => {
      const dependencies = { config: {}, dataAPI: { unhashVersionID: sinon.stub().resolves('unhashed') } };

      const client = AnalyticsClient(dependencies as any);
      const metadata = {
        data: {
          reqHeaders: {},
          locale: 'locale',
        },
        stack: {},
        storage: {},
        variables: {},
      };

      const payload = {};

      expect(
        client.track({
          id: 'id',
          event: 'fake-event' as Ingest.Event,
          request: Ingest.RequestType.REQUEST,
          payload: payload as any,
          sessionid: 'session.id',
          metadata: metadata as any,
          timestamp: new Date(),
        })
      ).to.eventually.rejectedWith(RangeError);
    });
  });
});
