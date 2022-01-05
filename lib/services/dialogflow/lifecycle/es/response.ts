import * as Ingest from '@voiceflow/general-runtime/build/lib/clients/ingest-client';

import { S, T } from '@/lib/constants';
import { responseHandlersDialogflowES } from '@/lib/services/runtime/handlers';
import { GoogleRuntime } from '@/lib/services/runtime/types';
import logger from '@/logger';

import { AbstractManager, injectServices } from '../../../types';
import { WebhookResponse } from '../../types';
import { addResponseMessage } from './utils';

const utilsObj = {
  responseHandlersDialogflowES,
};

@injectServices({ utils: utilsObj })
class ResponseManager extends AbstractManager<{ utils: typeof utilsObj }> {
  async build(runtime: GoogleRuntime) {
    const { state, utils } = this.services;
    const { storage, turn } = runtime;

    if (runtime.stack.isEmpty()) {
      turn.set(T.END, true);
    }

    const res: WebhookResponse = {
      fulfillmentText: '',
      fulfillmentMessages: [],
      endInteraction: false,
    };

    // prior output because dialogflow doesn't allow you to send an output when there is a followup event input
    if (storage.get(S.PRIOR_OUTPUT)) {
      addResponseMessage(res, storage.get(S.PRIOR_OUTPUT)!);
      storage.delete(S.PRIOR_OUTPUT);
    }

    let output = storage.get<string>(S.OUTPUT) ?? '';
    if (!turn.get(T.DF_ES_TEXT_ENABLED) && !!output) {
      // no text has been used, hence voice project
      output = `<speak>${output}</speak>`;
    }
    addResponseMessage(res, output);

    if (turn.get(T.GOTO)) {
      storage.set(S.PRIOR_OUTPUT, output);
      res.followupEventInput = { name: `${turn.get(T.GOTO)}_event` };
    }

    if (turn.get(T.END)) {
      res.endInteraction = true;
    }

    // eslint-disable-next-line no-restricted-syntax
    for (const handler of utils.responseHandlersDialogflowES) {
      // eslint-disable-next-line no-await-in-loop
      await handler(runtime, res);
    }
    await state.saveToDb(storage.get<string>(S.USER)!, runtime.getFinalState());

    try {
      const turnID = await turn.get<string>(T.TURNID);
      // Track response on analytics system
      runtime.services.analyticsClient.track({
        id: runtime.getVersionID(),
        event: Ingest.Event.INTERACT,
        request: Ingest.RequestType.RESPONSE,
        payload: res,
        sessionid: runtime.getFinalState().storage.user,
        metadata: runtime.getFinalState(),
        timestamp: new Date(),
        turnIDP: turnID,
      });
    } catch (error) {
      logger.error(error);
    }
    return res;
  }
}

export default ResponseManager;
