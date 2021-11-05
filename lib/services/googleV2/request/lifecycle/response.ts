import { ConversationV3, Simple } from '@assistant/conversation';
import * as Ingest from '@voiceflow/general-runtime/build/lib/clients/ingest-client';

import { S, T } from '@/lib/constants';
import { responseHandlersV2 } from '@/lib/services/runtime/handlers';
import { DirectiveResponseBuilder } from '@/lib/services/runtime/handlers/directive';
import { GoogleRuntime } from '@/lib/services/runtime/types';
import { generateResponseText } from '@/lib/services/utils';
import logger from '@/logger';

import { AbstractManager, injectServices } from '../../../types';
import GoogleManager from '../../index';

const utilsObj = {
  DirectiveResponseBuilder,
  responseHandlersV2,
  Simple,
};

@injectServices({ utils: utilsObj })
class ResponseManager extends AbstractManager<{ utils: typeof utilsObj }> {
  async build(runtime: GoogleRuntime, conv: ConversationV3) {
    const { state, randomstring, utils } = this.services;
    const { storage, turn } = runtime;

    if (runtime.stack.isEmpty()) {
      turn.set(T.END, true);
    }

    const output = storage.get<string>(S.OUTPUT) ?? '';

    const response = new utils.Simple({
      speech: `<speak>${output}</speak>`,
      text: generateResponseText(output),
    });

    if (turn.get(T.GOTO)) {
      conv.scene.next!.name = `${GoogleManager.SLOT_FILLING_PREFIX}${turn.get(T.GOTO)}`;
    }

    if (turn.get(T.END)) {
      conv.scene.next!.name = 'actions.scene.END_CONVERSATION';
    }

    conv.add(response);

    // eslint-disable-next-line no-restricted-syntax
    for (const handler of utils.responseHandlersV2) {
      // eslint-disable-next-line no-await-in-loop
      await handler(runtime, conv);
    }

    await state.saveToDb(storage.get<string>(S.USER)!, runtime.getFinalState());

    conv.user.params.forceUpdateToken = randomstring.generate();

    try {
      const turnID = await turn.get<string>(T.TURNID);
      // Track response on analytics system
      runtime.services.analyticsClient.track({
        id: runtime.getVersionID(),
        event: Ingest.Event.INTERACT,
        request: Ingest.RequestType.RESPONSE,
        payload: response,
        sessionid: conv.session.id,
        metadata: runtime.getFinalState(),
        timestamp: new Date(),
        turnIDP: turnID,
      });
    } catch (error) {
      logger.error(error);
    }
  }
}

export default ResponseManager;
