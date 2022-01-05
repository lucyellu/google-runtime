import { State } from '@voiceflow/general-runtime/build/runtime';

import { S } from '@/lib/constants';

import { AbstractManager } from '../../../types';
import { WebhookRequest, WebhookResponse } from '../../types';
import { addResponseMessage } from './utils';

class SlotFillingManager extends AbstractManager {
  canHandle(req: WebhookRequest) {
    return !req.queryResult.allRequiredParamsPresent;
  }

  async response(req: WebhookRequest, userID: string): Promise<WebhookResponse> {
    const { state } = this.services;

    const res: WebhookResponse = {
      fulfillmentText: '',
      fulfillmentMessages: [],
      endInteraction: false,
    };

    // prior output because dialogflow doesn't allow you to send an output when there is a followup event input
    const rawState = await state.getFromDb<State>(userID);
    if (rawState.storage[S.PRIOR_OUTPUT]) {
      const { [S.PRIOR_OUTPUT]: priorOutput, ...storage } = rawState.storage;
      addResponseMessage(res, priorOutput);

      rawState.storage = storage;
      await state.saveToDb(userID, rawState);
    }

    addResponseMessage(res, req.queryResult.fulfillmentText!, req.queryResult.fulfillmentMessages);

    return res;
  }
}

export default SlotFillingManager;
