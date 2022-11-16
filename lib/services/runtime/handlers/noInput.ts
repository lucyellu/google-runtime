import { isPromptContentEmpty } from '@voiceflow/general-runtime/build/lib/services/runtime/utils';
import { Runtime, Store } from '@voiceflow/general-runtime/build/runtime';
import { VoiceflowNode } from '@voiceflow/voiceflow-types';
import _ from 'lodash';

import { S, T } from '@/lib/constants';
import { getGlobalNoReplyPrompt, processOutput, removeEmptyPrompts } from '@/lib/services/runtime/utils';

import { IntentRequest } from '../types';

const NO_INPUT_PREFIX = 'actions.intent.NO_INPUT';

export type NoReplyCounterStorage = number;

const getOutput = (
  node: VoiceflowNode.Utils.NoReplyNode,
  runtime: Runtime,
  variables: Store,
  noReplyCounter: number
) => {
  const nodeReprompt = node.reprompt ? [node.reprompt] : [];
  const noReplyPrompts = removeEmptyPrompts(node?.noReply?.prompts ?? nodeReprompt);

  if (noReplyCounter > noReplyPrompts.length) return null;

  if (noReplyCounter < noReplyPrompts.length) {
    const speak = node.noReply?.randomize ? _.sample(noReplyPrompts) : noReplyPrompts[noReplyCounter];
    return processOutput(speak, variables);
  }

  const globalNoReply = getGlobalNoReplyPrompt(runtime)?.content;

  if (!isPromptContentEmpty(globalNoReply)) return processOutput(globalNoReply, variables);

  return null;
};

export const NoInputHandler = () => ({
  canHandle: (runtime: Runtime) => {
    const { payload } = runtime.turn.get<IntentRequest>(T.REQUEST) ?? {};
    return payload?.action?.startsWith(NO_INPUT_PREFIX) || payload?.intent?.startsWith(NO_INPUT_PREFIX) || false;
  },

  handle: (node: VoiceflowNode.Utils.NoReplyNode, runtime: Runtime, variables: Store) => {
    const noReplyCounter = runtime.storage.get<NoReplyCounterStorage>(S.NO_INPUTS_COUNTER) ?? 0;
    const output = getOutput(node, runtime, variables, noReplyCounter);

    if (!output) {
      // clean up no replies counter
      runtime.storage.delete(S.NO_INPUTS_COUNTER);
      runtime.turn.delete(T.REQUEST);

      return node.noReply?.nodeID ?? null;
    }

    runtime.storage.set(S.NO_INPUTS_COUNTER, noReplyCounter + 1);

    runtime.storage.produce((draft) => {
      draft[S.OUTPUT] += output;
    });

    runtime.turn.delete(T.REQUEST);

    return node.id;
  },
});

export default () => NoInputHandler();
