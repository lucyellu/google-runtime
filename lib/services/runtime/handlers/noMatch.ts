import { BaseNode } from '@voiceflow/base-types';
import { Nullable } from '@voiceflow/common';
import { isPromptContentEmpty } from '@voiceflow/general-runtime/build/lib/services/runtime/utils';
import { Runtime, Store } from '@voiceflow/general-runtime/build/runtime';
import { VoiceNode } from '@voiceflow/voice-types';
import _ from 'lodash';

import { S } from '@/lib/constants';
import { getGlobalNoMatchPrompt, processOutput, removeEmptyPrompts } from '@/lib/services/runtime/utils';

export type NoMatchCounterStorage = number;

interface NoMatchNode extends BaseNode.Utils.BaseNode {
  noMatch?: Nullable<VoiceNode.Utils.NodeNoMatch>;
}

interface DeprecatedNoMatchNode extends NoMatchNode, VoiceNode.Utils.DeprecatedNodeNoMatch {}

const convertDeprecatedNoMatch = ({
  noMatch,
  elseId,
  noMatches,
  randomize,
  ...node
}: DeprecatedNoMatchNode): NoMatchNode => {
  const mergedNoMatch: VoiceNode.Utils.NodeNoMatch = {
    prompts: noMatch?.prompts ?? noMatches,
    randomize: noMatch?.randomize ?? randomize,
    nodeID: noMatch?.nodeID ?? elseId,
  };

  return { noMatch: mergedNoMatch, ...node };
};

const getOutput = (runtime: Runtime, node: NoMatchNode, variables: Store, noMatchCounter: number) => {
  const nonEmptyNoMatches = removeEmptyPrompts(node?.noMatch?.prompts ?? []);

  const exhaustedReprompts = noMatchCounter >= nonEmptyNoMatches.length;

  if (!exhaustedReprompts) {
    const speak = node.noMatch?.randomize ? _.sample(nonEmptyNoMatches) : nonEmptyNoMatches?.[noMatchCounter];
    return processOutput(speak, variables);
  }

  const globalNoMatchPrompt = getGlobalNoMatchPrompt(runtime)?.content;

  if (!isPromptContentEmpty(globalNoMatchPrompt)) {
    return processOutput(globalNoMatchPrompt, variables);
  }

  return null;
};

export const NoMatchHandler = () => ({
  handle: (_node: DeprecatedNoMatchNode, runtime: Runtime, variables: Store) => {
    const node = convertDeprecatedNoMatch(_node);
    const noMatchCounter = runtime.storage.get<NoMatchCounterStorage>(S.NO_MATCHES_COUNTER) ?? 0;
    const output = getOutput(runtime, node, variables, noMatchCounter);

    if (!output) {
      // clean up no matches counter
      runtime.storage.delete(S.NO_MATCHES_COUNTER);
      return node.noMatch?.nodeID ?? null;
    }

    runtime.storage.set(S.NO_MATCHES_COUNTER, noMatchCounter + 1);

    runtime.storage.produce((draft) => {
      draft[S.OUTPUT] += output;
    });

    return node.id;
  },
});

export default () => NoMatchHandler();
