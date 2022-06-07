import {
  Event as IngestEvent,
  RequestType as IngestRequestType,
} from '@voiceflow/event-ingestion-service/build/lib/types';
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
          projectID: 'projectID',
          versionID: 'versionID',
          event: 'fake-event' as IngestEvent,
          request: IngestRequestType.REQUEST,
          payload: payload as any,
          sessionid: 'session.id',
          metadata: metadata as any,
          timestamp: new Date(),
        })
      ).to.eventually.rejectedWith(RangeError);
    });
  });
});
