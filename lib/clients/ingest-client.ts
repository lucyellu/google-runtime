import * as Ingest from '@voiceflow/general-runtime/build/lib/clients/ingest-client';
import { SimpleResponse } from 'actions-on-google';

import { GoogleRequest } from '../services/types';

export type InteractBody = Ingest.InteractBody<SimpleResponse | GoogleRequest>;

export type TurnBody = Ingest.TurnBody<{
  locale?: string;
  end?: boolean;
}>;
