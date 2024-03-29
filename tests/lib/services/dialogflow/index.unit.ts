import {
  Event as IngestEvent,
  RequestType as IngestRequestType,
} from '@voiceflow/event-ingestion-service/build/lib/types';
import { expect } from 'chai';
import _ from 'lodash';
import sinon from 'sinon';

import { T, V } from '@/lib/constants';
import DialogflowManager from '@/lib/services/dialogflow';
import { RequestType } from '@/lib/services/runtime/types';

describe('DialogflowManager unit tests', async () => {
  let clock: sinon.SinonFakeTimers;

  beforeEach(() => {
    clock = sinon.useFakeTimers(Date.now()); // fake Date.now
  });
  afterEach(() => {
    clock.restore(); // restore Date.now
    sinon.restore();
  });

  describe('extractSessionID', () => {
    it('should extract session ID from session', () => {
      const sessionID = 'session-id';
      expect(DialogflowManager.extractSessionID('projects/project-id/agent/sessions/session-id')).to.equal(sessionID);
      expect(DialogflowManager.extractSessionID('projects/sessions/session-id/stuff-behind')).to.equal(sessionID);
      expect(DialogflowManager.extractSessionID('projects/session-id')).to.equal(`projects/${sessionID}`);
      expect(DialogflowManager.extractSessionID('session-id')).to.equal(sessionID);
    });
  });

  describe('dialogflow', () => {
    it('slot filling', async () => {
      const services = {
        metrics: {
          invocation: sinon.stub(),
        },
        slotFillingES: {
          canHandle: sinon.stub().returns(true),
          response: sinon.stub().returns('response'),
        },
      };
      const dialogflow = new DialogflowManager(services as any, null as any);
      const req = {
        queryResult: { intent: { displayName: 'actions.intent.MAIN' }, queryText: 'main intent' },
        session: 'user-id',
      };
      expect(await dialogflow.es(req as any, '')).to.eql('response');
      expect(services.slotFillingES.canHandle.args).to.eql([[req]]);
      expect(services.slotFillingES.response.args).to.eql([[req, req.session]]);
    });
    it('main intent', async () => {
      const projectID = 'project-id';
      const versionID = 'version-id';
      const stateObj = {
        stack: {
          isEmpty: sinon.stub().returns(false),
        },
        variables: {
          set: sinon.stub(),
        },
        turn: {
          set: sinon.stub(),
        },
        update: sinon.stub(),
        services: {
          analyticsClient: {
            track: sinon.stub().returns(true),
          },
        },
        getVersionID: sinon.stub().returns(versionID),
        getRawState: sinon.stub().returns({ versionID }),
        api: { getVersion: sinon.stub().resolves({ projectID }) },
      };

      const services = {
        initializeES: {
          build: sinon.stub(),
        },
        runtimeBuildES: {
          build: sinon.stub().returns(stateObj),
        },
        responseES: {
          build: sinon.stub(),
        },
        metrics: {
          invocation: sinon.stub(),
        },
      };

      const req = {
        queryResult: {
          allRequiredParamsPresent: true,
          intent: { displayName: 'actions.intent.MAIN' },
          queryText: 'main intent',
        },
        session: 'user-id',
      };

      const dialogflow = new DialogflowManager(services as any, null as any);
      const CHANNEL_VAR = 'the-channel';
      const _getChannelStub = sinon.stub().returns(CHANNEL_VAR);
      _.set(dialogflow, '_getChannel', _getChannelStub);

      await dialogflow.es(req as any, versionID);

      const payload = {
        payload: {
          input: 'main intent',
          intent: 'actions.intent.MAIN',
          slots: undefined,
          action: undefined,
        },
        type: 'INTENT',
      };

      const { timestamp } = stateObj.services.analyticsClient.track.args[0][0];

      expect(services.metrics.invocation.args).to.eql([[]]);
      expect(services.runtimeBuildES.build.args).to.eql([[versionID, req.session]]);
      expect(services.initializeES.build.args).to.eql([[stateObj, req.session, req]]);
      expect(stateObj.variables.set.args).to.eql([
        [V.TIMESTAMP, Math.floor(clock.now / 1000)],
        [V.DF_ES_CHANNEL, CHANNEL_VAR],
      ]);
      expect(stateObj.update.args).to.eql([[]]);
      expect(services.responseES.build.args).to.eql([[stateObj]]);
      expect(stateObj.services.analyticsClient.track.args).to.eql([
        [
          {
            projectID,
            versionID,
            event: IngestEvent.TURN,
            request: IngestRequestType.LAUNCH,
            payload,
            sessionid: req.session,
            metadata: { versionID, platform: 'dialogflow-es' },
            timestamp,
          },
        ],
      ]);
    });

    it('default welcome intent', async () => {
      const projectID = 'project-id';
      const versionID = 'version-id';
      const stateObj = {
        stack: {
          isEmpty: sinon.stub().returns(false),
        },
        variables: {
          set: sinon.stub(),
        },
        turn: {
          set: sinon.stub(),
        },
        update: sinon.stub(),
        services: {
          analyticsClient: {
            track: sinon.stub().returns(true),
          },
        },
        getVersionID: sinon.stub().returns(versionID),
        getRawState: sinon.stub().returns({ versionID }),
        api: { getVersion: sinon.stub().resolves({ projectID }) },
      };

      const services = {
        initializeES: {
          build: sinon.stub(),
        },
        runtimeBuildES: {
          build: sinon.stub().returns(stateObj),
        },
        responseES: {
          build: sinon.stub(),
        },
        metrics: {
          invocation: sinon.stub(),
        },
      };

      const req = {
        queryResult: {
          allRequiredParamsPresent: true,
          intent: { displayName: 'Default Welcome Intent' },
          queryText: 'default welcome intent',
        },
        session: 'user-id',
      };

      const dialogflow = new DialogflowManager(services as any, null as any);
      const _getChannelStub = sinon.stub().returns('');
      _.set(dialogflow, '_getChannel', _getChannelStub);

      await dialogflow.es(req as any, versionID);
      const payload = {
        payload: {
          input: 'default welcome intent',
          intent: 'Default Welcome Intent',
          slots: undefined,
          action: undefined,
        },
        type: 'INTENT',
      };

      const { timestamp } = stateObj.services.analyticsClient.track.args[0][0];

      expect(services.metrics.invocation.args).to.eql([[]]);
      expect(services.runtimeBuildES.build.args).to.eql([[versionID, req.session]]);
      expect(services.initializeES.build.args).to.eql([[stateObj, req.session, req]]);
      expect(stateObj.variables.set.args).to.eql([
        [V.TIMESTAMP, Math.floor(clock.now / 1000)],
        [V.DF_ES_CHANNEL, ''],
      ]);
      expect(stateObj.update.args).to.eql([[]]);
      expect(services.responseES.build.args).to.eql([[stateObj]]);
      expect(stateObj.services.analyticsClient.track.args).to.eql([
        [
          {
            projectID,
            versionID,
            event: IngestEvent.TURN,
            request: IngestRequestType.LAUNCH,
            payload,
            sessionid: req.session,
            metadata: { versionID, platform: 'dialogflow-es' },
            timestamp,
          },
        ],
      ]);
    });

    it('stack empty', async () => {
      const projectID = 'project-id';
      const versionID = 'version-id';
      const stateObj = {
        turn: {
          set: sinon.stub(),
        },
        stack: {
          isEmpty: sinon.stub().returns(true),
        },
        variables: {
          set: sinon.stub(),
        },
        update: sinon.stub(),
        services: {
          analyticsClient: {
            track: sinon.stub().returns(true),
          },
        },
        getVersionID: sinon.stub().returns(versionID),
        getRawState: sinon.stub().returns({ versionID }),
        api: { getVersion: sinon.stub().resolves({ projectID }) },
      };

      const services = {
        initializeES: {
          build: sinon.stub(),
        },
        runtimeBuildES: {
          build: sinon.stub().returns(stateObj),
        },
        responseES: {
          build: sinon.stub(),
        },
        metrics: {
          invocation: sinon.stub(),
        },
      };

      const req = {
        queryResult: {
          allRequiredParamsPresent: true,
          intent: { displayName: 'random intent' },
          parameters: { s1: 'v1', s2: 'v2' },
          queryText: 'random',
        },
        session: 'user-id',
      };

      const dialogflow = new DialogflowManager(services as any, null as any);
      const _getChannelStub = sinon.stub().returns('');
      _.set(dialogflow, '_getChannel', _getChannelStub);

      await dialogflow.es(req as any, versionID);

      expect(services.metrics.invocation.args).to.eql([[]]);
      expect(services.runtimeBuildES.build.args).to.eql([[versionID, req.session]]);
      expect(services.initializeES.build.args).to.eql([[stateObj, req.session, req]]);
      expect(stateObj.turn.set.args[0]).to.eql([
        T.REQUEST,
        {
          type: RequestType.INTENT,
          payload: {
            intent: req.queryResult.intent.displayName,
            input: req.queryResult.queryText,
            slots: req.queryResult.parameters,
            action: undefined,
          },
        },
      ]);
      expect(stateObj.variables.set.args).to.eql([
        [V.TIMESTAMP, Math.floor(clock.now / 1000)],
        [V.DF_ES_CHANNEL, ''],
      ]);
      expect(stateObj.update.args).to.eql([[]]);
      expect(services.responseES.build.args).to.eql([[stateObj]]);
    });

    it('existing session', async () => {
      const projectID = 'project-id';
      const versionID = 'version-id';
      const stateObj = {
        turn: { set: sinon.stub() },
        stack: {
          isEmpty: sinon.stub().returns(false),
        },
        variables: {
          set: sinon.stub(),
        },
        update: sinon.stub(),
        services: {
          analyticsClient: {
            track: sinon.stub().returns(true),
          },
        },
        getVersionID: sinon.stub().returns(versionID),
        getRawState: sinon.stub().returns({ versionID }),
        api: { getVersion: sinon.stub().resolves({ projectID }) },
      };

      const services = {
        runtimeBuildES: {
          build: sinon.stub().returns(stateObj),
        },
        responseES: {
          build: sinon.stub(),
        },
        metrics: {
          invocation: sinon.stub(),
        },
      };

      const req = {
        queryResult: {
          allRequiredParamsPresent: true,
          intent: { displayName: 'random intent' },
          queryText: 'random',
          parameters: { s1: 'v1', s2: 'v2' },
        },
        session: 'user-id',
      };

      const dialogflow = new DialogflowManager(services as any, null as any);
      const _getChannelStub = sinon.stub().returns('');
      _.set(dialogflow, '_getChannel', _getChannelStub);

      await dialogflow.es(req as any, versionID);
      const payload = {
        payload: {
          input: 'random',
          intent: 'random intent',
          slots: { s1: 'v1', s2: 'v2' },
          action: undefined,
        },
        type: 'INTENT',
      };

      const { timestamp } = stateObj.services.analyticsClient.track.args[0][0];

      expect(services.metrics.invocation.args).to.eql([[]]);
      expect(services.runtimeBuildES.build.args).to.eql([[versionID, req.session]]);
      expect(stateObj.turn.set.args[0]).to.eql([
        T.REQUEST,
        {
          type: RequestType.INTENT,
          payload: {
            intent: req.queryResult.intent.displayName,
            input: req.queryResult.queryText,
            slots: req.queryResult.parameters,
            action: undefined,
          },
        },
      ]);
      expect(stateObj.variables.set.args).to.eql([
        [V.TIMESTAMP, Math.floor(clock.now / 1000)],
        [V.DF_ES_CHANNEL, ''],
      ]);
      expect(stateObj.update.args).to.eql([[]]);
      expect(services.responseES.build.args).to.eql([[stateObj]]);
      expect(stateObj.services.analyticsClient.track.args).to.eql([
        [
          {
            projectID,
            versionID,
            event: IngestEvent.TURN,
            request: IngestRequestType.REQUEST,
            payload,
            sessionid: req.session,
            metadata: { versionID, platform: 'dialogflow-es' },
            timestamp,
          },
        ],
      ]);
    });
  });

  describe('_getChannel', () => {
    it('source included', () => {
      const req = {
        originalDetectIntentRequest: { source: 'facebook' },
      };

      const dialogflow = new DialogflowManager({} as any, null as any);

      expect(dialogflow._getChannel(req as any)).to.eql(req.originalDetectIntentRequest.source);
    });

    describe('source not included', () => {
      it('in session', () => {
        const req = {
          originalDetectIntentRequest: {},
          session: 'projects/english-project-69249/agent/sessions/dfMessenger-32453617/contexts/system_counters',
        };

        const dialogflow = new DialogflowManager({} as any, null as any);

        expect(dialogflow._getChannel(req as any)).to.eql('dfMessenger');
      });

      it('not in session', () => {
        const req = {
          originalDetectIntentRequest: {},
          session: 'session',
        };

        const dialogflow = new DialogflowManager({} as any, null as any);

        expect(dialogflow._getChannel(req as any)).to.eql('unknown');
      });
    });
  });
});
