import { replaceVariables } from '@voiceflow/common';
import { HandlerFactory } from '@voiceflow/general-runtime/build/runtime';
import { DFESNode } from '@voiceflow/google-dfes-types';

import { T } from '@/lib/constants';

import { ResponseBuilderDialogflowES } from '../../types';
import { addVariables } from '../../utils';

interface TurnPayload {
  data: Record<string, any>;
}

export const PayloadResponseBuilderDialogflowES: ResponseBuilderDialogflowES = (runtime, res) => {
  const payload = runtime.turn.get<TurnPayload>(T.DF_ES_PAYLOAD);

  if (!payload) {
    return;
  }

  res.fulfillmentMessages.push({ payload: payload.data });
};

const utilsObj = {
  addVariables: addVariables(replaceVariables),
};

export const PayloadHandler: HandlerFactory<DFESNode.Payload.Node, typeof utilsObj> = (utils) => ({
  canHandle: (node) => node.type === DFESNode.NodeType.PAYLOAD,
  handle: (node, runtime, variables) => {
    const unparsedData = utils.addVariables(node.data, variables);
    try {
      const data = JSON.parse(unparsedData) as TurnPayload['data'];
      runtime.turn.set<TurnPayload>(T.DF_ES_PAYLOAD, { data });
    } catch (err) {
      runtime.trace.debug(`invalid payload JSON:\n\`${unparsedData}\`\n\`${err}\``);
    }

    return node.nextID ?? null;
  },
});

export default () => PayloadHandler(utilsObj);
