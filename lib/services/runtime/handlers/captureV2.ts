import { BaseModels, BaseNode } from '@voiceflow/base-types';
import { HandlerFactory } from '@voiceflow/general-runtime/build/runtime';
import { GoogleNode } from '@voiceflow/google-types';

import { T } from '@/lib/constants';

import { IntentRequest, RequestType } from '../types';
import { addRepromptIfExists, mapSlots } from '../utils';
import CommandHandler from './command';
import NoInputHandler from './noInput';
import NoMatchHandler from './noMatch';

const utilsObj = {
  commandHandler: CommandHandler(),
  noMatchHandler: NoMatchHandler(),
  noInputHandler: NoInputHandler(),
  addRepromptIfExists,
};

export const CaptureV2Handler: HandlerFactory<GoogleNode.CaptureV2.VoiceNode, typeof utilsObj> = (utils) => ({
  canHandle: (node) => node.type === BaseNode.NodeType.CAPTURE_V2,
  handle: (node, runtime, variables) => {
    const request = runtime.turn.get<IntentRequest>(T.REQUEST);

    if (request?.type !== RequestType.INTENT) {
      utils.addRepromptIfExists(node, runtime, variables);

      if (node.intent) {
        runtime.turn.set(T.GOTO, node.intent.name);
      }

      // quit cycleStack without ending session by stopping on itself
      return node.id;
    }

    // check if there is a command in the stack that fulfills intent
    if (utils.commandHandler.canHandle(runtime)) {
      return utils.commandHandler.handle(runtime, variables);
    }

    // check for no input in v2
    if (utils.noInputHandler.canHandle(runtime)) {
      return utils.noInputHandler.handle(node, runtime, variables);
    }

    const { slots, input, intent } = request.payload;

    if (intent === node.intent?.name && node.intent.entities && slots) {
      const entities: BaseModels.SlotMapping[] = node.intent.entities.map((slot) => ({ slot, variable: slot }));
      variables.merge(mapSlots(entities, slots));

      runtime.turn.delete(T.REQUEST);
      return node.nextId ?? null;
    }
    if (node.variable) {
      variables.set(node.variable, input);

      runtime.turn.delete(T.REQUEST);
      return node.nextId ?? null;
    }

    // request for this turn has been processed, delete request
    runtime.turn.delete(T.REQUEST);

    // handle noMatch
    const noMatchPath = utils.noMatchHandler.handle(node, runtime, variables);
    if (noMatchPath === node.id && node.intent?.name) {
      runtime.turn.set(T.GOTO, node.intent.name);
    }

    return noMatchPath;
  },
});

export default () => CaptureV2Handler(utilsObj);
