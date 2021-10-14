import { expect } from 'chai';
import sinon from 'sinon';

import { F, S, T } from '@/lib/constants';
import { TextHandler } from '@/lib/services/runtime/handlers/dialogflow_es/text';

describe('text handler unit tests', async () => {
  afterEach(() => sinon.restore());

  describe('canHandle', () => {
    it('false', async () => {
      expect(TextHandler(null as any).canHandle({ type: 'speak' } as any, null as any, null as any, null as any)).to.eql(false);
      expect(TextHandler(null as any).canHandle({} as any, null as any, null as any, null as any)).to.eql(false);
    });

    it('true', async () => {
      expect(TextHandler(null as any).canHandle({ type: 'text' } as any, null as any, null as any, null as any)).to.eql(true);
    });
  });

  describe('handle', () => {
    it('no sample', () => {
      const utils = {
        _sample: sinon.stub().returns(null),
      };

      const textHandler = TextHandler(utils as any);

      expect(textHandler.handle({} as any, null as any, null as any, null as any)).to.eql(null);
    });

    it('message not a string', () => {
      const newSlate = { content: [{ children: { text: 'injectedSlate' } }] };
      const utils = {
        _sample: sinon.stub().returns({ content: [{ children: { text: 'sampledSlate' } }] }),
        slateToPlaintext: sinon.stub().returns(null),
        sanitizeVariables: sinon.stub().returns('sanitizedVars'),
        slateInjectVariables: sinon.stub().returns(newSlate.content),
      };

      const node = {
        texts: [1, 2, 3],
        nextId: 'nextId',
      };

      const variables = { getState: sinon.stub().returns('vars') };

      const textHandler = TextHandler(utils as any);
      expect(textHandler.handle(node as any, {} as any, variables as any, null as any)).to.eql(node.nextId);
      expect(utils._sample.args).to.eql([[node.texts]]);
      expect(variables.getState.args).to.eql([[]]);
      expect(utils.sanitizeVariables.args).to.eql([['vars']]);
      expect(utils.slateInjectVariables.args).to.eql([[[{ children: { text: 'sampledSlate' } }], 'sanitizedVars']]);
      expect(utils.slateToPlaintext.args).to.eql([[newSlate.content]]);
    });

    it('works', () => {
      const newSlate = { content: [{ children: { text: 'injectedSlate' } }] };
      const utils = {
        _sample: sinon.stub().returns({ content: [{ children: { text: 'sampledSlate' } }] }),
        slateToPlaintext: sinon.stub().returns('plainText'),
        sanitizeVariables: sinon.stub().returns('sanitizedVars'),
        slateInjectVariables: sinon.stub().returns(newSlate.content),
      };

      const node = {
        texts: [1, 2, 3],
        nextId: 'nextId',
      };

      const topStorageSet = sinon.stub();

      const runtime = {
        stack: {
          top: sinon.stub().returns({ storage: { set: topStorageSet } }),
        },
        trace: { addTrace: sinon.stub() },
        storage: { produce: sinon.stub() },
        turn: { set: sinon.stub() },
      };

      const variables = { getState: sinon.stub().returns('vars') };

      const textHandler = TextHandler(utils as any);
      expect(textHandler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(node.nextId);
      expect(utils._sample.args).to.eql([[node.texts]]);
      expect(variables.getState.args).to.eql([[]]);
      expect(utils.sanitizeVariables.args).to.eql([['vars']]);
      expect(utils.slateInjectVariables.args).to.eql([[[{ children: { text: 'sampledSlate' } }], 'sanitizedVars']]);
      expect(utils.slateToPlaintext.args).to.eql([[newSlate.content]]);
      expect(runtime.storage.produce.callCount).eql(1);

      const fn = runtime.storage.produce.args[0][0];
      const draft = {
        [S.OUTPUT]: 'previous ',
      };
      fn(draft);
      expect(draft[S.OUTPUT]).to.eq('previous plainText');

      expect(topStorageSet.args).to.eql([[F.SPEAK, 'plainText']]);
      expect(runtime.turn.set.args).to.eql([[T.DF_ES_TEXT_ENABLED, true]]);
    });
  });
});
