import { Simple } from '@assistant/conversation';
import { Api as IngestApi, Client as IngestClient } from '@voiceflow/event-ingestion-service/build/lib/client';
import {
  Event,
  IngestableInteraction,
  IngestableTrace,
  RequestType,
} from '@voiceflow/event-ingestion-service/build/lib/types';
import { DataAPI, State } from '@voiceflow/general-runtime/build/runtime';
import { SimpleResponse } from 'actions-on-google';

import log from '@/logger';
import { Config } from '@/types';

import { WebhookResponse } from '../services/dialogflow/types';
import { GoogleRequest } from '../services/types';
import { AbstractClient } from './utils';

type InteractionBody = IngestableInteraction<
  {
    locale?: string;
    end?: boolean;
  },
  Payload
>;

type Payload = SimpleResponse | GoogleRequest | Simple | WebhookResponse;

type TraceBody = IngestableTrace<Payload>;

const isGoogleRequest = (p: Payload): p is GoogleRequest => (p && 'type' in p) ?? false;

interface Metadata extends State {
  platform?: string;
}

// do not ingest traces for matching session ids
const BLACKLISTED_SESSION_IDS = new Set(['actions.session.HEALTH_CHECK']);

export class AnalyticsSystem extends AbstractClient {
  private ingestClient?: IngestApi<InteractionBody, TraceBody>;

  constructor(config: Config, public dataAPI: DataAPI) {
    super(config);

    if (config.INGEST_V2_WEBHOOK_ENDPOINT) {
      this.ingestClient = IngestClient(config.INGEST_V2_WEBHOOK_ENDPOINT, undefined);
    }
  }

  private createTraceBody({
    request,
    payload,
  }: {
    request: RequestType;
    payload: Payload;
    timestamp: Date;
  }): TraceBody {
    return {
      type: isGoogleRequest(payload) ? payload!.type.toLocaleLowerCase() : request,
      payload,
    };
  }

  private createInteractionBody({
    projectID,
    versionID,
    sessionID,
    metadata,
    timestamp,
    request,
    payload,
  }: {
    projectID: string;
    versionID: string;
    sessionID: string;
    metadata: Metadata;
    timestamp: Date;
    request: RequestType;
    payload: Payload;
  }): InteractionBody {
    return {
      projectID,
      sessionID,
      versionID,
      startTime: timestamp.toISOString(),
      platform: metadata.platform ?? '',
      action: {
        type: request,
        payload,
      },
      metadata: {
        locale: metadata.storage.locale,
      },
      traces: [],
    };
  }

  async track({
    projectID,
    versionID,
    event,
    request,
    payload,
    sessionid,
    metadata,
    timestamp,
    turnIDP,
  }: {
    projectID: string;
    versionID: string;
    event: Event;
    request: RequestType;
    payload: Payload;
    sessionid?: string;
    metadata: Metadata;
    timestamp: Date;
    turnIDP?: string;
  }): Promise<string | null> {
    if (sessionid && BLACKLISTED_SESSION_IDS.has(sessionid)) return null;

    versionID = await this.dataAPI.unhashVersionID(versionID);

    log.trace(`[analytics] track ${log.vars({ versionID })}`);

    switch (event) {
      case Event.TURN: {
        if (!sessionid) {
          throw new TypeError('sessionid is required');
        }

        const interactionBody = this.createInteractionBody({
          projectID,
          versionID,
          sessionID: sessionid,
          metadata,
          timestamp,
          request,
          payload,
        });
        const interactionResponse = await this.ingestClient?.ingestInteraction(interactionBody);
        return interactionResponse?.data.turnID!;
      }
      case Event.INTERACT: {
        if (!turnIDP) {
          throw new TypeError('turnIDP is required');
        }

        const interactIngestBody = this.createTraceBody({ request, payload, timestamp });
        await this.ingestClient?.ingestTrace(turnIDP, interactIngestBody);

        return turnIDP;
      }
      default:
        throw new RangeError(`Unknown event type: ${event}`);
    }
  }
}

const AnalyticsClient = ({ config, dataAPI }: { config: Config; dataAPI: DataAPI }) =>
  new AnalyticsSystem(config, dataAPI);

export default AnalyticsClient;
