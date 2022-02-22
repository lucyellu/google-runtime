import { ConversationV3, Simple } from '@assistant/conversation';
import * as Ingest from '@voiceflow/general-runtime/build/lib/clients/ingest-client';

import { MAIN_MODEL_VERSION, S, T } from '@/lib/constants';
import { responseHandlersV2 } from '@/lib/services/runtime/handlers';
import { DirectiveResponseBuilder } from '@/lib/services/runtime/handlers/directive';
import { GoogleRuntime } from '@/lib/services/runtime/types';
import { checkModelVersion, generateResponseText } from '@/lib/services/utils';
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

    if (checkModelVersion(storage, MAIN_MODEL_VERSION) && conv.request.scene?.name?.startsWith(GoogleManager.SLOT_FILLING_PREFIX)) {
      conv.scene.next!.name = 'main';
    }

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

    const versionID = runtime.getVersionID();

    // not using async await, since analytics is not blocking operation
    // Promise.resolve to fix the cases when T.TURN_ID_PROMISE is not a promise
    Promise.resolve(turn.get<Promise<string>>(T.TURN_ID_PROMISE))
      .then((turnID) =>
        runtime.services.analyticsClient.track({
          id: versionID,
          event: Ingest.Event.INTERACT,
          request: Ingest.RequestType.RESPONSE,
          payload: response,
          sessionid: conv.session.id,
          metadata: { ...runtime.getFinalState(), platform: 'google' },
          timestamp: new Date(),
          turnIDP: turnID,
        })
      )
      .catch((error: unknown) => logger.error(`[analytics] failed to identify ${logger.vars({ versionID, error })}`));
  }
}

export default ResponseManager;
