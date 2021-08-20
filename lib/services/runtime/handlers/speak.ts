import { replaceVariables, sanitizeVariables } from '@voiceflow/common';
import { HandlerFactory } from '@voiceflow/general-runtime/build/runtime';
import { Node } from '@voiceflow/google-types';
import _ from 'lodash';

import { F, S } from '@/lib/constants';

// TODO: probably we can remove it, since prompt is not used in the node handler, and does not exist in the alexa/general service handler
const isPromptSpeak = (node: Node.Speak.Node & { prompt?: unknown }) => _.isString(node.prompt) && node.prompt !== 'true';

const SpeakHandler: HandlerFactory<Node.Speak.Node> = () => ({
  canHandle: (node) => ('random_speak' in node ? !!node.random_speak : !!node.speak) || isPromptSpeak(node),
  handle: (node, runtime, variables) => {
    let speak = '';

    // Pick a random part to speak
    if ('random_speak' in node && Array.isArray(node.random_speak)) {
      speak = _.sample(node.random_speak) ?? '';
    } else if ('speak' in node) {
      ({ speak } = node);
    }

    const sanitizedVars = sanitizeVariables(variables.getState());

    if (_.isString(speak)) {
      const output = replaceVariables(speak, sanitizedVars);

      runtime.storage.produce<{ [S.OUTPUT]: string }>((draft) => {
        draft[S.OUTPUT] += output;
      });

      runtime.stack.top().storage.set(F.SPEAK, output);
    }

    return node.nextId ?? null;
  },
});

export default SpeakHandler;
