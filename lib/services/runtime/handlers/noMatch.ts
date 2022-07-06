import { BaseNode } from '@voiceflow/base-types';
import { Nullable } from '@voiceflow/common';
import { Runtime, Store } from '@voiceflow/general-runtime/build/runtime';
import { VoiceNode } from '@voiceflow/voice-types';
import _ from 'lodash';

import { S } from '@/lib/constants';
import { processOutput, removeEmptyPrompts } from '@/lib/services/runtime/utils';

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

export const NoMatchHandler = () => ({
  handle: (_node: DeprecatedNoMatchNode, runtime: Runtime, variables: Store) => {
    const node = convertDeprecatedNoMatch(_node);
    const noMatchPrompts = removeEmptyPrompts(node?.noMatch?.prompts);

    const noMatchCounter = runtime.storage.get<NoMatchCounterStorage>(S.NO_MATCHES_COUNTER) ?? 0;

    if (noMatchCounter >= noMatchPrompts.length) {
      // clean up no matches counter
      runtime.storage.delete(S.NO_MATCHES_COUNTER);
      return node.noMatch?.nodeID ?? null;
    }

    runtime.storage.set(S.NO_MATCHES_COUNTER, noMatchCounter + 1);

    const speak = node.noMatch?.randomize ? _.sample(noMatchPrompts) : noMatchPrompts?.[noMatchCounter];
    const output = processOutput(speak, variables);

    runtime.storage.produce((draft) => {
      draft[S.OUTPUT] += output;
    });

    return node.id;
  },
});

export default () => NoMatchHandler();
