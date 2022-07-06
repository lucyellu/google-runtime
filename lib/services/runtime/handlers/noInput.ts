import { Runtime, Store } from '@voiceflow/general-runtime/build/runtime';
import { VoiceNode } from '@voiceflow/voice-types';
import _ from 'lodash';

import { S, T } from '@/lib/constants';
import { processOutput, removeEmptyPrompts } from '@/lib/services/runtime/utils';

import { IntentRequest } from '../types';

const NO_INPUT_PREFIX = 'actions.intent.NO_INPUT';

export type NoReplyCounterStorage = number;

export const NoInputHandler = () => ({
  canHandle: (runtime: Runtime) => {
    const { payload } = runtime.turn.get<IntentRequest>(T.REQUEST) ?? {};
    return payload?.action?.startsWith(NO_INPUT_PREFIX) || payload?.intent?.startsWith(NO_INPUT_PREFIX) || false;
  },

  handle: (node: VoiceNode.Utils.NoReplyNode, runtime: Runtime, variables: Store) => {
    const noReplyPrompts = removeEmptyPrompts(node?.noReply?.prompts ?? (node.reprompt ? [node.reprompt] : null));

    const noReplyCounter = runtime.storage.get<NoReplyCounterStorage>(S.NO_INPUTS_COUNTER) ?? 0;

    if (noReplyCounter >= noReplyPrompts.length) {
      // clean up no replies counter
      runtime.storage.delete(S.NO_INPUTS_COUNTER);
      runtime.turn.delete(T.REQUEST);

      return node.noReply?.nodeID ?? null;
    }

    const speak = node.noReply?.randomize ? _.sample<string>(noReplyPrompts) : noReplyPrompts[noReplyCounter];
    const output = processOutput(speak, variables);

    runtime.storage.set(S.NO_INPUTS_COUNTER, noReplyCounter + 1);

    runtime.storage.produce((draft) => {
      draft[S.OUTPUT] += output;
    });

    runtime.turn.delete(T.REQUEST);

    return node.id;
  },
});

export default () => NoInputHandler();
