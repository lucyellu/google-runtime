import {
  Event as IngestEvent,
  RequestType as IngestRequestType,
} from '@voiceflow/event-ingestion-service/build/lib/types';
import { expect } from 'chai';
import sinon from 'sinon';

import { T, V } from '@/lib/constants';
import HandlerManager from '@/lib/services/googleV2/request';
import { RequestType } from '@/lib/services/runtime/types';

describe('handlerManager unit tests', async () => {
  let clock: sinon.SinonFakeTimers;

  beforeEach(() => {
    clock = sinon.useFakeTimers(Date.now()); // fake Date.now
  });
  afterEach(() => {
    clock.restore(); // restore Date.now
    sinon.restore();
  });

  describe('_extractSlots', () => {
    describe('slot filling', () => {
      it('without slots', () => {
        const conv = {
          request: { handler: { originalName: 'slot_filling_travel_intent' } },
          scene: {},
        };

        const handlerManager = new HandlerManager({} as any, null as any);
        expect(handlerManager._extractSlots(conv as any)).to.eql({});
      });

      it('with slots', () => {
        const conv = {
          request: { handler: { originalName: 'slot_filling_travel_intent' } },
          scene: {
            slots: {
              slotone: {
                value: 'one',
              },
              slottwo: {
                value: 'two',
              },
            },
          },
        };

        const handlerManager = new HandlerManager({} as any, null as any);
        expect(handlerManager._extractSlots(conv as any)).to.eql({ slotone: 'one', slottwo: 'two' });
      });
    });

    describe('intent matching', () => {
      it('without slots', () => {
        const conv = {
          request: { handler: { originalName: 'main' } },
          intent: {},
        };

        const handlerManager = new HandlerManager({} as any, null as any);
        expect(handlerManager._extractSlots(conv as any)).to.eql({});
      });

      it('with slots', () => {
        const conv = {
          request: { handler: { originalName: 'main' } },
          intent: {
            params: {
              slotone: {
                resolved: 'one',
              },
              slottwo: {
                resolved: 'two',
              },
            },
          },
        };

        const handlerManager = new HandlerManager({} as any, null as any);
        expect(handlerManager._extractSlots(conv as any)).to.eql({ slotone: 'one', slottwo: 'two' });
      });
    });
  });

  describe('handle', () => {
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
        initialize: {
          build: sinon.stub(),
        },
        runtimeBuild: {
          build: sinon.stub().returns(stateObj),
        },
        response: {
          build: sinon.stub(),
        },
      };

      const conv = {
        intent: { name: 'actions.intent.MAIN', query: 'input raw' },
        scene: { slots: {} },
        request: {
          versionID: 'version-id',
        },
        user: {
          params: {
            userId: 'user-id',
          },
        },
        session: {
          id: 'session-id',
        },
      };

      const handlerManager = new HandlerManager(services as any, null as any);
      handlerManager._extractSlots = sinon.stub().returns({});

      await handlerManager.handle(conv as any);
      const request = {
        payload: {
          input: 'input raw',
          intent: 'actions.intent.MAIN',
          slots: {},
        },
        type: 'INTENT',
      };
      const { timestamp } = stateObj.services.analyticsClient.track.args[0][0];

      expect(services.runtimeBuild.build.args[0]).to.eql([conv.request.versionID, conv.user.params.userId]);
      expect(services.initialize.build.args[0]).to.eql([stateObj, conv]);
      expect(stateObj.variables.set.args).to.eql([[V.TIMESTAMP, Math.floor(clock.now / 1000)]]);
      expect(stateObj.update.callCount).to.eql(1);
      expect(services.response.build.args[0]).to.eql([stateObj, conv]);
      expect(stateObj.services.analyticsClient.track.args).to.eql([
        [
          {
            projectID,
            versionID,
            event: IngestEvent.TURN,
            request: IngestRequestType.LAUNCH,
            payload: request,
            sessionid: conv.session.id,
            metadata: { versionID, platform: 'google' },
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
        initialize: {
          build: sinon.stub(),
        },
        runtimeBuild: {
          build: sinon.stub().returns(stateObj),
        },
        response: {
          build: sinon.stub(),
        },
      };

      const conv = {
        intent: { name: 'Default Welcome Intent', query: 'input raw' },
        scene: {},
        request: {
          versionID: 'version-id',
        },
        user: {
          params: {
            userId: 'user-id',
          },
        },
        session: {
          id: 'session-id',
        },
      };

      const handlerManager = new HandlerManager(services as any, null as any);
      handlerManager._extractSlots = sinon.stub().returns({});

      await handlerManager.handle(conv as any);
      const request = {
        payload: {
          input: 'input raw',
          intent: 'Default Welcome Intent',
          slots: {},
        },
        type: 'INTENT',
      };
      const { timestamp } = stateObj.services.analyticsClient.track.args[0][0];

      expect(services.runtimeBuild.build.args[0]).to.eql([conv.request.versionID, conv.user.params.userId]);
      expect(services.initialize.build.args[0]).to.eql([stateObj, conv]);
      expect(stateObj.variables.set.args).to.eql([[V.TIMESTAMP, Math.floor(clock.now / 1000)]]);
      expect(stateObj.update.callCount).to.eql(1);
      expect(services.response.build.args[0]).to.eql([stateObj, conv]);
      expect(stateObj.services.analyticsClient.track.args).to.eql([
        [
          {
            projectID,
            versionID,
            event: IngestEvent.TURN,
            request: IngestRequestType.LAUNCH,
            payload: request,
            sessionid: conv.session.id,
            metadata: { versionID, platform: 'google' },
            timestamp,
          },
        ],
      ]);
    });

    it('stack empty', async () => {
      const projectID = 'project-id';
      const versionID = 'version-id';
      const stateObj = {
        stack: {
          isEmpty: sinon.stub().returns(true),
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
        initialize: {
          build: sinon.stub(),
        },
        runtimeBuild: {
          build: sinon.stub().returns(stateObj),
        },
        response: {
          build: sinon.stub(),
        },
      };

      const conv = {
        intent: { name: 'random intent', query: 'input raw' },
        scene: { slots: {} },
        request: {
          versionID: 'version-id',
        },
        user: {
          params: {
            userId: 'user-id',
          },
        },
        session: {
          id: 'session-id',
        },
      };
      const request = {
        payload: {
          input: 'input raw',
          intent: 'random intent',
          slots: {},
        },
        type: 'INTENT',
      };

      const handlerManager = new HandlerManager(services as any, null as any);
      handlerManager._extractSlots = sinon.stub().returns({});

      await handlerManager.handle(conv as any);
      const { timestamp } = stateObj.services.analyticsClient.track.args[0][0];

      expect(services.runtimeBuild.build.args[0]).to.eql([conv.request.versionID, conv.user.params.userId]);
      expect(services.initialize.build.args[0]).to.eql([stateObj, conv]);
      expect(stateObj.variables.set.args).to.eql([[V.TIMESTAMP, Math.floor(clock.now / 1000)]]);
      expect(stateObj.update.callCount).to.eql(1);
      expect(services.response.build.args[0]).to.eql([stateObj, conv]);
      expect(stateObj.services.analyticsClient.track.args).to.eql([
        [
          {
            projectID,
            versionID,
            event: IngestEvent.TURN,
            request: IngestRequestType.LAUNCH,
            payload: request,
            sessionid: conv.session.id,
            metadata: { versionID, platform: 'google' },
            timestamp,
          },
        ],
      ]);
    });

    describe('existing session', () => {
      it('intent', async () => {
        const projectID = 'project.id';
        const versionID = 'version.id';
        const stateObj = {
          stack: {
            isEmpty: sinon.stub().returns(false),
          },
          variables: {
            set: sinon.stub(),
          },
          update: sinon.stub(),
          turn: {
            set: sinon.stub(),
          },
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
          initialize: {
            build: sinon.stub(),
          },
          runtimeBuild: {
            build: sinon.stub().returns(stateObj),
          },
          response: {
            build: sinon.stub(),
          },
        };

        const conv = {
          intent: { name: 'random intent', query: 'input raw' },
          scene: { slots: {} },
          request: {
            versionID: 'version-id',
          },
          add: sinon.stub(),
          user: {
            params: {
              userId: 'user-id',
            },
          },
          session: {
            id: 'session-id',
          },
        };

        const slots = { slot1: 'slot_one', slot2: 'slot_two' };
        const request = {
          payload: {
            input: 'input raw',
            intent: 'random intent',
            slots: {
              slot1: 'slot_one',
              slot2: 'slot_two',
            },
          },
          type: 'INTENT',
        };

        const handlerManager = new HandlerManager(services as any, null as any);
        handlerManager._extractSlots = sinon.stub().returns(slots);

        await handlerManager.handle(conv as any);
        const { timestamp } = stateObj.services.analyticsClient.track.args[0][0];

        expect(services.runtimeBuild.build.args[0]).to.eql([conv.request.versionID, conv.user.params.userId]);
        expect(stateObj.services.analyticsClient.track.args).to.eql([
          [
            {
              projectID,
              versionID,
              event: IngestEvent.TURN,
              request: IngestRequestType.REQUEST,
              payload: request,
              sessionid: conv.session.id,
              metadata: { versionID, platform: 'google' },
              timestamp,
            },
          ],
        ]);
        expect(stateObj.turn.set.args[0]).to.eql([
          T.REQUEST,
          {
            type: RequestType.INTENT,
            payload: {
              intent: conv.intent.name,
              input: conv.intent.query,
              slots,
            },
          },
        ]);
        expect(stateObj.variables.set.args).to.eql([[V.TIMESTAMP, Math.floor(clock.now / 1000)]]);
        expect(stateObj.update.callCount).to.eql(1);
        expect(services.response.build.args[0]).to.eql([stateObj, conv]);
      });

      it('media status', async () => {
        const projectID = 'project.id';
        const versionID = 'version.id';
        const stateObj = {
          stack: {
            isEmpty: sinon.stub().returns(false),
          },
          variables: {
            set: sinon.stub(),
          },
          update: sinon.stub(),
          turn: {
            set: sinon.stub(),
          },
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
          runtimeBuild: {
            build: sinon.stub().returns(stateObj),
          },
          response: {
            build: sinon.stub(),
          },
        };

        const conv = {
          intent: { name: 'actions.intent.MEDIA_STATUS_FINISHED', query: 'input raw' },
          scene: { slots: {} },
          request: {
            versionID: 'version-id',
          },
          user: {
            params: {
              userId: 'user-id',
            },
          },
          session: {
            id: 'session-id',
          },
        };

        const request = {
          payload: {
            input: 'input raw',
            intent: 'actions.intent.MEDIA_STATUS_FINISHED',
            slots: {},
          },
          type: 'MEDIA_STATUS',
        };

        const handlerManager = new HandlerManager(services as any, null as any);
        handlerManager._extractSlots = sinon.stub().returns({});

        await handlerManager.handle(conv as any);
        const { timestamp } = stateObj.services.analyticsClient.track.args[0][0];

        expect(stateObj.services.analyticsClient.track.args).to.eql([
          [
            {
              projectID,
              versionID,
              event: IngestEvent.TURN,
              request: IngestRequestType.REQUEST,
              payload: request,
              sessionid: conv.session.id,
              metadata: { versionID, platform: 'google' },
              timestamp,
            },
          ],
        ]);

        expect(stateObj.turn.set.args[0]).to.eql([
          T.REQUEST,
          {
            type: RequestType.MEDIA_STATUS,
            payload: {
              intent: conv.intent.name,
              input: conv.intent.query,
              slots: {},
            },
          },
        ]);
      });
    });
  });
});
