import { expect } from 'chai';
import sinon from 'sinon';

import { T } from '@/lib/constants';
import { CaptureV2Handler } from '@/lib/services/runtime/handlers/captureV2';
import { RequestType } from '@/lib/services/runtime/types';

describe('captureV2 handler unit tests', async () => {
  afterEach(() => sinon.restore());

  describe('canHandle', () => {
    it('false', () => {
      expect(CaptureV2Handler(null as any).canHandle({} as any, null as any, null as any, null as any)).to.eql(false);
    });

    it('true', () => {
      expect(
        CaptureV2Handler(null as any).canHandle({ type: 'captureV2' } as any, null as any, null as any, null as any)
      ).to.eql(true);
    });
  });

  describe('handle', () => {
    it('no request', () => {
      const utils = {
        addRepromptIfExists: sinon.stub(),
      };

      const captureHandler = CaptureV2Handler(utils as any);

      const block = { id: 'block-id' };
      const runtime = { turn: { get: sinon.stub().returns(null) } };
      const variables = { foo: 'bar' };

      expect(captureHandler.handle(block as any, runtime as any, variables as any, null as any)).to.eql(block.id);
      expect(utils.addRepromptIfExists.args).to.eql([[block, runtime, variables]]);
    });

    it('no request with delegation', () => {
      const utils = {
        addRepromptIfExists: sinon.stub(),
      };

      const captureHandler = CaptureV2Handler(utils as any);

      const block = { id: 'block-id', intent: { name: 'intent-name' } };
      const runtime = { turn: { get: sinon.stub().returns(null), set: sinon.stub() } };
      const variables = { foo: 'bar' };

      expect(captureHandler.handle(block as any, runtime as any, variables as any, null as any)).to.eql(block.id);
      expect(utils.addRepromptIfExists.args).to.eql([[block, runtime, variables]]);
      expect(runtime.turn.set.args).to.eql([[T.GOTO, block.intent.name]]);
    });

    it('request type not intent', () => {
      const utils = {
        addRepromptIfExists: sinon.stub(),
      };

      const captureHandler = CaptureV2Handler(utils as any);

      const block = { id: 'block-id' };
      const runtime = { turn: { get: sinon.stub().returns({ type: 'random' }) } };
      const variables = { foo: 'bar' };

      expect(captureHandler.handle(block as any, runtime as any, variables as any, null as any)).to.eql(block.id);
      expect(utils.addRepromptIfExists.args).to.eql([[block, runtime, variables]]);
    });

    describe('request type is intent', () => {
      it('command handler can handle', () => {
        const output = 'bar';

        const utils = {
          commandHandler: {
            canHandle: sinon.stub().returns(true),
            handle: sinon.stub().returns(output),
          },
        };

        const captureHandler = CaptureV2Handler(utils as any);

        const block = { id: 'block-id' };
        const runtime = { turn: { get: sinon.stub().returns({ type: RequestType.INTENT }) } };
        const variables = { foo: 'bar' };

        expect(captureHandler.handle(block as any, runtime as any, variables as any, null as any)).to.eql(output);
        expect(utils.commandHandler.canHandle.args).to.eql([[runtime]]);
        expect(utils.commandHandler.handle.args).to.eql([[runtime, variables]]);
      });

      describe('command cant handle', () => {
        it('no match', () => {
          const utils = {
            commandHandler: {
              canHandle: sinon.stub().returns(false),
            },
            noMatchHandler: { handle: sinon.stub().returns('no-match-path') },
            noInputHandler: { canHandle: () => false },
          };

          const captureHandler = CaptureV2Handler(utils as any);

          const node = { nextId: 'next-id', intent: {} };
          const request = { type: RequestType.INTENT, payload: { intent: { name: 'random', slots: [] } } };
          const runtime = { turn: { get: sinon.stub().returns(request), delete: sinon.stub() } };
          const variables = { foo: 'bar' };

          expect(captureHandler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(
            'no-match-path'
          );
          expect(utils.noMatchHandler.handle.args).to.eql([[node, runtime, variables]]);
        });

        it('no match with delegation', () => {
          const nodeID = 'node-id';
          const utils = {
            commandHandler: {
              canHandle: sinon.stub().returns(false),
            },
            noMatchHandler: { handle: sinon.stub().returns(nodeID) },
            noInputHandler: { canHandle: () => false },
          };

          const captureHandler = CaptureV2Handler(utils as any);

          const slotName = 'slot1';
          const node = { id: nodeID, nextId: 'next-id', intent: { name: 'intent-name', entities: [slotName] } };
          const request = { type: RequestType.INTENT, payload: { intent: {} } };
          const runtime = { turn: { get: sinon.stub().returns(request), set: sinon.stub(), delete: sinon.stub() } };
          const variables = { foo: 'bar' };

          expect(captureHandler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(nodeID);
          expect(utils.noMatchHandler.handle.args).to.eql([[node, runtime, variables]]);
          expect(runtime.turn.set.args).to.eql([[T.GOTO, node.intent.name]]);
        });

        describe('match intent', () => {
          it('query variable', () => {
            const utils = {
              commandHandler: {
                canHandle: sinon.stub().returns(false),
              },
              noInputHandler: { canHandle: sinon.stub().returns(false) },
            };

            const captureHandler = CaptureV2Handler(utils as any);

            const node = { nextId: 'next-id', variable: 'var1', intent: {} };
            const request = {
              type: RequestType.INTENT,
              payload: { input: 'query-value', intent: 'intent1' },
            };
            const runtime = { turn: { get: sinon.stub().returns(request), delete: sinon.stub() } };
            const variables = { set: sinon.stub() };

            expect(captureHandler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(
              node.nextId
            );
            expect(runtime.turn.delete.args).to.eql([[T.REQUEST]]);
            expect(variables.set.args).to.eql([['var1', 'query-value']]);
          });
        });

        it('maps intent slots', () => {
          const utils = {
            commandHandler: {
              canHandle: sinon.stub().returns(false),
            },
            noInputHandler: { canHandle: sinon.stub().returns(false) },
          };

          const captureHandler = CaptureV2Handler(utils as any);

          const slotID = 'slot_one';
          const slotID2 = 'slot_two';
          const slotID3 = 'slot_three';
          const node = { nextId: 'next-id', intent: { name: 'intent-name', entities: [slotID, slotID2] } };
          const request = {
            type: RequestType.INTENT,
            payload: {
              intent: 'intent-name',
              slots: {
                [slotID]: 'slot-value',
                [slotID3]: 'slot-value3',
              },
            },
          };
          const runtime = { turn: { get: sinon.stub().returns(request), delete: sinon.stub() } };
          const variables = { merge: sinon.stub() };

          expect(captureHandler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(node.nextId);
          expect(runtime.turn.delete.args).to.eql([[T.REQUEST]]);
          expect(variables.merge.args).to.eql([[{ [slotID]: 'slot-value' }]]);
        });
      });
    });
  });
});
