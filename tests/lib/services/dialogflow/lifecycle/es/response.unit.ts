import * as Ingest from '@voiceflow/general-runtime/build/lib/clients/ingest-client';
import { expect } from 'chai';
import _ from 'lodash';
import sinon from 'sinon';

import { S, T } from '@/lib/constants';
import ResponseManager from '@/lib/services/dialogflow/lifecycle/es/response';

describe('responseManager unit tests', async () => {
  afterEach(() => sinon.restore());

  describe('build', () => {
    it('no output', async () => {
      const responseHandler1 = sinon.stub();
      const responseHandler2 = sinon.stub();

      const services = {
        state: { saveToDb: sinon.stub() },
        utils: {
          responseHandlersDialogflowES: [responseHandler1, responseHandler2],
        },
      };

      const responseManager = new ResponseManager(services as any, null as any);
      const userId = 'user-id';
      const versionID = 'version-id';
      const finalState = { random: 'runtime', storage: { user: userId } };
      const output = '';

      const storageGet = sinon.stub().returns(null);
      storageGet.withArgs(S.OUTPUT).returns(output);
      storageGet.withArgs(S.USER).returns(userId);

      const runtime = {
        getFinalState: sinon.stub().returns(finalState),
        stack: {
          isEmpty: sinon.stub().returns(false),
        },
        storage: {
          get: storageGet,
          user: userId,
        },
        turn: {
          set: sinon.stub(),
          get: sinon.stub().onFirstCall().returns(false).returns(null),
        },
        services: {
          analyticsClient: {
            track: sinon.stub().returns(true),
          },
        },
        getVersionID: sinon.stub().returns(versionID),
        getRawState: sinon.stub().returns(versionID),
      };

      const res = {
        fulfillmentText: output,
        fulfillmentMessages: [{ text: { text: [output] } }],
        endInteraction: false,
      };

      expect(await responseManager.build(runtime as any)).to.eql(res);
      const { timestamp } = runtime.services.analyticsClient.track.args[0][0];

      expect(runtime.stack.isEmpty.callCount).to.eql(1);
      expect(runtime.storage.get.args).to.eql([[S.PRIOR_OUTPUT], [S.OUTPUT], [S.USER]]);
      expect(responseHandler1.args).to.eql([[runtime, res]]);
      expect(responseHandler2.args).to.eql([[runtime, res]]);
      expect(services.state.saveToDb.args[0]).to.eql([userId, finalState]);
      expect(runtime.services.analyticsClient.track.args).to.eql([
        [
          {
            id: versionID,
            event: Ingest.Event.INTERACT,
            request: Ingest.RequestType.RESPONSE,
            payload: res,
            sessionid: userId,
            metadata: runtime.getFinalState(),
            timestamp,
            turnIDP: null,
          },
        ],
      ]);
    });

    it('empty stack', async () => {
      const responseHandler1 = sinon.stub();
      const responseHandler2 = sinon.stub();

      const services = {
        state: { saveToDb: sinon.stub() },
        utils: {
          responseHandlersDialogflowES: [responseHandler1, responseHandler2],
        },
      };

      const responseManager = new ResponseManager(services as any, null as any);

      const userId = 'user-id';
      const finalState = { random: 'runtime', storage: { user: userId } };
      const output = 'random output';

      const versionID = 'version-id';
      const storageGet = sinon.stub().returns(null);
      storageGet.withArgs(S.OUTPUT).returns(output);
      storageGet.withArgs(S.USER).returns(userId);
      const turnGet = sinon.stub();
      turnGet.withArgs(T.GOTO).returns(false).withArgs(T.DF_ES_TEXT_ENABLED).returns(true).withArgs(T.END).returns(true);

      const runtime = {
        getFinalState: sinon.stub().returns(finalState),
        stack: {
          isEmpty: sinon.stub().returns(true),
        },
        storage: {
          get: storageGet,
        },
        turn: {
          set: sinon.stub(),
          get: turnGet,
        },
        services: {
          analyticsClient: {
            track: sinon.stub().returns(true),
          },
        },
        getVersionID: sinon.stub().returns(versionID),
        getRawState: sinon.stub().returns(versionID),
      };

      const res = {
        fulfillmentText: output,
        fulfillmentMessages: [{ text: { text: [output] } }],
        endInteraction: true,
      };

      expect(await responseManager.build(runtime as any)).to.eql(res);
      const { timestamp } = runtime.services.analyticsClient.track.args[0][0];

      expect(runtime.stack.isEmpty.callCount).to.eql(1);
      expect(runtime.turn.set.args[0]).to.eql([T.END, true]);
      expect(runtime.storage.get.args).to.eql([[S.PRIOR_OUTPUT], [S.OUTPUT], [S.USER]]);
      expect(responseHandler1.args).to.eql([[runtime, res]]);
      expect(responseHandler2.args).to.eql([[runtime, res]]);
      expect(services.state.saveToDb.args[0]).to.eql([userId, finalState]);
      expect(runtime.services.analyticsClient.track.args).to.eql([
        [
          {
            id: versionID,
            event: Ingest.Event.INTERACT,
            request: Ingest.RequestType.RESPONSE,
            payload: res,
            sessionid: userId,
            metadata: runtime.getFinalState(),
            timestamp,
            turnIDP: undefined,
          },
        ],
      ]);
    });

    it('with prior', async () => {
      const responseHandler1 = sinon.stub();
      const responseHandler2 = sinon.stub();

      const services = {
        state: { saveToDb: sinon.stub() },
        utils: {
          responseHandlersDialogflowES: [responseHandler1, responseHandler2],
        },
      };

      const responseManager = new ResponseManager(services as any, null as any);

      const userId = 'user-id';
      const finalState = { random: 'runtime', storage: { user: userId } };
      const output = 'random output';
      const priorOutput = 'prior output';

      const versionID = 'version-id';
      const storageGet = sinon.stub().returns(null);
      storageGet.withArgs(S.PRIOR_OUTPUT).returns(priorOutput);
      storageGet.withArgs(S.OUTPUT).returns(output);
      storageGet.withArgs(S.USER).returns(userId);
      const turnGet = sinon.stub();

      const runtime = {
        getFinalState: sinon.stub().returns(finalState),
        stack: {
          isEmpty: sinon.stub().returns(true),
        },
        storage: {
          get: storageGet,
          set: sinon.stub(),
          delete: sinon.stub(),
        },
        turn: {
          set: sinon.stub(),
          get: turnGet,
        },
        services: {
          analyticsClient: {
            track: sinon.stub().returns(true),
          },
        },
        getVersionID: sinon.stub().returns(versionID),
        getRawState: sinon.stub().returns(versionID),
      };

      const res = {
        fulfillmentText: `${priorOutput} <speak>${output}</speak>`,
        fulfillmentMessages: [{ text: { text: [priorOutput] } }, { text: { text: [`<speak>${output}</speak>`] } }],
        endInteraction: false,
      };

      expect(await responseManager.build(runtime as any)).to.eql(res);
      const { timestamp } = runtime.services.analyticsClient.track.args[0][0];

      expect(runtime.stack.isEmpty.callCount).to.eql(1);
      expect(runtime.turn.set.args[0]).to.eql([T.END, true]);
      expect(runtime.storage.get.args).to.eql([[S.PRIOR_OUTPUT], [S.PRIOR_OUTPUT], [S.OUTPUT], [S.USER]]);
      expect(runtime.storage.delete.args).to.eql([[S.PRIOR_OUTPUT]]);
      expect(responseHandler1.args).to.eql([[runtime, res]]);
      expect(responseHandler2.args).to.eql([[runtime, res]]);
      expect(services.state.saveToDb.args[0]).to.eql([userId, finalState]);
      expect(runtime.services.analyticsClient.track.args).to.eql([
        [
          {
            id: versionID,
            event: Ingest.Event.INTERACT,
            request: Ingest.RequestType.RESPONSE,
            payload: res,
            sessionid: userId,
            metadata: runtime.getFinalState(),
            timestamp,
            turnIDP: undefined,
          },
        ],
      ]);
    });

    it('with goto', async () => {
      const responseHandler1 = sinon.stub();
      const responseHandler2 = sinon.stub();

      const services = {
        state: { saveToDb: sinon.stub() },
        utils: {
          responseHandlersDialogflowES: [responseHandler1, responseHandler2],
        },
      };

      const responseManager = new ResponseManager(services as any, null as any);

      const userId = 'user-id';
      const finalState = { random: 'runtime', storage: { user: userId } };
      const output = 'random output';

      const versionID = 'version-id';
      const storageGet = sinon.stub().returns(null);
      storageGet.withArgs(S.OUTPUT).returns(output);
      storageGet.withArgs(S.USER).returns(userId);
      const goToIntent = 'go-to-intent';
      const turnGet = sinon.stub();
      turnGet.withArgs(T.GOTO).returns(goToIntent).withArgs(T.DF_ES_TEXT_ENABLED).returns(true).withArgs(T.END).returns(true);

      const runtime = {
        getFinalState: sinon.stub().returns(finalState),
        stack: {
          isEmpty: sinon.stub().returns(true),
        },
        storage: {
          get: storageGet,
          set: sinon.stub(),
        },
        turn: {
          set: sinon.stub(),
          get: turnGet,
        },
        services: {
          analyticsClient: {
            track: sinon.stub().returns(true),
          },
        },
        getVersionID: sinon.stub().returns(versionID),
        getRawState: sinon.stub().returns(versionID),
      };

      const res = {
        fulfillmentText: output,
        fulfillmentMessages: [{ text: { text: [output] } }],
        endInteraction: true,
        followupEventInput: { name: `${goToIntent}_event` },
      };

      expect(await responseManager.build(runtime as any)).to.eql(res);
      const { timestamp } = runtime.services.analyticsClient.track.args[0][0];

      expect(runtime.stack.isEmpty.callCount).to.eql(1);
      expect(runtime.turn.set.args[0]).to.eql([T.END, true]);
      expect(runtime.storage.get.args).to.eql([[S.PRIOR_OUTPUT], [S.OUTPUT], [S.USER]]);
      expect(runtime.storage.set.args).to.eql([[S.PRIOR_OUTPUT, output]]);
      expect(responseHandler1.args).to.eql([[runtime, res]]);
      expect(responseHandler2.args).to.eql([[runtime, res]]);
      expect(services.state.saveToDb.args[0]).to.eql([userId, finalState]);
      expect(runtime.services.analyticsClient.track.args).to.eql([
        [
          {
            id: versionID,
            event: Ingest.Event.INTERACT,
            request: Ingest.RequestType.RESPONSE,
            payload: res,
            sessionid: userId,
            metadata: runtime.getFinalState(),
            timestamp,
            turnIDP: undefined,
          },
        ],
      ]);
    });

    it('voice project', async () => {
      const responseHandler1 = sinon.stub();
      const responseHandler2 = sinon.stub();

      const services = {
        state: { saveToDb: sinon.stub() },
        utils: {
          responseHandlersDialogflowES: [responseHandler1, responseHandler2],
        },
      };

      const responseManager = new ResponseManager(services as any, null as any);

      const userId = 'user-id';
      const finalState = { random: 'runtime', storage: { user: userId } };
      const output = 'random output';

      const versionID = 'version-id';
      const storageGet = sinon.stub().returns(null);
      storageGet.withArgs(S.OUTPUT).returns(output);
      storageGet.withArgs(S.USER).returns(userId);

      const runtime = {
        getFinalState: sinon.stub().returns(finalState),
        stack: {
          isEmpty: sinon.stub().returns(true),
        },
        storage: {
          get: storageGet,
        },
        turn: {
          set: sinon.stub(),
          get: sinon.stub().withArgs(T.DF_ES_TEXT_ENABLED).returns(null),
        },
        services: {
          analyticsClient: {
            track: sinon.stub().returns(true),
          },
        },
        getVersionID: sinon.stub().returns(versionID),
        getRawState: sinon.stub().returns(versionID),
      };

      const res = {
        fulfillmentText: `<speak>${output}</speak>`,
        fulfillmentMessages: [{ text: { text: [`<speak>${output}</speak>`] } }],
        endInteraction: false,
      };

      expect(await responseManager.build(runtime as any)).to.eql(res);
      const { timestamp } = runtime.services.analyticsClient.track.args[0][0];

      expect(runtime.stack.isEmpty.callCount).to.eql(1);
      expect(runtime.turn.set.args[0]).to.eql([T.END, true]);
      expect(runtime.storage.get.args).to.eql([[S.PRIOR_OUTPUT], [S.OUTPUT], [S.USER]]);
      expect(responseHandler1.args).to.eql([[runtime, res]]);
      expect(responseHandler2.args).to.eql([[runtime, res]]);
      expect(services.state.saveToDb.args[0]).to.eql([userId, finalState]);
      expect(runtime.services.analyticsClient.track.args).to.eql([
        [
          {
            id: versionID,
            event: Ingest.Event.INTERACT,
            request: Ingest.RequestType.RESPONSE,
            payload: res,
            sessionid: userId,
            metadata: runtime.getFinalState(),
            timestamp,
            turnIDP: null,
          },
        ],
      ]);
    });
  });
});
