import { Card as GoogleCard, Image as GoogleImage } from '@assistant/conversation';
import { BaseNode } from '@voiceflow/base-types';
import { replaceVariables } from '@voiceflow/common';
import { HandlerFactory } from '@voiceflow/general-runtime/build/runtime';
import { BasicCard, Image } from 'actions-on-google';

import { T } from '@/lib/constants';

import { ResponseBuilder, ResponseBuilderDialogflowES, ResponseBuilderV2 } from '../types';
import { addVariables } from '../utils';

export const CardResponseBuilderGenerator =
  (CardBuilder: typeof BasicCard, ImageBuilder: typeof Image): ResponseBuilder =>
  (runtime, conv) => {
    const card = runtime.turn.get<BaseNode.Card.Card>(T.CARD);

    if (!card) {
      return;
    }

    if (card.type === BaseNode.Card.CardType.SIMPLE) {
      conv.add(new CardBuilder({ text: card.text, title: card.title }));
    } else if (card.type === BaseNode.Card.CardType.STANDARD) {
      conv.add(
        new CardBuilder({
          text: card.text,
          title: card.title,
          image: new ImageBuilder({ url: card.image?.largeImageUrl ?? '', alt: 'Image' }),
        })
      );
    }
  };

export const CardResponseBuilder = CardResponseBuilderGenerator(BasicCard, Image);

export const CardResponseBuilderGeneratorV2 =
  (CardBuilder: typeof GoogleCard, ImageBuilder: typeof GoogleImage): ResponseBuilderV2 =>
  (runtime, conv) => {
    const card = runtime.turn.get<BaseNode.Card.Card>(T.CARD);

    if (!card) {
      return;
    }

    if (card.type === BaseNode.Card.CardType.SIMPLE) {
      conv.add(new CardBuilder({ text: card.text, title: card.title }));
    } else if (card.type === BaseNode.Card.CardType.STANDARD) {
      conv.add(
        new CardBuilder({
          text: card.text,
          title: card.title,
          image: new ImageBuilder({ url: card.image?.largeImageUrl, alt: 'Image' }),
        })
      );
    }
  };

export const CardResponseBuilderV2 = CardResponseBuilderGeneratorV2(GoogleCard, GoogleImage);

export const CardResponseBuilderDialogflowES: ResponseBuilderDialogflowES = (runtime, res) => {
  const card = runtime.turn.get<BaseNode.Card.Card>(T.CARD);

  if (!card) {
    return;
  }

  if (card.type === BaseNode.Card.CardType.SIMPLE) {
    res.fulfillmentMessages.push({ card: { title: card.title, subtitle: card.text } });
  } else if (card.type === BaseNode.Card.CardType.STANDARD) {
    res.fulfillmentMessages.push({
      card: { title: card.title, text: card.text, imageUri: card.image?.largeImageUrl ?? '' },
    });
  }
};

const utilsObj = {
  addVariables: addVariables(replaceVariables),
};

export const CardHandler: HandlerFactory<BaseNode.Card.Node, typeof utilsObj> = (utils) => ({
  canHandle: (node) => !!node.card,
  handle: (node, runtime, variables) => {
    const { card } = node;
    const type = card.type ?? BaseNode.Card.CardType.SIMPLE;

    // FIXME: remove after data refactoring
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const { content } = card;

    const text = (type === BaseNode.Card.CardType.SIMPLE ? content : card.text) ?? card.text;

    const newCard: Required<BaseNode.Card.Card> = {
      type: card.type ?? BaseNode.Card.CardType.SIMPLE,
      text: utils.addVariables(text, variables),
      title: utils.addVariables(card.title, variables),
      image: { largeImageUrl: '' },
    };

    if (card.type === BaseNode.Card.CardType.STANDARD && card.image?.largeImageUrl) {
      newCard.image.largeImageUrl = utils.addVariables(card.image.largeImageUrl, variables);
    }

    runtime.turn.set(T.CARD, newCard);

    return node.nextId ?? null;
  },
});

export default () => CardHandler(utilsObj);
