import { expect } from 'chai';
import sinon from 'sinon';

import { S } from '@/lib/constants';
import { NoMatchHandler } from '@/lib/services/runtime/handlers/noMatch';

describe('noMatch handler unit tests', () => {
  describe('handle', () => {
    it('next id', () => {
      const node = {
        id: 'node-id',
        noMatch: {
          nodeID: 'next-id',
          prompts: ['a', 'b'],
        },
      };
      const runtime = {
        storage: {
          delete: sinon.stub(),
          get: sinon.stub().returns(2),
        },
      };

      const noMatchHandler = NoMatchHandler();
      expect(noMatchHandler.handle(node as any, runtime as any, {} as any)).to.eql(node.noMatch.nodeID);
    });

    it('with old noMatch format', () => {
      const node = {
        id: 'node-id',
        noMatches: ['the counter is {counter}'],
      };
      const runtime = {
        storage: {
          produce: sinon.stub(),
          set: sinon.stub(),
          get: sinon.stub().returns(0),
        },
      };
      const variables = {
        getState: sinon.stub().returns({ counter: 5.2345 }),
      };

      const noMatchHandler = NoMatchHandler();
      expect(noMatchHandler.handle(node as any, runtime as any, variables as any)).to.eql(node.id);

      expect(runtime.storage.set.args).to.eql([[S.NO_MATCHES_COUNTER, 1]]);

      // adds output
      const cb2 = runtime.storage.produce.args[0][0];
      const draft3 = { [S.OUTPUT]: 'msg: ' };
      cb2(draft3);
      expect(draft3).to.eql({ [S.OUTPUT]: 'msg: the counter is 5.23' });
    });

    it('with new noMatch format', () => {
      const node = {
        id: 'node-id',
        noMatch: {
          prompts: ['the counter is {counter}'],
        },
      };
      const runtime = {
        storage: {
          set: sinon.stub(),
          produce: sinon.stub(),
          get: sinon.stub().returns(null),
        },
      };
      const variables = {
        getState: sinon.stub().returns({ counter: 5.2345 }),
      };

      const noMatchHandler = NoMatchHandler();
      expect(noMatchHandler.handle(node as any, runtime as any, variables as any)).to.eql(node.id);

      expect(runtime.storage.set.args).to.eql([[S.NO_MATCHES_COUNTER, 1]]);

      // adds output
      const cb2 = runtime.storage.produce.args[0][0];
      const draft3 = { [S.OUTPUT]: 'msg: ' };
      cb2(draft3);
      expect(draft3).to.eql({ [S.OUTPUT]: 'msg: the counter is 5.23' });
    });

    it('without noMatch', () => {
      const node = {
        id: 'node-id',
      };
      const runtime = {
        storage: {
          set: sinon.stub(),
          delete: sinon.stub(),
          get: sinon.stub(),
        },
      };
      const variables = {
        getState: sinon.stub().returns({}),
      };

      const noMatchHandler = NoMatchHandler();
      expect(noMatchHandler.handle(node as any, runtime as any, variables as any)).to.eql(null);
    });

    it('with choices', () => {
      const node = {
        id: 'node-id',
        interactions: [{ intent: 'address_intent' }, { intent: 'phone_number_intent' }],
      };
      const runtime = {
        storage: {
          set: sinon.stub(),
          delete: sinon.stub(),
          get: sinon.stub().returns(0),
        },
      };
      const variables = {
        getState: sinon.stub().returns({}),
      };

      const noMatchHandler = NoMatchHandler();
      expect(noMatchHandler.handle(node as any, runtime as any, variables as any)).to.eql(null);
    });

    it('with noMatch randomized', () => {
      const node = {
        id: 'node-id',
        noMatch: {
          prompts: ['A', 'B', 'C'],
          randomize: true,
        },
      };
      const runtime = {
        storage: {
          set: sinon.stub(),
          produce: sinon.stub(),
          get: sinon.stub().returns(0),
        },
      };
      const variables = {
        getState: sinon.stub().returns({}),
      };

      const noMatchHandler = NoMatchHandler();
      expect(noMatchHandler.handle(node as any, runtime as any, variables as any)).to.eql(node.id);

      // adds output
      const cb2 = runtime.storage.produce.args[0][0];
      const draft3 = { [S.OUTPUT]: '' };
      cb2(draft3);

      expect(node.noMatch.prompts.includes(draft3[S.OUTPUT])).to.eql(true);
    });
  });
});
