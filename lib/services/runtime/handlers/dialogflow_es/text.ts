import { BaseNode } from '@voiceflow/base-types';
import { HandlerFactory } from '@voiceflow/general-runtime/build/runtime';
import _isString from 'lodash/isString';
import _sample from 'lodash/sample';

import { F, S, T } from '@/lib/constants';
import { processOutput } from '@/lib/services/runtime/utils';
import log from '@/logger';

const handlerUtils = {
  _isString,
  _sample,
  processOutput,
};

export const TextHandler: HandlerFactory<BaseNode.Text.Node, typeof handlerUtils> = (utils) => ({
  canHandle: (node) => node.type === BaseNode.NodeType.TEXT,
  handle: (node, runtime, variables) => {
    const text = utils._sample(node.texts);

    if (text) {
      try {
        const message = utils.processOutput(text.content, variables);

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
