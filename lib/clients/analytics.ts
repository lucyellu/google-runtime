import { State } from '@voiceflow/general-runtime/build/runtime';
import { SimpleResponse } from 'actions-on-google';

import log from '@/logger';
import { Config } from '@/types';

import { GoogleRequest } from '../services/types';
import IngestApiClient, { Event, IngestApi, InteractBody, RequestType, TurnBody } from './ingest-client';
import { AbstractClient } from './utils';

export class AnalyticsSystem extends AbstractClient {
  // The Rudderstack client is commented due to a possible use in the future
  // private rudderstackClient?: Rudderstack;

  private ingestClient?: IngestApi;

  // private aggregateAnalytics = false;

  constructor(config: Config) {
    super(config);

    // if (config.ANALYTICS_WRITE_KEY && config.ANALYTICS_ENDPOINT) {
    //   this.rudderstackClient = new Rudderstack(config.ANALYTICS_WRITE_KEY, `${config.ANALYTICS_ENDPOINT}/v1/batch`);
    // }

    if (config.INGEST_WEBHOOK_ENDPOINT) {
      this.ingestClient = IngestApiClient(config.INGEST_WEBHOOK_ENDPOINT, undefined);
    }
    // this.aggregateAnalytics = !config.IS_PRIVATE_CLOUD;
  }

  identify(id: string) {
    log.trace(`analytics: Identify ${id}`);

    // const payload: IdentifyRequest = {
    //   userId: id,
    // };
    // if (this.aggregateAnalytics && this.rudderstackClient) {
    //   this.rudderstackClient.identify(payload);
    // }
  }

  // private callAnalyticsSystemTrack(id: string, eventId: Event, metadata: InteractBody) {
  //   const interactAnalyticsBody: TrackRequest = {
  //     userId: id,
  //     event: eventId,
  //     properties: {
  //       metadata,
  //     },
  //   };
  //   this.rudderstackClient!.track(interactAnalyticsBody);
  // }

  private createInteractBody({
    eventID,
    request,
    payload,
    turnID,
    timestamp,
  }: {
    eventID: Event;
    request: RequestType;
    payload: SimpleResponse | GoogleRequest;
    turnID: string;
    timestamp: Date;
  }): InteractBody {
    const isGoogleRequest = (p: SimpleResponse | GoogleRequest): p is GoogleRequest => (p ? 'type' in p : false);
    return {
      eventId: eventID,
      request: {
        turn_id: turnID,
        // eslint-disable-next-line dot-notation
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
    eventID: Event;
    sessionID: string;
    metadata: State;
    timestamp: Date;
  }): TurnBody {
    return {
      eventId: eventID,
      request: {
        session_id: sessionID,
        version_id: versionID,
        state: metadata,
        timestamp: timestamp.toISOString(),
        metadata: {
          locale: metadata.storage.locale,
        },
      },
    } as TurnBody;
  }

  async track({
    id,
    event,
    request,
    payload,
    sessionid,
    metadata,
    timestamp,
    turnIDP,
  }: {
    id: string;
    event: Event;
    request: RequestType;
    payload: SimpleResponse | GoogleRequest;
    sessionid: string;
    metadata: State;
    timestamp: Date;
    turnIDP?: string;
  }): Promise<string> {
    log.trace('analytics: Track');
    switch (event) {
      case Event.TURN: {
        const turnIngestBody = this.createTurnBody({ versionID: id, eventID: event, sessionID: sessionid, metadata, timestamp });

        // User/initial interact
        // if (this.aggregateAnalytics && this.rudderstackClient) {
        //   this.callAnalyticsSystemTrack(id, event, turnIngestBody);
        // }
        const turnResponse = await this.ingestClient?.doIngest(turnIngestBody);
        const turnID = turnResponse?.data.turn_id!;

        const interactIngestBody = this.createInteractBody({ eventID: Event.INTERACT, request, payload, turnID, timestamp });

        // User/initial interact
        // if (this.aggregateAnalytics && this.rudderstackClient) {
        //   this.callAnalyticsSystemTrack(id, event, interactIngestBody);
        // }
        await this.ingestClient?.doIngest(interactIngestBody);

        return turnID;
      }
      case Event.INTERACT: {
        if (turnIDP === undefined) {
          throw new TypeError('turnIDP is undefined');
        }

        const interactIngestBody = this.createInteractBody({ eventID: event, request, payload, turnID: turnIDP, timestamp });

        // User/initial interact
        // if (this.aggregateAnalytics && this.rudderstackClient) {
        //   this.callAnalyticsSystemTrack(id, event, interactIngestBody);
        // }
        await this.ingestClient?.doIngest(interactIngestBody);
        return turnIDP;
      }
      default:
        throw new RangeError(`Unknown event type: ${event}`);
    }
  }
}

const AnalyticsClient = (config: Config) => new AnalyticsSystem(config);

export default AnalyticsClient;
