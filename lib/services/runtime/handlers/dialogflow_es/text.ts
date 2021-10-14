import { Node } from '@voiceflow/base-types';
import { sanitizeVariables } from '@voiceflow/common';
import { slateInjectVariables, slateToPlaintext } from '@voiceflow/general-runtime/build/lib/services/runtime/utils';
import { HandlerFactory } from '@voiceflow/general-runtime/build/runtime';
import _isString from 'lodash/isString';
import _sample from 'lodash/sample';

import { F, S, T } from '@/lib/constants';
import log from '@/logger';

const handlerUtils = {
  _isString,
  _sample,
  slateToPlaintext,
  sanitizeVariables,
  slateInjectVariables,
};

export const TextHandler: HandlerFactory<Node.Text.Node, typeof handlerUtils> = (utils) => ({
  canHandle: (node) => node.type === Node.NodeType.TEXT,
  handle: (node, runtime, variables) => {
    const slate = utils._sample(node.texts);

    if (slate) {
      try {
        const sanitizedVars = utils.sanitizeVariables(variables.getState());
        const content = utils.slateInjectVariables(slate.content, sanitizedVars);
        const message = utils.slateToPlaintext(content);

        if (_isString(message)) {
          runtime.storage.produce<{ [S.OUTPUT]: string }>((draft) => {
            draft[S.OUTPUT] += message;
          });

          runtime.stack.top().storage.set(F.SPEAK, message);
          runtime.turn.set(T.DF_ES_TEXT_ENABLED, true);
        }
      } catch (error) {
        log.error(`[app] [${TextHandler.name}] failed to add Slate trace ${log.vars({ error })}`);
      }
    }

    return node.nextId ?? null;
  },
});

export default () => TextHandler(handlerUtils);
