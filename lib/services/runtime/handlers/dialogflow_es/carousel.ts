import { BaseNode } from '@voiceflow/base-types';
import { replaceVariables } from '@voiceflow/common';
import { HandlerFactory } from '@voiceflow/general-runtime/build/runtime';

import { S, T } from '@/lib/constants';
import { addRepromptIfExists, addVariables, processOutput } from '@/lib/services/runtime/utils';

import { IntentRequest, RequestType, ResponseBuilderDialogflowES } from '../../types';
import CommandHandler from '../command';
import NoInputHandler from '../noInput';
import NoMatchHandler from '../noMatch';

interface CarouselCard extends Omit<BaseNode.Carousel.NodeCarouselCard, 'description'> {
  description: string;
}

interface Carousel {
  layout: BaseNode.Carousel.CarouselLayout;
  cards: CarouselCard[];
}

export const CarouselResponseBuilderDialogflowES: ResponseBuilderDialogflowES = (runtime, res) => {
  const carousel = runtime.turn.get<Carousel>(T.DF_ES_CAROUSEL);

  if (!carousel) {
    return;
  }

  const items = carousel.cards.map((card) => ({
    title: card.title,
    description: card.description,
    image: {
      imageUri: card.imageUrl,
      accessibilityText: 'Image',
    },
    info: {
      key: card.buttons[0]?.request?.type,
      synonyms: [],
    },
  }));

  if (carousel.layout === BaseNode.Carousel.CarouselLayout.CAROUSEL) {
    res.fulfillmentMessages.push({
      platform: 'ACTIONS_ON_GOOGLE',
      carouselSelect: {
        items,
      },
    });
  } else {
    res.fulfillmentMessages.push({
      platform: 'ACTIONS_ON_GOOGLE',
      listSelect: {
        items,
      },
    });
  }
};

const utilsObj = {
  addRepromptIfExists,
  noMatchHandler: NoMatchHandler(),
  commandHandler: CommandHandler(),
  noInputHandler: NoInputHandler(),
  addVariables: addVariables(replaceVariables),
  processOutput,
};

export const CarouselHandler: HandlerFactory<BaseNode.Carousel.Node, typeof utilsObj> = (utils) => ({
  canHandle: (node) => node.type === BaseNode.NodeType.CAROUSEL,
  handle: (node, runtime, variables) => {
    const request = runtime.turn.get(T.REQUEST) as IntentRequest;
    const stop = !node.nextId;
    const nextID = node.nextId ?? null;

    if (request?.type !== RequestType.INTENT) {
      const carousel = {
        ...node,
        cards: node.cards.map((card) => ({
          id: card.id,
          imageUrl: utils.addVariables(card.imageUrl, variables),
          title: utils.addVariables(card.title, variables),
          description: utils.processOutput(card.description, variables),
          buttons: card.buttons,
        })),
      };

      runtime.turn.set(T.DF_ES_CAROUSEL, carousel);

      if (stop) {
        utils.addRepromptIfExists(node, runtime, variables);

        // clean up no matches and no replies counters on new interaction
        runtime.storage.delete(S.NO_MATCHES_COUNTER);
        runtime.storage.delete(S.NO_INPUTS_COUNTER);
        return node.id;
      }
      return nextID;
    }

    // check if there is a command in the stack that fulfills intent
    if (utils.commandHandler.canHandle(runtime)) {
      return utils.commandHandler.handle(runtime, variables);
    }

    if (!stop) return null;

    if (utils.noInputHandler.canHandle(runtime)) {
      return utils.noInputHandler.handle(node, runtime, variables);
    }

    return utils.noMatchHandler.handle(node, runtime, variables);
  },
});

export default () => CarouselHandler(utilsObj);
