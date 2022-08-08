import {
  APIHandler,
  CodeHandler,
  EndHandler,
  FlowHandler,
  GoToNodeHandler,
  IfHandler,
  IfV2Handler,
  IntegrationsHandler,
  NextHandler,
  RandomHandler,
  ResetHandler,
  SetHandler,
  SetV2Handler,
  StartHandler,
} from '@voiceflow/general-runtime/build/runtime';

import { Config } from '@/types';

import _V1Handler from './_v1';
import CaptureHandler from './capture';
import CaptureV2Handler from './captureV2';
import CardHandler, { CardResponseBuilder, CardResponseBuilderDialogflowES, CardResponseBuilderV2 } from './card';
import ChoiceHandler, {
  ChipsResponseBuilder,
  ChipsResponseBuilderDialogflowES,
  ChipsResponseBuilderV2,
} from './choice';
import DFESCarouselHandler, { CarouselResponseBuilderDialogflowES } from './dialogflow_es/carousel';
import DFESImageHandler, { ImageResponseBuilderDialogflowES } from './dialogflow_es/image';
import DFESPayloadHandler, { PayloadResponseBuilderDialogflowES } from './dialogflow_es/payload';
import DFESTextHandler from './dialogflow_es/text';
import DirectiveHandler, { DirectiveResponseBuilder } from './directive';
import GoToHandler from './goTo';
import InteractionHandler from './interaction';
import PreliminaryHandler from './preliminary';
import SpeakHandler from './speak';
import StreamHandler, { StreamResponseBuilder, StreamResponseBuilderV2 } from './stream';

export const responseHandlers = [CardResponseBuilder, StreamResponseBuilder, ChipsResponseBuilder];
export const responseHandlersV2 = [
  ChipsResponseBuilderV2,
  CardResponseBuilderV2,
  StreamResponseBuilderV2,
  DirectiveResponseBuilder,
];
export const responseHandlersDialogflowES = [
  ChipsResponseBuilderDialogflowES,
  CardResponseBuilderDialogflowES,
  ImageResponseBuilderDialogflowES,
  PayloadResponseBuilderDialogflowES,
  CarouselResponseBuilderDialogflowES,
];
const _v1Handler = _V1Handler();

// handlers for dialogflow es agent
export const HandlersDialogflowES = ({
  INTEGRATIONS_HANDLER_ENDPOINT,
  CODE_HANDLER_ENDPOINT,
  API_MAX_CONTENT_LENGTH_BYTES,
  API_MAX_BODY_LENGTH_BYTES,
}: Config) => [
  PreliminaryHandler(),
  SpeakHandler(),
  CaptureV2Handler(),
  CaptureHandler('v2'),
  InteractionHandler('v2'),
  GoToHandler(),
  ResetHandler(),
  CardHandler(),
  DFESImageHandler(),
  DFESCarouselHandler(),
  DFESPayloadHandler(),
  DFESTextHandler(),
  ChoiceHandler(),
  CodeHandler({ endpoint: CODE_HANDLER_ENDPOINT }),
  EndHandler(),
  FlowHandler(),
  IfHandler(),
  IfV2Handler({ _v1: _v1Handler }),
  APIHandler({
    maxResponseBodySizeBytes: API_MAX_CONTENT_LENGTH_BYTES ?? undefined,
    maxRequestBodySizeBytes: API_MAX_BODY_LENGTH_BYTES ?? undefined,
  }),
  IntegrationsHandler({ integrationsEndpoint: INTEGRATIONS_HANDLER_ENDPOINT }),
  RandomHandler(),
  SetHandler(),
  SetV2Handler(),
  GoToNodeHandler(),
  StartHandler(),
  NextHandler(),
  _v1Handler,
];

// google handlers for V2 (conversational actions)
export const HandlersV2 = ({
  INTEGRATIONS_HANDLER_ENDPOINT,
  CODE_HANDLER_ENDPOINT,
  API_MAX_CONTENT_LENGTH_BYTES,
  API_MAX_BODY_LENGTH_BYTES,
}: Config) => [
  PreliminaryHandler(),
  SpeakHandler(),
  CaptureV2Handler(),
  CaptureHandler('v2'),
  InteractionHandler('v2'),
  GoToHandler(),
  ResetHandler(),
  CardHandler(),
  DirectiveHandler(),
  ChoiceHandler(),
  StreamHandler(),
  CodeHandler({ endpoint: CODE_HANDLER_ENDPOINT }),
  EndHandler(),
  FlowHandler(),
  IfHandler(),
  IfV2Handler({ _v1: _v1Handler }),
  APIHandler({
    maxResponseBodySizeBytes: API_MAX_CONTENT_LENGTH_BYTES ?? undefined,
    maxRequestBodySizeBytes: API_MAX_BODY_LENGTH_BYTES ?? undefined,
  }),
  IntegrationsHandler({ integrationsEndpoint: INTEGRATIONS_HANDLER_ENDPOINT }),
  RandomHandler(),
  SetHandler(),
  SetV2Handler(),
  GoToNodeHandler(),
  StartHandler(),
  NextHandler(),
  _v1Handler,
];

// google handlers for actions V1 (with dialogflow)
export const HandlersV1 = ({
  INTEGRATIONS_HANDLER_ENDPOINT,
  CODE_HANDLER_ENDPOINT,
  API_MAX_CONTENT_LENGTH_BYTES,
  API_MAX_BODY_LENGTH_BYTES,
}: Config) => [
  SpeakHandler(),
  CaptureHandler(),
  InteractionHandler(),
  GoToHandler(),
  ResetHandler(),
  CardHandler(),
  ChoiceHandler(),
  StreamHandler(),
  CodeHandler({ endpoint: CODE_HANDLER_ENDPOINT }),
  EndHandler(),
  FlowHandler(),
  IfHandler(),
  APIHandler({
    maxResponseBodySizeBytes: API_MAX_CONTENT_LENGTH_BYTES ?? undefined,
    maxRequestBodySizeBytes: API_MAX_BODY_LENGTH_BYTES ?? undefined,
  }),
  IntegrationsHandler({ integrationsEndpoint: INTEGRATIONS_HANDLER_ENDPOINT }),
  RandomHandler(),
  SetHandler(),
  GoToNodeHandler(),
  StartHandler(),
  NextHandler(),
];

export default {
  v1: HandlersV1,
  v2: HandlersV2,
  dialogflowES: HandlersDialogflowES,
};
