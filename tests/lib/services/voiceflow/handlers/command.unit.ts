import { expect } from 'chai';
import sinon from 'sinon';

import { F, S, T } from '@/lib/constants';
import DefaultCommandHandler, { CommandHandler, getCommand } from '@/lib/services/runtime/handlers/command';
import { IntentName, RequestType } from '@/lib/services/runtime/types';

describe('command handler unit tests', async () => {
  afterEach(() => sinon.restore());

  describe('getCommand', () => {
    it('no request', () => {
      const runtime = { turn: { get: sinon.stub().returns(null) } };
      expect(getCommand(runtime as any, null as any)).to.eql(null);
    });

    it('request type not intent', () => {
      const runtime = { turn: { get: sinon.stub().returns({ type: 'random type' }) } };
      expect(getCommand(runtime as any, null as any)).to.eql(null);
    });

    describe('request type intent', () => {
      it('VoiceFlowIntent', () => {
        const runtime = { turn: { get: sinon.stub().returns({ type: RequestType.INTENT, payload: { intent: IntentName.VOICEFLOW } }) } };
        expect(getCommand(runtime as any, null as any)).to.eql(null);
      });

      it('no extracted frame', () => {
        const runtime = {
          stack: { getFrames: sinon.stub().returns([]) },
          turn: { get: sinon.stub().returns({ type: RequestType.INTENT, payload: { intent: { name: 'random_intent' } } }) },
        };

        expect(getCommand(runtime as any)).to.eql(null);
      });

      it('with extracted frame', () => {
        const command = { intent: 'random_intent' };
        const frames = [
          {
            getCommands: sinon.stub().returns([command]),
          },
        ];
        const payload = { intent: 'random_intent', slots: ['slot1', 'slot2'] };
        const runtime = {
          stack: { getFrames: sinon.stub().returns(frames) },
          turn: { get: sinon.stub().returns({ type: RequestType.INTENT, payload }) },
        };
        expect(getCommand(runtime as any)).to.eql({ index: 0, command, intent: payload.intent, slots: payload.slots });
      });
    });
  });

  describe('canHandle', () => {
    it('false', () => {
      expect(CommandHandler({ getCommand: sinon.stub().returns(null) } as any).canHandle(null as any)).to.eql(false);
    });
    it('true', () => {
      expect(CommandHandler({ getCommand: sinon.stub().returns({ foo: 'bar' }) } as any).canHandle(null as any)).to.eql(true);
    });
  });

  describe('handle', () => {
    it('no command obj', () => {
      const commandHandler = CommandHandler({ getCommand: sinon.stub().returns(null) } as any);

      expect(commandHandler.handle(null as any, null as any)).to.eql(null);
    });

    it('no command', () => {
      const commandHandler = CommandHandler({ getCommand: sinon.stub().returns({}) } as any);

      const runtime = { turn: { delete: sinon.stub() } };

      expect(commandHandler.handle(runtime as any, null as any)).to.eql(null);
      expect(runtime.turn.delete.args).to.eql([[T.REQUEST]]);
    });

    describe('has command', () => {
      it('no diagram_id or next', () => {
        const commandHandler = CommandHandler({ getCommand: sinon.stub().returns({ command: {} }) } as any);

        const runtime = { turn: { delete: sinon.stub() } };

        expect(commandHandler.handle(runtime as any, null as any)).to.eql(null);
      });

      it('mappings but no slots', () => {
        const commandHandler = CommandHandler({ getCommand: sinon.stub().returns({ command: { mappings: [] } }) } as any);

        const runtime = { turn: { delete: sinon.stub() } };

        expect(commandHandler.handle(runtime as any, null as any)).to.eql(null);
      });

      it('slots but no mappings', () => {
        const commandHandler = CommandHandler({ getCommand: sinon.stub().returns({ command: { slots: {} } }) } as any);

        const runtime = { turn: { delete: sinon.stub() } };

        expect(commandHandler.handle(runtime as any, null as any)).to.eql(null);
      });

      it('mappings and slots', () => {
        const mappedSlots = { foo: 'bar' };
        const res = { slots: { slot1: 'slot_one' }, command: { mappings: [{ slot: 'slot', variable: 'variable' }] } };
        const utils = {
          mapSlots: sinon.stub().returns(mappedSlots),
          getCommand: sinon.stub().returns(res),
        };

        const commandHandler = CommandHandler(utils as any);

        const runtime = { turn: { delete: sinon.stub() } };
        const variables = { merge: sinon.stub() };

        expect(commandHandler.handle(runtime as any, variables as any)).to.eql(null);
        expect(utils.mapSlots.args).to.eql([[res.command.mappings, res.slots]]);
        expect(variables.merge.args).to.eql([[mappedSlots]]);
      });

      it('diagram_id', () => {
        const res = { command: { diagram_id: 'diagram-id' } };
        const utils = { getCommand: sinon.stub().returns(res), Frame: sinon.stub() };

        const commandHandler = CommandHandler(utils as any);

        const topFrame = { storage: { set: sinon.stub() } };
        const runtime = { stack: { push: sinon.stub(), top: sinon.stub().returns(topFrame) }, turn: { delete: sinon.stub() } };

        expect(commandHandler.handle(runtime as any, null as any)).to.eql(null);
        expect(topFrame.storage.set.args).to.eql([[F.CALLED_COMMAND, true]]);
        expect(utils.Frame.args).to.eql([[{ programID: res.command.diagram_id }]]);
        expect(runtime.stack.push.args).to.eql([[{}]]);
      });

      describe('next', () => {
        it('last frame in stack', () => {
          const stackSize = 3;

          const res = { command: { next: 'next-id', intent: 'intent' }, index: stackSize - 1 };
          const utils = { getCommand: sinon.stub().returns(res) };
          const commandHandler = CommandHandler(utils as any);

          const topFrame = { setNodeID: sinon.stub() };
          const runtime = {
            storage: { set: sinon.stub() },
            trace: { debug: sinon.stub() },
            turn: { delete: sinon.stub() },
            stack: { getSize: sinon.stub().returns(stackSize), popTo: sinon.stub(), top: sinon.stub().returns(topFrame) },
          };

          expect(commandHandler.handle(runtime as any, null as any)).to.eql(null);
          expect(runtime.trace.debug.args).to.eql([[`matched intent **${res.command.intent}** - jumping to node`]]);
          expect(topFrame.setNodeID.args).to.eql([[res.command.next]]);
          expect(runtime.stack.popTo.args).to.eql([[stackSize]]);
          expect(runtime.storage.set.args).to.eql([[S.OUTPUT, '']]);
        });

        it('not last frame', () => {
          const index = 1;
          const res = { command: { next: 'next-id', intent: 'intent' }, index };
          const utils = { getCommand: sinon.stub().returns(res) };
          const commandHandler = CommandHandler(utils as any);

          const topFrame = { setNodeID: sinon.stub() };
          const runtime = {
            trace: { debug: sinon.stub() },
            turn: { delete: sinon.stub() },
            stack: { getSize: sinon.stub().returns(3), top: sinon.stub().returns(topFrame), popTo: sinon.stub() },
          };

          expect(commandHandler.handle(runtime as any, null as any)).to.eql(null);
          expect(runtime.stack.popTo.args).to.eql([[index + 1]]);
          expect(topFrame.setNodeID.args).to.eql([[res.command.next]]);
          expect(runtime.trace.debug.args).to.eql([[`matched intent **${res.command.intent}** - jumping to node`]]);
        });

        it('intent with diagramID', () => {
          const programID = 'program-id';
          const frame = { foo: 'bar' };
          const res = { command: { next: 'next-id', intent: 'intent', diagramID: programID }, index: 1 };
          const utils = { getCommand: sinon.stub().returns(res), Frame: sinon.stub().returns(frame) };
          const commandHandler = CommandHandler(utils as any);

          const topFrame = { setNodeID: sinon.stub(), getProgramID: sinon.stub().returns('different-program-id') };
          const runtime = {
            trace: { debug: sinon.stub() },
            turn: { delete: sinon.stub() },
            stack: { getSize: sinon.stub().returns(3), top: sinon.stub().returns(topFrame), popTo: sinon.stub(), push: sinon.stub() },
          };

          expect(commandHandler.handle(runtime as any, null as any)).to.eql(null);
          expect(runtime.stack.popTo.args).to.eql([[res.index + 1]]);
          expect(topFrame.setNodeID.args).to.eql([[res.command.next]]);
          expect(utils.Frame.args).to.eql([[{ programID: res.command.diagramID }]]);
          expect(runtime.stack.push.args).to.eql([[frame]]);
          expect(runtime.trace.debug.args).to.eql([[`matched intent **${res.command.intent}** - jumping to node`]]);
        });
      });
    });
  });

  describe('generation', () => {
    it('works correctly', () => {
      const runtime = { turn: { get: sinon.stub().returns(null) } };
      expect(DefaultCommandHandler().canHandle(runtime as any)).to.eql(false);
    });
  });
});
