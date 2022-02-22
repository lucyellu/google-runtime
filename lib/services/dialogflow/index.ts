import * as Ingest from '@voiceflow/general-runtime/build/lib/clients/ingest-client';

import { T, V } from '@/lib/constants';
import { RequestType } from '@/lib/services/runtime/types';

import { AbstractManager, injectServices } from '../types';
import InitializeES from './lifecycle/es/initialize';
import ResponseES from './lifecycle/es/response';
import RuntimeBuildES from './lifecycle/es/runtime';
import SlotFillingES from './lifecycle/es/slotFilling';
import { WebhookRequest } from './types';

const mainIntent1 = 'actions.intent.MAIN';
const mainIntent2 = 'Default Welcome Intent';

@injectServices({ initializeES: InitializeES, runtimeBuildES: RuntimeBuildES, responseES: ResponseES, slotFillingES: SlotFillingES })
class DialogflowManager extends AbstractManager<{
  initializeES: InitializeES;
  runtimeBuildES: RuntimeBuildES;
  responseES: ResponseES;
  slotFillingES: SlotFillingES;
}> {
  async es(req: WebhookRequest, versionID: string) {
    const { metrics, initializeES, runtimeBuildES, responseES, slotFillingES } = this.services;

    metrics.invocation();

    const intentName = req.queryResult.intent.displayName;
    const input = req.queryResult.queryText;
    const slots = req.queryResult.parameters;

    const userId = req.session;

    // slot filling
    if (slotFillingES.canHandle(req)) {
      return slotFillingES.response(req, userId);
    }

    const runtime = await runtimeBuildES.build(versionID, userId);
    const request = {
      type: RequestType.INTENT,
      payload: {
        intent: intentName,
        input,
        slots,
      },
    };

    if (intentName === mainIntent1 || intentName === mainIntent2 || runtime.stack.isEmpty()) {
      await initializeES.build(runtime, req);

      if (intentName === mainIntent1 || intentName === mainIntent2) {
        runtime.turn.set(
          T.TURN_ID_PROMISE,
          runtime.services.analyticsClient.track({
            id: runtime.getVersionID(),
            event: Ingest.Event.TURN,
            request: Ingest.RequestType.LAUNCH,
            payload: request,
            sessionid: req.session,
            metadata: { ...runtime.getRawState(), platform: 'dialogflow-es' },
            timestamp: new Date(),
          })
        );
      }
    }

    if (!['actions.intent.MAIN', 'Default Welcome Intent'].includes(intentName)) {
      runtime.turn.set(T.REQUEST, request);

      runtime.turn.set(
        T.TURN_ID_PROMISE,
        runtime.services.analyticsClient.track({
          id: runtime.getVersionID(),
          event: Ingest.Event.TURN,
          request: Ingest.RequestType.REQUEST,
          payload: request,
          sessionid: req.session,
          metadata: { ...runtime.getRawState(), platform: 'dialogflow-es' },
          timestamp: new Date(),
        })
      );
    }

    runtime.variables.set(V.TIMESTAMP, Math.floor(Date.now() / 1000));
    runtime.variables.set(V.DF_ES_CHANNEL, this._getChannel(req));

    await runtime.update();

    return responseES.build(runtime);
  }

  /*
    From the docs, the channel is found in the source field of the originalDetectIntentRequest object
    https://cloud.google.com/dialogflow/es/docs/reference/rpc/google.cloud.dialogflow.v2#originaldetectintentrequest
    For some channels like "webdemo" or "dfMessenger" the field is emtpy, but we can infer it from the session id
    (i.e, this is what a session id looks like from dfMessenger:
      projects/english-project-69249/agent/sessions/dfMessenger-32453617/contexts/system_counters)
  */
  _getChannel(req: WebhookRequest) {
    if (req.originalDetectIntentRequest.source) return req.originalDetectIntentRequest.source;

    const specialChannels = ['webdemo', 'dfMessenger'];

    const channel = specialChannels.find((ch) => req.session.includes(ch));

    return channel ?? 'unknown';
  }
}

export default DialogflowManager;
