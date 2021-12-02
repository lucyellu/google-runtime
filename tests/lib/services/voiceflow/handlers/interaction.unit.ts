/* eslint-disable max-nested-callbacks */
import { expect } from 'chai';
import sinon from 'sinon';

import { S, T } from '@/lib/constants';
import DefaultInteractionHandler, { InteractionHandler } from '@/lib/services/runtime/handlers/interaction';
import { RequestType } from '@/lib/services/runtime/types';

describe('interaction handler unit tests', async () => {
  afterEach(() => sinon.restore());

  describe('canHandle', () => {
    it('false', async () => {
      expect(DefaultInteractionHandler().canHandle({} as any, null as any, null as any, null as any)).to.eql(false);
    });

    it('true', async () => {
      expect(DefaultInteractionHandler().canHandle({ interactions: { foo: 'bar' } } as any, null as any, null as any, null as any)).to.eql(true);
    });
  });

  describe('handle', () => {
    it('no request', () => {
      const utils = {
        addRepromptIfExists: sinon.stub(),
        addChipsIfExists: sinon.stub(),
      };

      const interactionHandler = InteractionHandler(utils as any);

      const block = { id: 'block-id' };
      const runtime = { turn: { get: sinon.stub().returns(null) }, storage: { delete: sinon.stub() } };
      const variables = { foo: 'bar' };

      expect(interactionHandler.handle(block as any, runtime as any, variables as any, null as any)).to.eql(block.id);
      expect(utils.addRepromptIfExists.args).to.eql([[block, runtime, variables]]);
      expect(utils.addChipsIfExists.args).to.eql([[block, runtime, variables]]);
      expect(runtime.storage.delete.args).to.eql([[S.REPROMPT], [S.NO_MATCHES_COUNTER], [S.NO_INPUTS_COUNTER]]);
    });

    it('request type not intent', () => {
      const utils = {
        addRepromptIfExists: sinon.stub(),
        addChipsIfExists: sinon.stub(),
      };

      const captureHandler = InteractionHandler(utils as any);

      const block = { id: 'block-id' };
      const runtime = { turn: { get: sinon.stub().returns({ type: 'random' }) }, storage: { delete: sinon.stub() } };
      const variables = { foo: 'bar' };

      expect(captureHandler.handle(block as any, runtime as any, variables as any, null as any)).to.eql(block.id);
      expect(utils.addRepromptIfExists.args).to.eql([[block, runtime, variables]]);
      expect(utils.addChipsIfExists.args).to.eql([[block, runtime, variables]]);
      expect(runtime.storage.delete.args).to.eql([[S.REPROMPT], [S.NO_MATCHES_COUNTER], [S.NO_INPUTS_COUNTER]]);
    });

    describe('request type is intent', () => {
      describe('button match', () => {
        it('PATH', async () => {
          const buttonName = 'button_name';
          const utils = {
            replaceIDVariables: sinon.stub().returns(buttonName),
          };

          const interactionHandler = InteractionHandler(utils as any);

          const block = {
            id: 'block-id',
            interactions: [],
            buttons: [{ name: '' }, { type: 'PATH', name: '{button_name_var}', nextID: 'next-id' }, { name: '' }],
          };
          const request = { type: RequestType.INTENT, payload: { input: buttonName } };
          const runtime = { turn: { get: sinon.stub().returns(request), delete: sinon.stub() }, storage: { delete: sinon.stub() } };
          const variablesState = { foo: 'bar' };
          const variables = { getState: sinon.stub().returns(variablesState) };

          expect(interactionHandler.handle(block as any, runtime as any, variables as any, null as any)).to.eql(block.buttons[1].nextID);
          expect(utils.replaceIDVariables.args).to.eql([
            [block.buttons[0].name, variablesState],
            [block.buttons[1].name, variablesState],
            [block.buttons[2].name, variablesState],
          ]);
          expect(runtime.turn.delete.args).to.eql([[T.REQUEST]]);
        });

        it('INTENT_PATH', async () => {
          const buttonName = 'button_name';
          const utils = {
            replaceIDVariables: sinon.stub().returns(buttonName),
          };

          const interactionHandler = InteractionHandler(utils as any);

          const block = {
            id: 'block-id',
            interactions: [],
            buttons: [{ name: '' }, { type: 'INTENT_PATH', name: '{button_name_var}', nextID: 'next-id' }, { name: '' }],
          };
          const request = { type: RequestType.INTENT, payload: { input: buttonName } };
          const runtime = { turn: { get: sinon.stub().returns(request), delete: sinon.stub() }, storage: { delete: sinon.stub() } };
          const variablesState = { foo: 'bar' };
          const variables = { getState: sinon.stub().returns(variablesState) };

          expect(interactionHandler.handle(block as any, runtime as any, variables as any, null as any)).to.eql(block.buttons[1].nextID);
          expect(utils.replaceIDVariables.args).to.eql([
            [block.buttons[0].name, variablesState],
            [block.buttons[1].name, variablesState],
            [block.buttons[2].name, variablesState],
          ]);
          expect(runtime.turn.delete.args).to.eql([[T.REQUEST]]);
        });

        it('INTENT', async () => {
          const intentName = 'random-intent';

          // const utils = {
          //   commandHandler: {
          //     canHandle: sinon.stub().returns(false),
          //   },
          //   noMatchHandler: {
          //     canHandle: sinon.stub().returns(false),
          //   },
          // };

          /// /////
          const output = 'next-id';
          const buttonName = 'button_name';
          const utils = {
            replaceIDVariables: sinon.stub().returns(buttonName),
            commandHandler: {
              canHandle: sinon.stub().returns(true),
              handle: sinon.stub().returns(output),
            },
          };

          const interactionHandler = InteractionHandler(utils as any);

          const block = {
            id: 'block-id',
            interactions: [],
            buttons: [{ name: '' }, { type: 'INTENT', name: '{button_name_var}', intentName }, { name: '' }],
          };
          const request = { type: RequestType.INTENT, payload: { input: buttonName } };
          const runtime = {
            turn: { get: sinon.stub().returns(request), set: sinon.stub() },
            storage: { delete: sinon.stub() },
          };
          const variablesState = { foo: 'bar' };
          const variables = { getState: sinon.stub().returns(variablesState) };

          expect(interactionHandler.handle(block as any, runtime as any, variables as any, null as any)).to.eql(output);
          expect(utils.replaceIDVariables.args).to.eql([
            [block.buttons[0].name, variablesState],
            [block.buttons[1].name, variablesState],
            [block.buttons[2].name, variablesState],
          ]);
          expect(runtime.turn.set.args).to.eql([[T.REQUEST, { ...request, payload: { ...request.payload, intent: block.buttons[1].intentName } }]]);
        });
      });

      it('command handler can handle', () => {
        const output = 'bar';

        const utils = {
          replaceIDVariables: sinon.stub().returns(''),
          commandHandler: {
            canHandle: sinon.stub().returns(true),
            handle: sinon.stub().returns(output),
          },
        };

        const interactionHandler = InteractionHandler(utils as any);

        const block = { id: 'block-id', interactions: [], buttons: [{ name: 'button-name' }] };
        const runtime = { turn: { get: sinon.stub().returns({ type: RequestType.INTENT, payload: {} }) } };
        const variables = { getState: sinon.stub().returns({ foo: 'bar' }) };

        expect(interactionHandler.handle(block as any, runtime as any, variables as any, null as any)).to.eql(output);
        expect(utils.commandHandler.canHandle.args).to.eql([[runtime]]);
        expect(utils.commandHandler.handle.args).to.eql([[runtime, variables]]);
      });

      describe('command cant handle', () => {
        it('no choice', () => {
          const utils = {
            commandHandler: {
              canHandle: sinon.stub().returns(false),
            },
            noMatchHandler: {
              handle: sinon.stub().returns(null),
            },
          };

          const interactionHandler = InteractionHandler(utils as any);

          const block = { id: 'block-id', interactions: [{ intent: 'intent1' }, { intent: 'intent2' }] };
          const request = { type: RequestType.INTENT, payload: { intent: 'random-intent' } };
          const runtime = { turn: { get: sinon.stub().returns(request), delete: sinon.stub() }, storage: { delete: sinon.stub() } };
          const variables = { foo: 'bar' };

          expect(interactionHandler.handle(block as any, runtime as any, variables as any, null as any)).to.eql(null);
          expect(runtime.turn.delete.args).to.eql([[T.REQUEST]]);
        });

        it('no choice with elseId', () => {
          const utils = {
            commandHandler: {
              canHandle: sinon.stub().returns(false),
            },
            noMatchHandler: {
              handle: sinon.stub().returns('else-id'),
            },
          };

          const interactionHandler = InteractionHandler(utils as any);

          const block = { id: 'block-id', interactions: [{ intent: 'intent1' }, { intent: 'intent2' }] };
          const request = { type: RequestType.INTENT, payload: { intent: 'random-intent' } };
          const runtime = { turn: { get: sinon.stub().returns(request), delete: sinon.stub() }, storage: { delete: sinon.stub() } };
          const variables = { foo: 'bar' };

          expect(interactionHandler.handle(block as any, runtime as any, variables as any, null as any)).to.eql('else-id');
        });

        it('no choice with noMatches', () => {
          const nextId = 'next-id';
          const noMatches = ['speak1', 'speak2', 'speak3'];

          const utils = {
            commandHandler: {
              canHandle: sinon.stub().returns(false),
            },
            noMatchHandler: {
              canHandle: sinon.stub().returns(true),
              handle: sinon.stub().returns(nextId),
            },
          };

          const interactionHandler = InteractionHandler(utils as any);

          const block = {
            id: 'block-id',
            interactions: [{ intent: 'intent1' }, { intent: 'intent2' }],
            noMatches,
          };
          const request = { type: RequestType.INTENT, payload: { intent: { name: 'random-intent' } } };
          const runtime = { turn: { get: sinon.stub().returns(request), delete: sinon.stub() } };
          const variables = { foo: 'bar' };

          expect(interactionHandler.handle(block as any, runtime as any, variables as any, null as any)).to.eql(nextId);
          expect(runtime.turn.delete.args).to.eql([[T.REQUEST]]);
          expect(utils.noMatchHandler.handle.args).to.eql([[block, runtime, variables]]);
        });

        it('choice without mappings', () => {
          const intentName = 'random-intent';

          const utils = {
            commandHandler: {
              canHandle: sinon.stub().returns(false),
            },
            noMatchHandler: {
              canHandle: sinon.stub().returns(false),
            },
          };

          const interactionHandler = InteractionHandler(utils as any);

          const block = { id: 'block-id', elseId: 'else-id', interactions: [{ intent: 'random-intent' }], nextIds: ['id-one'] };
          const request = { type: RequestType.INTENT, payload: { intent: intentName } };
          const runtime = { turn: { get: sinon.stub().returns(request), delete: sinon.stub() }, storage: { delete: sinon.stub() } };
          const variables = { foo: 'bar' };

          expect(interactionHandler.handle(block as any, runtime as any, variables as any, null as any)).to.eql(block.nextIds[0]);
        });

        it('choice without mappings but nextIdIndex', () => {
          const intentName = 'random-intent';

          const utils = {
            commandHandler: {
              canHandle: sinon.stub().returns(false),
            },
            noMatchHandler: {
              canHandle: sinon.stub().returns(false),
            },
          };

          const interactionHandler = InteractionHandler(utils as any);

          const block = {
            id: 'block-id',
            elseId: 'else-id',
            interactions: [{ intent: 'random-intent', nextIdIndex: 1 }],
            nextIds: ['id-one', 'id-two'],
          };
          const request = { type: RequestType.INTENT, payload: { intent: intentName } };
          const runtime = { turn: { get: sinon.stub().returns(request), delete: sinon.stub() }, storage: { delete: sinon.stub() } };
          const variables = { foo: 'bar' };

          expect(interactionHandler.handle(block as any, runtime as any, variables as any, null as any)).to.eql(block.nextIds[1]);
        });

        it('goto choice', () => {
          const intentName = 'random-intent';

          const utils = {
            commandHandler: {
              canHandle: sinon.stub().returns(false),
            },
            noMatchHandler: {
              canHandle: sinon.stub().returns(false),
            },
          };

          const interactionHandler = InteractionHandler(utils as any);

          const block = {
            id: 'block-id',
            elseId: 'else-id',
            interactions: [{ intent: 'random-intent', goTo: { intentName: 'go-to-intent' } }],
            nextIds: ['id-one', 'id-two'],
          };
          const request = { type: RequestType.INTENT, payload: { intent: intentName } };
          const runtime = {
            turn: { get: sinon.stub().returns(request), delete: sinon.stub(), set: sinon.stub().resolves() },
            storage: { delete: sinon.stub() },
          };
          const variables = { foo: 'bar' };

          expect(interactionHandler.handle(block as any, runtime as any, variables as any, null as any)).to.eql(block.id);
          expect(runtime.turn.set.args).to.eql([[T.GOTO, 'go-to-intent']]);
        });

        it('choice with mappings', () => {
          const intentName = 'random-intent';
          const mappedSlots = { slot1: 'slot-1' };

          const utils = {
            commandHandler: {
              canHandle: sinon.stub().returns(false),
            },
            noMatchHandler: {
              canHandle: sinon.stub().returns(false),
            },
            mapSlots: sinon.stub().returns(mappedSlots),
          };

          const interactionHandler = InteractionHandler(utils as any);

          const block = {
            id: 'block-id',
            elseId: 'else-id',
            interactions: [{ intent: 'random-intent', mappings: { foo: 'bar' } }],
            nextIds: ['id-one'],
          };
          const request = { type: RequestType.INTENT, payload: { intent: intentName, slots: { foo2: 'bar2' } } };
          const runtime = { turn: { get: sinon.stub().returns(request), delete: sinon.stub() }, storage: { delete: sinon.stub() } };
          const variables = { merge: sinon.stub() };

          expect(interactionHandler.handle(block as any, runtime as any, variables as any, null as any)).to.eql(block.nextIds[0]);
          expect(utils.mapSlots.args).to.eql([[block.interactions[0].mappings, request.payload.slots]]);
          expect(variables.merge.args).to.eql([[mappedSlots]]);
        });

        describe('v2', () => {
          it('no noInput', async () => {
            const utils = {
              commandHandler: {
                canHandle: sinon.stub().returns(false),
              },
              noMatchHandler: {
                handle: sinon.stub().returns('else-id'),
              },
              noInputHandler: {
                canHandle: sinon.stub().returns(false),
              },
              v: 'v2',
            };

            const interactionHandler = InteractionHandler(utils as any);

            const block = { id: 'block-id', interactions: [{ intent: 'intent1' }, { intent: 'intent2' }] };
            const request = { type: RequestType.INTENT, payload: { intent: 'random-intent' } };
            const runtime = { turn: { get: sinon.stub().returns(request), delete: sinon.stub() }, storage: { delete: sinon.stub() } };
            const variables = { foo: 'bar' };

            expect(interactionHandler.handle(block as any, runtime as any, variables as any, null as any)).to.eql('else-id');
          });

          it('with noInput', async () => {
            const nextId = 'next-id';
            const utils = {
              commandHandler: {
                canHandle: sinon.stub().returns(false),
              },
              noMatchHandler: {
                handle: sinon.stub().returns(false),
              },
              noInputHandler: {
                canHandle: sinon.stub().returns(true),
                handle: sinon.stub().returns(nextId),
              },
              v: 'v2',
            };

            const interactionHandler = InteractionHandler(utils as any);

            const block = { id: 'block-id', elseId: 'else-id', interactions: [{ intent: 'intent1' }, { intent: 'intent2' }] };
            const request = { type: RequestType.INTENT, payload: { intent: 'random-intent' } };
            const runtime = { turn: { get: sinon.stub().returns(request), delete: sinon.stub() }, storage: { delete: sinon.stub() } };
            const variables = { foo: 'bar' };

            expect(interactionHandler.handle(block as any, runtime as any, variables as any, null as any)).to.eql(nextId);
          });
        });
      });
    });
  });
});
