import { BaseNode } from '@voiceflow/base-types';
import { expect } from 'chai';
import sinon from 'sinon';

import { S, T } from '@/lib/constants';
import DefaultCarouselHandler, {
  CarouselHandler,
  CarouselResponseBuilderDialogflowES,
} from '@/lib/services/runtime/handlers/dialogflow_es/carousel';

describe('df es carousel handler unit tests', async () => {
  afterEach(() => sinon.restore());

  describe('canHandle', () => {
    it('false', async () => {
      expect(DefaultCarouselHandler().canHandle({} as any, null as any, null as any, null as any)).to.eql(false);
    });

    it('true', async () => {
      expect(
        DefaultCarouselHandler().canHandle(
          { type: BaseNode.NodeType.CAROUSEL } as any,
          null as any,
          null as any,
          null as any
        )
      ).to.eql(true);
    });
  });

  describe('handle', () => {
    it('work for non blocking', async () => {
      const utils = {
        addRepromptIfExists: sinon.stub(),
        addVariables: sinon.stub().returns('var_value'),
        commandHandler: { canHandle: sinon.stub(), handle: sinon.stub() },
        noInputHandler: { canHandle: sinon.stub(), handle: sinon.stub() },
        noMatchHandler: { canHandle: sinon.stub(), handle: sinon.stub() },
        processOutput: sinon.stub().returns('description'),
      };
      const carouselHandler = CarouselHandler(utils);

      const block: Partial<BaseNode.Carousel.Node> = {
        cards: [
          {
            id: 'card-1',
            title: 'Card Title 1 {title-var}',
            description: [{ text: 'Card Description 1 {description-var}' }],
            buttons: [],
            imageUrl: '{image-url}',
          },
          {
            id: 'card-2',
            title: 'Card Title 2 {title-var}',
            description: [{ text: 'Card Description 2 {description-var}' }],
            buttons: [],
            imageUrl: '{image-url}',
          },
        ],
        nextId: 'next-id',
      };
      const runtime = {
        turn: { set: sinon.stub(), get: sinon.stub().returns(null) },
      };
      const variables = { 'image-url': 'bar.jpg', 'title-var': 'title', 'description-var': 'desc' };

      expect(carouselHandler.handle(block as any, runtime as any, variables as any, null as any)).to.eql(block.nextId);

      expect(utils.addVariables.args).to.eql([
        [block.cards?.[0].imageUrl, variables],
        [block.cards?.[0].title, variables],

        [block.cards?.[1].imageUrl, variables],
        [block.cards?.[1].title, variables],
      ]);

      expect(utils.processOutput.args).to.eql([
        [block.cards?.[0].description, variables],
        [block.cards?.[1].description, variables],
      ]);

      expect(runtime.turn.set.args).to.eql([
        [
          T.DF_ES_CAROUSEL,
          {
            cards: [
              {
                id: block.cards?.[0].id,
                imageUrl: 'var_value',
                title: 'var_value',
                description: 'description',
                buttons: block.cards?.[0].buttons,
              },
              {
                id: block.cards?.[1].id,
                imageUrl: 'var_value',
                title: 'var_value',
                description: 'description',
                buttons: block.cards?.[1].buttons,
              },
            ],
            nextId: 'next-id',
          },
        ],
      ]);
    });

    it('work for blocking', async () => {
      const utils = {
        addRepromptIfExists: sinon.stub(),
        addVariables: sinon.stub().returns('var_value'),
        commandHandler: { canHandle: sinon.stub(), handle: sinon.stub() },
        noInputHandler: { canHandle: sinon.stub(), handle: sinon.stub() },
        noMatchHandler: { canHandle: sinon.stub(), handle: sinon.stub() },
        processOutput: sinon.stub().returns('description'),
      };

      // clean up no matches and no replies counters on new interaction

      const carouselHandler = CarouselHandler(utils);

      const block: Partial<BaseNode.Carousel.Node> = {
        id: 'block_id',
        cards: [
          {
            id: 'card-1',
            title: 'Card Title 1 {title-var}',
            description: [{ text: 'Card Description 1 {description-var}' }],
            buttons: [],
            imageUrl: '{image-url}',
          },
          {
            id: 'card-2',
            title: 'Card Title 2 {title-var}',
            description: [{ text: 'Card Description 2 {description-var}' }],
            buttons: [],
            imageUrl: '{image-url}',
          },
        ],
        nextId: null,
      };
      const runtime = {
        turn: { set: sinon.stub(), get: sinon.stub().returns(null) },
        storage: { delete: sinon.stub() },
      };
      const variables = { 'image-url': 'bar.jpg', 'title-var': 'title', 'description-var': 'desc' };

      expect(carouselHandler.handle(block as any, runtime as any, variables as any, null as any)).to.eql(block.id);

      expect(utils.addRepromptIfExists.args).to.eql([[block, runtime, variables]]);
      expect(runtime.storage.delete.args).to.eql([[S.NO_MATCHES_COUNTER], [S.NO_INPUTS_COUNTER]]);

      expect(utils.addVariables.args).to.eql([
        [block.cards?.[0].imageUrl, variables],
        [block.cards?.[0].title, variables],

        [block.cards?.[1].imageUrl, variables],
        [block.cards?.[1].title, variables],
      ]);

      expect(utils.processOutput.args).to.eql([
        [block.cards?.[0].description, variables],
        [block.cards?.[1].description, variables],
      ]);

      expect(runtime.turn.set.args).to.eql([
        [
          T.DF_ES_CAROUSEL,
          {
            cards: [
              {
                id: block.cards?.[0].id,
                imageUrl: 'var_value',
                title: 'var_value',
                description: 'description',
                buttons: block.cards?.[0].buttons,
              },
              {
                id: block.cards?.[1].id,
                imageUrl: 'var_value',
                title: 'var_value',
                description: 'description',
                buttons: block.cards?.[1].buttons,
              },
            ],
            id: 'block_id',
            nextId: null,
          },
        ],
      ]);
    });

    it('works for command', async () => {
      const utils = {
        addRepromptIfExists: sinon.stub(),
        addVariables: sinon.stub().returns('var_value'),
        commandHandler: { canHandle: sinon.stub().returns(true), handle: sinon.stub() },
        noInputHandler: { canHandle: sinon.stub(), handle: sinon.stub() },
        noMatchHandler: { canHandle: sinon.stub(), handle: sinon.stub() },
        processOutput: sinon.stub().returns('description'),
      };

      // clean up no matches and no replies counters on new interaction

      const carouselHandler = CarouselHandler(utils);

      const block: Partial<BaseNode.Carousel.Node> = {
        id: 'block_id',
        cards: [],
        nextId: null,
      };
      const runtime = {
        turn: {
          set: sinon.stub(),
          get: sinon.stub().returns({
            type: 'INTENT',
          }),
        },
      };
      const variables = {};
      carouselHandler.handle(block as any, runtime as any, variables as any, null as any);

      expect(utils.commandHandler.canHandle.args).to.eql([[runtime]]);
      expect(utils.commandHandler.handle.args).to.eql([[runtime, variables]]);
    });
  });

  it('works for no input', async () => {
    const utils = {
      addRepromptIfExists: sinon.stub(),
      addVariables: sinon.stub().returns('var_value'),
      commandHandler: { canHandle: sinon.stub().returns(false), handle: sinon.stub() },
      noInputHandler: { canHandle: sinon.stub().returns(true), handle: sinon.stub() },
      noMatchHandler: { canHandle: sinon.stub().returns(false), handle: sinon.stub() },
      processOutput: sinon.stub().returns('description'),
    };

    // clean up no matches and no replies counters on new interaction

    const carouselHandler = CarouselHandler(utils);

    const block: Partial<BaseNode.Carousel.Node> = {
      id: 'block_id',
      cards: [],
      nextId: null,
    };
    const runtime = {
      turn: {
        set: sinon.stub(),
        get: sinon.stub().returns({
          type: 'INTENT',
          payload: 'actions.intent.NO_INPUT',
        }),
      },
    };
    const variables = {};
    carouselHandler.handle(block as any, runtime as any, variables as any, null as any);

    expect(utils.noInputHandler.canHandle.args).to.eql([[runtime]]);
    expect(utils.noInputHandler.handle.args).to.eql([[block, runtime, variables]]);
  });

  it('works for no match', async () => {
    const utils = {
      addRepromptIfExists: sinon.stub(),
      addVariables: sinon.stub().returns('var_value'),
      commandHandler: { canHandle: sinon.stub().returns(false), handle: sinon.stub() },
      noInputHandler: { canHandle: sinon.stub().returns(false), handle: sinon.stub() },
      noMatchHandler: { handle: sinon.stub() },
      processOutput: sinon.stub().returns('description'),
    };

    // clean up no matches and no replies counters on new interaction

    const carouselHandler = CarouselHandler(utils);

    const block: Partial<BaseNode.Carousel.Node> = {
      id: 'block_id',
      cards: [],
      nextId: null,
    };
    const runtime = {
      turn: {
        set: sinon.stub(),
        get: sinon.stub().returns({
          type: 'INTENT',
        }),
      },
    };
    const variables = {};
    carouselHandler.handle(block as any, runtime as any, variables as any, null as any);

    expect(utils.noMatchHandler.handle.args).to.eql([[block, runtime, variables]]);
  });

  describe('responseBuilderDialogflowES', () => {
    const items = [
      {
        imageUrl: 'card_imageUrl',
        title: 'card_title_1',
        description: 'card_description',
        buttons: [{ request: { type: 'card_request_type' } }],
      },
      {
        imageUrl: 'card_imageUrl',
        title: 'card_title_2',
        description: 'card_description',
        buttons: [{ request: { type: 'card_request_type' } }],
      },
    ];

    it('carousel', async () => {
      const runtime = {
        turn: { get: sinon.stub().returns({ cards: items, layout: 'Carousel' }) },
      };

      const res = {
        fulfillmentMessages: [],
      };

      CarouselResponseBuilderDialogflowES(runtime as any, res as any);

      expect(runtime.turn.get.args).to.eql([[T.DF_ES_CAROUSEL]]);

      expect(res.fulfillmentMessages).to.eql([
        {
          platform: 'ACTIONS_ON_GOOGLE',
          carouselSelect: {
            items: [
              {
                title: 'card_title_1',
                description: 'card_description',
                image: {
                  imageUri: 'card_imageUrl',
                  accessibilityText: 'Image',
                },
                info: {
                  key: 'card_request_type',
                  synonyms: [],
                },
              },
              {
                title: 'card_title_2',
                description: 'card_description',
                image: {
                  imageUri: 'card_imageUrl',
                  accessibilityText: 'Image',
                },
                info: {
                  key: 'card_request_type',
                  synonyms: [],
                },
              },
            ],
          },
        },
      ]);
    });

    it('list', async () => {
      const runtime = {
        turn: { get: sinon.stub().returns({ cards: items, layout: 'List' }) },
      };

      const res = {
        fulfillmentMessages: [],
      };

      CarouselResponseBuilderDialogflowES(runtime as any, res as any);

      expect(runtime.turn.get.args).to.eql([[T.DF_ES_CAROUSEL]]);

      expect(res.fulfillmentMessages).to.eql([
        {
          platform: 'ACTIONS_ON_GOOGLE',
          listSelect: {
            items: [
              {
                title: 'card_title_1',
                description: 'card_description',
                image: {
                  imageUri: 'card_imageUrl',
                  accessibilityText: 'Image',
                },
                info: {
                  key: 'card_request_type',
                  synonyms: [],
                },
              },
              {
                title: 'card_title_2',
                description: 'card_description',
                image: {
                  imageUri: 'card_imageUrl',
                  accessibilityText: 'Image',
                },
                info: {
                  key: 'card_request_type',
                  synonyms: [],
                },
              },
            ],
          },
        },
      ]);
    });
  });
});
