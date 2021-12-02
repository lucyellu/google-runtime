/* eslint-disable sonarjs/cognitive-complexity */

import { Models, Node as BaseNode } from '@voiceflow/base-types';
import { extractFrameCommand, Frame, Runtime, Store } from '@voiceflow/general-runtime/build/runtime';
import { Node } from '@voiceflow/google-types';

import { F, S, T } from '@/lib/constants';

import { IntentName, IntentRequest, RequestType } from '../types';
import { mapSlots } from '../utils';

const isPushCommand = (command: BaseNode.AnyCommonCommand): command is BaseNode.Command.Command & { diagram_id: string } => {
  return !!(command as BaseNode.Command.Command).diagram_id;
};

const isIntentCommand = (command: BaseNode.AnyCommonCommand): command is BaseNode.Intent.Command => {
  return !isPushCommand(command) && !!(command as BaseNode.Intent.Command).next;
};

export const getCommand = (runtime: Runtime, extractFrame: typeof extractFrameCommand) => {
  const request = runtime.turn.get<IntentRequest>(T.REQUEST);

  if (request?.type !== RequestType.INTENT) {
    return null;
  }

  const { intent, slots } = request.payload;

  // don't act on a catchall intent
  if (intent === IntentName.VOICEFLOW) return null;

  const matcher = (command: Node.AnyGoogleCommand | null) => command?.intent === intent;

  const res = extractFrame<Node.AnyGoogleCommand>(runtime.stack, matcher);

  if (!res) {
    return null;
  }

  return {
    ...res,
    intent,
    slots,
  };
};

const utilsObj = {
  Frame,
  mapSlots,
  getCommand: (runtime: Runtime) => getCommand(runtime, extractFrameCommand),
};

/**
 * The Command Handler is meant to be used inside other handlers, and should never handle blocks directly
 */
export const CommandHandler = (utils: typeof utilsObj) => ({
  canHandle: (runtime: Runtime): boolean => !!utils.getCommand(runtime),
  handle: (runtime: Runtime, variables: Store): null => {
    const res = utils.getCommand(runtime);
    if (!res) return null;

    let variableMap: Models.CommandMapping[] | undefined;

    if (res.command) {
      const { index, command } = res;

      variableMap = command.mappings?.map(({ slot, variable }) => ({ slot: slot ?? '', variable: variable ?? '' }));

      if (isPushCommand(command)) {
        runtime.stack.top().storage.set(F.CALLED_COMMAND, true);

        // Reset state to beginning of new diagram and store current line to the stack
        const newFrame = new utils.Frame({ programID: command.diagram_id });
        runtime.stack.push(newFrame);
      } else if (isIntentCommand(command)) {
        if (index === runtime.stack.getSize() - 1) {
          // clear previous output
          runtime.storage.set(S.OUTPUT, '');
        }
        runtime.stack.popTo(index + 1);
        if (command.diagramID && command.diagramID !== runtime.stack.top().getProgramID()) {
          const newFrame = new utils.Frame({ programID: command.diagramID });
          runtime.stack.push(newFrame);
        }
        runtime.stack.top().setNodeID(command.next || null);
        runtime.trace.debug(`matched intent **${command.intent}** - jumping to node`);
      }
    }

    runtime.turn.delete(T.REQUEST);

    if (variableMap && res.slots) {
      // map request mappings to variables
      variables.merge(utils.mapSlots(variableMap, res.slots));
    }

    return null;
  },
});

export default () => CommandHandler(utilsObj);
