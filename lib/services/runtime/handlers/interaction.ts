import { Models } from '@voiceflow/base-types';
import { HandlerFactory } from '@voiceflow/general-runtime/build/runtime';
import { Node } from '@voiceflow/google-types';

import { S, T } from '@/lib/constants';

import { IntentRequest, RequestType } from '../types';
import { addChipsIfExists, addRepromptIfExists, mapSlots, replaceIDVariables } from '../utils';
import CommandHandler from './command';
import NoInputHandler from './noInput';
import NoMatchHandler from './noMatch';

const utilsObj = {
  addRepromptIfExists,
  addChipsIfExists,
  mapSlots,
  commandHandler: CommandHandler(),
  noMatchHandler: NoMatchHandler(),
  noInputHandler: NoInputHandler(),
  replaceIDVariables,
  v: '',
};

export const InteractionHandler: HandlerFactory<Node.Interaction.Node, typeof utilsObj> = (utils: typeof utilsObj) => ({
  canHandle: (node) => !!node.interactions,
  // eslint-disable-next-line sonarjs/cognitive-complexity
  handle: (node, runtime, variables) => {
    const request = runtime.turn.get(T.REQUEST) as IntentRequest;

    if (request?.type !== RequestType.INTENT) {
      // clean up reprompt on new interaction
      runtime.storage.delete(S.REPROMPT);

      utils.addChipsIfExists(node, runtime, variables);
      utils.addRepromptIfExists(node, runtime, variables);

      // clean up no matches and no replies counters on new interaction
      runtime.storage.delete(S.NO_MATCHES_COUNTER);
      runtime.storage.delete(S.NO_INPUTS_COUNTER);

      // quit cycleStack without ending session by stopping on itself
      return node.id;
    }

    let nextId: string | null | undefined;
    let variableMap: Models.SlotMapping[] | null = null;

    const { slots, input, intent } = request.payload;

    (node.buttons ?? []).forEach((button) => {
      if (utils.replaceIDVariables(button.name, variables.getState()) === input) {
        if (button.type === 'PATH' || button.type === 'INTENT_PATH') {
          nextId = button.nextID;
        }

        if (button.type === 'INTENT') {
          // INTENT button type is never a local choice intent
          runtime.turn.set(T.REQUEST, { ...request, payload: { ...request.payload, intent: button.intentName } });
        }
      }
    });

    if (!nextId) {
      // check if there is a choice in the node that fulfills intent
      node.interactions.forEach((choice, i: number) => {
        if (choice.intent && choice.intent === intent) {
          if (choice.goTo) {
            runtime.turn.set(T.GOTO, choice.goTo.intentName);
            nextId = node.id;
          } else {
            variableMap = choice.mappings ?? null;
            nextId = node.nextIds[choice.nextIdIndex || choice.nextIdIndex === 0 ? choice.nextIdIndex : i];
          }
        }
      });
    }

    if (variableMap && slots) {
      // map request mappings to variables
      variables.merge(utils.mapSlots(variableMap, slots));
    }

    if (nextId !== undefined) {
      runtime.turn.delete(T.REQUEST);

      return nextId;
    }

    // check if there is a command in the stack that fulfills intent
    if (utils.commandHandler.canHandle(runtime)) {
      return utils.commandHandler.handle(runtime, variables);
    }

    // check for no input in v2
    if (utils.v === 'v2' && utils.noInputHandler.canHandle(runtime)) {
      return utils.noInputHandler.handle(node, runtime, variables);
    }

    // request for this turn has been processed, delete request
    runtime.turn.delete(T.REQUEST);

    return utils.noMatchHandler.handle(node, runtime, variables);
  },
});

export default (v = 'v1') => InteractionHandler({ ...utilsObj, v });
