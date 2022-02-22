import * as Ingest from '@voiceflow/general-runtime/build/lib/clients/ingest-client';
import { DataAPI, State } from '@voiceflow/general-runtime/build/runtime';
import { SimpleResponse } from 'actions-on-google';

import log from '@/logger';
import { Config } from '@/types';

import { GoogleRequest } from '../services/types';
import { InteractBody, TurnBody } from './ingest-client';
import { AbstractClient } from './utils';

export class AnalyticsSystem extends AbstractClient {
  private ingestClient?: Ingest.Api<TurnBody, InteractBody>;

  constructor(config: Config, public dataAPI: DataAPI) {
    super(config);

    if (config.INGEST_WEBHOOK_ENDPOINT) {
      this.ingestClient = Ingest.Client(config.INGEST_WEBHOOK_ENDPOINT, undefined);
    }
  }

  private createInteractBody({
    eventID,
    request,
    payload,
    turnID,
    timestamp,
  }: {
    eventID: Ingest.Event;
    request: Ingest.RequestType;
    payload: SimpleResponse | GoogleRequest;
    turnID: string;
    timestamp: Date;
  }): InteractBody {
    const isGoogleRequest = (p: SimpleResponse | GoogleRequest): p is GoogleRequest => (p ? 'type' in p : false);
    return {
      eventId: eventID,
      request: {
        turn_id: turnID,
        type: isGoogleRequest(payload) ? payload!.type.toLocaleLowerCase() : request,
        format: request,
        payload,
        timestamp: timestamp.toISOString(),
      },
    } as InteractBody;
  }

  private createTurnBody({
    versionID,
    eventID,
    sessionID,
    metadata,
    timestamp,
  }: {
    versionID: string;
    eventID: Ingest.Event;
    sessionID: string;
    metadata: State;
    timestamp: Date;
  }): TurnBody {
    return {
      eventId: eventID,
      request: {
        session_id: sessionID,
        version_id: versionID,
        timestamp: timestamp.toISOString(),
        metadata: {
          locale: metadata.storage.locale,
        },
      },
    } as TurnBody;
  }

  async track({
    id: versionID,
    event,
    request,
    payload,
    sessionid,
    metadata,
    timestamp,
    turnIDP,
  }: {
    id: string;
    event: Ingest.Event;
    request: Ingest.RequestType;
    payload: SimpleResponse | GoogleRequest;
    sessionid: string;
    metadata: State;
    timestamp: Date;
    turnIDP?: string;
  }): Promise<string> {
    versionID = await this.dataAPI.unhashVersionID(versionID);
    log.trace(`[analytics] track ${log.vars({ versionID })}`);
    switch (event) {
      case Ingest.Event.TURN: {
        const turnIngestBody = this.createTurnBody({ versionID, eventID: event, sessionID: sessionid, metadata, timestamp });

        const turnResponse = await this.ingestClient?.doIngest(turnIngestBody);
        const turnID = turnResponse?.data.turn_id!;

        const interactIngestBody = this.createInteractBody({ eventID: Ingest.Event.INTERACT, request, payload, turnID, timestamp });

        await this.ingestClient?.doIngest(interactIngestBody);

        return turnID;
      }
      case Ingest.Event.INTERACT: {
        if (turnIDP === undefined) {
          throw new TypeError('turnIDP is undefined');
        }

        const interactIngestBody = this.createInteractBody({ eventID: event, request, payload, turnID: turnIDP, timestamp });

        await this.ingestClient?.doIngest(interactIngestBody);
        return turnIDP;
      }
      default:
        throw new RangeError(`Unknown event type: ${event}`);
    }
  }
}

const AnalyticsClient = ({ config, dataAPI }: { config: Config; dataAPI: DataAPI }) => new AnalyticsSystem(config, dataAPI);

export default AnalyticsClient;
