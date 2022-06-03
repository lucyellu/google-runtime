/* eslint-disable sonarjs/cognitive-complexity */

import { BaseModels, BaseNode } from '@voiceflow/base-types';
import { Frame, Runtime, Store } from '@voiceflow/general-runtime/build/runtime';
import { GoogleNode } from '@voiceflow/google-types';

import { F, S, T } from '@/lib/constants';

import { IntentName, IntentRequest, RequestType } from '../types';
import { mapSlots } from '../utils';

const isPushCommand = (
  command: BaseNode.AnyCommonCommand
): command is BaseNode.Command.Command & { diagram_id: string } => {
  return !!(command as BaseNode.Command.Command).diagram_id;
};

const isIntentCommand = (command: BaseNode.AnyCommonCommand): command is BaseNode.Intent.Command => {
  return !isPushCommand(command) && !!(command as BaseNode.Intent.Command).next;
};

export interface CommandOptions {
  diagramID?: string;
}

export const getCommand = (runtime: Runtime, options: CommandOptions = {}) => {
  const request = runtime.turn.get<IntentRequest>(T.REQUEST);

  if (request?.type !== RequestType.INTENT) {
    return null;
  }

  const { action, intent, slots } = request.payload;

  // don't act on a catchall intent
  if (intent === IntentName.VOICEFLOW) return null;

  const matcher = (command: GoogleNode.AnyCommand | null) => command?.intent === intent || command?.intent === action;

  const frames = runtime.stack.getFrames();
  for (let index = frames.length - 1; index >= 0; index--) {
    const commands = frames[index]?.getCommands<BaseNode.AnyCommonCommand>() ?? [];

    // eslint-disable-next-line no-restricted-syntax
    for (const command of commands) {
      const commandDiagramID =
        (isPushCommand(command) && command.diagram_id) || (isIntentCommand(command) && command.diagramID);
      if (options.diagramID && commandDiagramID && options.diagramID !== commandDiagramID) {
        continue;
      }

      if (matcher(command)) {
        return { index, command, intent, slots };
      }
    }
  }

  return null;
};

const utilsObj = {
  Frame,
  mapSlots,
  getCommand,
};

/**
 * The Command Handler is meant to be used inside other handlers, and should never handle blocks directly
 */
export const CommandHandler = (utils: typeof utilsObj) => ({
  canHandle: (runtime: Runtime, options?: CommandOptions): boolean => !!utils.getCommand(runtime, options),
  handle: (runtime: Runtime, variables: Store, options?: CommandOptions): null => {
    const res = utils.getCommand(runtime, options);
    if (!res) return null;

    let variableMap: BaseModels.CommandMapping[] | undefined;

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
