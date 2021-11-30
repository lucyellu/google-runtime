import { Node as BaseNode } from '@voiceflow/base-types';
import { replaceVariables } from '@voiceflow/common';
import { HandlerFactory } from '@voiceflow/general-runtime/build/runtime';
import { Node } from '@voiceflow/google-dfes-types';

import { T } from '@/lib/constants';

import { ResponseBuilderDialogflowES } from '../../types';
import { addVariables } from '../../utils';

interface TurnImage {
  imageUrl: string;
}

export const ImageResponseBuilderDialogflowES: ResponseBuilderDialogflowES = (runtime, res) => {
  const image = runtime.turn.get<TurnImage>(T.DF_ES_IMAGE);

  if (!image) {
    return;
  }

  res.fulfillmentMessages.push({ image: { imageUri: image.imageUrl, accessibilityText: 'image' } });
};

const utilsObj = {
  addVariables: addVariables(replaceVariables),
};

export const ImageHandler: HandlerFactory<Node.Visual.Node, typeof utilsObj> = (utils) => ({
  canHandle: (node) => node.type === BaseNode.NodeType.VISUAL,
  handle: (node, runtime, variables) => {
    runtime.turn.set<TurnImage>(T.DF_ES_IMAGE, { imageUrl: utils.addVariables(node.data.image, variables) });

    return node.nextId ?? null;
  },
});

export default () => ImageHandler(utilsObj);
