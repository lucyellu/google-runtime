import {
  Event as IngestEvent,
  RequestType as IngestRequestType,
} from '@voiceflow/event-ingestion-service/build/lib/types';
import { expect } from 'chai';
import _ from 'lodash';
import sinon from 'sinon';

import { S, T } from '@/lib/constants';
import ResponseManager from '@/lib/services/googleV2/request/lifecycle/response';

describe('responseManager unit tests', async () => {
  afterEach(() => sinon.restore());

  describe('build', () => {
    it('no output', async () => {
      const response = { foo: 'bar' };
      const updateToken = 'update-token';
      const responseHandler1 = sinon.stub();
      const responseHandler2 = sinon.stub();

      const services = {
        state: { saveToDb: sinon.stub() },
        randomstring: { generate: sinon.stub().returns(updateToken) },
        utils: {
          responseHandlersV2: [responseHandler1, responseHandler2],
          Simple: sinon.stub().returns(response),
        },
      };

      const responseManager = new ResponseManager(services as any, null as any);

      const finalState = { random: 'runtime', platform: 'google' };
      const output = '';
      const projectID = 'project-id';
      const userId = 'user-id';
      const storageGet = sinon.stub();
      storageGet.withArgs(S.OUTPUT).returns(output);
      storageGet.withArgs(S.USER).returns(userId);

      const runtime = {
        getFinalState: sinon.stub().returns(finalState),
        stack: {
          isEmpty: sinon.stub().returns(false),
        },
        storage: {
          get: storageGet,
        },
        turn: {
          set: sinon.stub(),
          get: sinon.stub().onFirstCall().returns(false).returns(null),
        },
        services: {
          analyticsClient: {
            track: sinon.stub().returns(userId),
          },
        },
        getVersionID: sinon.stub().returns(userId),
        api: { getVersion: sinon.stub().resolves({ projectID }) },
      };

      const conv = {
        request: {},
        user: {
          params: { forceUpdateToken: '' },
        },
        add: sinon.stub(),
        session: {
          id: 'session-id',
        },
      };

      await responseManager.build(runtime as any, conv as any);
      expect(runtime.stack.isEmpty.callCount).to.eql(1);
      expect(runtime.storage.get.args).to.eql([[S.OUTPUT], [S.MODEL_VERSION], [S.USER]]);
      expect(services.utils.Simple.args[0]).to.eql([
        {
          speech: `<speak>${output}</speak>`,
          text: '🔊',
        },
      ]);
      expect(conv.add.args[0]).to.eql([response]);
      expect(responseHandler1.args).to.eql([[runtime, conv]]);
      expect(responseHandler2.args).to.eql([[runtime, conv]]);
      expect(services.state.saveToDb.args[0]).to.eql([userId, finalState]);
      expect(conv.user.params.forceUpdateToken).to.deep.eq(updateToken);
      const { timestamp } = runtime.services.analyticsClient.track.args[0][0];
      expect(runtime.services.analyticsClient.track.args).to.eql([
        [
          {
            projectID,
            versionID: userId,
            event: IngestEvent.INTERACT,
            request: IngestRequestType.RESPONSE,
            payload: response,
            sessionid: conv.session.id,
            metadata: finalState,
            timestamp,
            turnIDP: null,
          },
        ],
      ]);
    });

    it('empty stack', async () => {
      const response = { foo: 'bar' };
      const updateToken = 'update-token';
      const responseHandler1 = sinon.stub();
      const responseHandler2 = sinon.stub();

      const services = {
        state: { saveToDb: sinon.stub() },
        randomstring: { generate: sinon.stub().returns(updateToken) },
        utils: {
          responseHandlersV2: [responseHandler1, responseHandler2],
          Simple: sinon.stub().returns(response),
        },
      };

      const responseManager = new ResponseManager(services as any, null as any);

      const finalState = { random: 'runtime', platform: 'google' };
      const output = 'random output';
      const projectID = 'project-id';
      const userId = 'user-id';
      const storageGet = sinon.stub();
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
          get: sinon.stub().withArgs(T.END).returns(true),
        },
        services: {
          analyticsClient: {
            track: sinon.stub().returns(userId),
          },
        },
        getVersionID: sinon.stub().returns(userId),
        api: { getVersion: sinon.stub().resolves({ projectID }) },
      };

      const conv = {
        request: {},
        user: {
          params: { forceUpdateToken: '' },
        },
        add: sinon.stub(),
        scene: {
          next: { name: '' },
        },
        session: {
          id: 'session.id',
        },
      };

      await responseManager.build(runtime as any, conv as any);

      expect(runtime.stack.isEmpty.callCount).to.eql(1);
      expect(runtime.turn.set.args[0]).to.eql([T.END, true]);
      expect(runtime.storage.get.args).to.eql([[S.OUTPUT], [S.MODEL_VERSION], [S.USER]]);
      expect(services.utils.Simple.args[0]).to.eql([
        {
          speech: `<speak>${output}</speak>`,
          text: output,
        },
      ]);
      expect(conv.scene.next.name).to.eql('actions.scene.END_CONVERSATION');
      expect(conv.add.args[0]).to.eql([response]);
      expect(responseHandler1.args).to.eql([[runtime, conv]]);
      expect(responseHandler2.args).to.eql([[runtime, conv]]);
      expect(services.state.saveToDb.args[0]).to.eql([userId, finalState]);
      expect(conv.user.params.forceUpdateToken).to.deep.eq(updateToken);
      const { timestamp } = runtime.services.analyticsClient.track.args[0][0];
      expect(runtime.services.analyticsClient.track.args).to.eql([
        [
          {
            projectID,
            versionID: userId,
            event: IngestEvent.INTERACT,
            request: IngestRequestType.RESPONSE,
            payload: response,
            sessionid: conv.session.id,
            metadata: finalState,
            timestamp,
            turnIDP: true,
          },
        ],
      ]);
    });

    it('with goto', async () => {
      const response = { foo: 'bar' };
      const updateToken = 'update-token';
      const responseHandler1 = sinon.stub();
      const responseHandler2 = sinon.stub();

      const services = {
        state: { saveToDb: sinon.stub() },
        randomstring: { generate: sinon.stub().returns(updateToken) },
        utils: {
          responseHandlersV2: [responseHandler1, responseHandler2],
          Simple: sinon.stub().returns(response),
        },
      };

      const responseManager = new ResponseManager(services as any, null as any);

      const finalState = { random: 'runtime', platform: 'google' };
      const output = 'random output';
      const projectID = 'projcet-id';
      const userId = 'user-id';
      const storageGet = sinon.stub();
      storageGet.withArgs(S.OUTPUT).returns(output);
      storageGet.withArgs(S.USER).returns(userId);

      const turnGet = sinon.stub();
      turnGet.withArgs(T.GOTO).returns('goto_intent');
      turnGet.withArgs(T.END).returns(false);
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
            track: sinon.stub().returns(userId),
          },
        },
        getVersionID: sinon.stub().returns(userId),
        api: { getVersion: sinon.stub().resolves({ projectID }) },
      };

      const conv = {
        request: {},
        user: {
          params: { forceUpdateToken: '' },
        },
        add: sinon.stub(),
        scene: {
          next: { name: '' },
        },
        session: {
          id: 'session.id',
        },
      };

      await responseManager.build(runtime as any, conv as any);

      expect(runtime.stack.isEmpty.callCount).to.eql(1);
      expect(runtime.turn.set.args[0]).to.eql([T.END, true]);
      expect(runtime.storage.get.args).to.eql([[S.OUTPUT], [S.MODEL_VERSION], [S.USER]]);
      expect(services.utils.Simple.args[0]).to.eql([
        {
          speech: `<speak>${output}</speak>`,
          text: output,
        },
      ]);
      expect(conv.scene.next.name).to.eql('slot_filling_goto_intent');
      expect(conv.add.args[0]).to.eql([response]);
      expect(responseHandler1.args).to.eql([[runtime, conv]]);
      expect(responseHandler2.args).to.eql([[runtime, conv]]);
      expect(services.state.saveToDb.args[0]).to.eql([userId, finalState]);
      expect(conv.user.params.forceUpdateToken).to.deep.eq(updateToken);
      const { timestamp } = runtime.services.analyticsClient.track.args[0][0];
      expect(runtime.services.analyticsClient.track.args).to.eql([
        [
          {
            projectID,
            versionID: userId,
            event: IngestEvent.INTERACT,
            request: IngestRequestType.RESPONSE,
            payload: response,
            sessionid: conv.session.id,
            metadata: finalState,
            timestamp,
            turnIDP: undefined,
          },
        ],
      ]);
    });
    it('with slot filling', async () => {
      const response = { foo: 'bar' };
      const updateToken = 'update-token';
      const responseHandler1 = sinon.stub();
      const responseHandler2 = sinon.stub();

      const services = {
        state: { saveToDb: sinon.stub() },
        randomstring: { generate: sinon.stub().returns(updateToken) },
        utils: {
          responseHandlersV2: [responseHandler1, responseHandler2],
          Simple: sinon.stub().returns(response),
        },
      };

      const responseManager = new ResponseManager(services as any, null as any);

      const finalState = { random: 'runtime', platform: 'google' };
      const output = 'random output';
      const projectID = 'project-id';
      const userId = 'user-id';
      const storageGet = sinon.stub();
      storageGet.withArgs(S.OUTPUT).returns(output);
      storageGet.withArgs(S.MODEL_VERSION).returns(1);
      storageGet.withArgs(S.USER).returns(userId);

      const turnGet = sinon.stub();
      turnGet.withArgs(T.END).returns(false);
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
            track: sinon.stub().returns(userId),
          },
        },
        getVersionID: sinon.stub().returns(userId),
        api: { getVersion: sinon.stub().resolves({ projectID }) },
      };

      const conv = {
        request: {
          scene: { name: 'slot_filling_scene' },
        },
        user: {
          params: { forceUpdateToken: '' },
        },
        add: sinon.stub(),
        scene: {
          next: { name: '' },
        },
        session: {
          id: 'session.id',
        },
      };

      await responseManager.build(runtime as any, conv as any);

      expect(runtime.stack.isEmpty.callCount).to.eql(1);
      expect(runtime.turn.set.args[0]).to.eql([T.END, true]);
      expect(runtime.storage.get.args).to.eql([[S.OUTPUT], [S.MODEL_VERSION], [S.USER]]);
      expect(services.utils.Simple.args[0]).to.eql([
        {
          speech: `<speak>${output}</speak>`,
          text: output,
        },
      ]);
      expect(conv.scene.next.name).to.eql('main');
      expect(conv.add.args[0]).to.eql([response]);
      expect(responseHandler1.args).to.eql([[runtime, conv]]);
      expect(responseHandler2.args).to.eql([[runtime, conv]]);
      expect(services.state.saveToDb.args[0]).to.eql([userId, finalState]);
      expect(conv.user.params.forceUpdateToken).to.deep.eq(updateToken);
      const { timestamp } = runtime.services.analyticsClient.track.args[0][0];
      expect(runtime.services.analyticsClient.track.args).to.eql([
        [
          {
            projectID,
            versionID: userId,
            event: IngestEvent.INTERACT,
            request: IngestRequestType.RESPONSE,
            payload: response,
            sessionid: conv.session.id,
            metadata: finalState,
            timestamp,
            turnIDP: undefined,
          },
        ],
      ]);
    });
  });
});
