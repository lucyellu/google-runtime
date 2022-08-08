interface Text {
  text: { text: string[] };
}

interface Image {
  image: {
    imageUri: string;
    accessibilityText: string;
  };
}

interface QuickReplies {
  quickReplies: {
    title: string;
    quickReplies: string[];
  };
}

interface Card {
  card: {
    title: string;
    subtitle: string;
    imageUri: string;
    buttons: { text: string; postback: string }[];
  };
}

interface CarouselItem {
  title: string;
  description: string;
  image: {
    accessibilityText?: string;
    imageUri: string;
  };
  info: {
    key: string;
    synonyms: string[];
  };
}

interface Carousel {
  carouselSelect: {
    items: CarouselItem[];
  };
}

type Payload = Record<string, any>;

// https://cloud.google.com/dialogflow/es/docs/reference/rpc/google.cloud.dialogflow.v2beta1#message
export type ResponseMessage = Text | Image | QuickReplies | Card | Payload | Carousel;

export interface WebhookRequest {
  responseId: string;
  queryResult: {
    queryText: string;
    action: string;
    parameters: Record<string, any>;
    allRequiredParamsPresent: boolean;
    outputContexts: Array<{ name: string; parameters: Record<string, any> }>;
    intent: { name: string; displayName: string };
    intentDetectionConfidence: number;
    languageCode: string;
    fulfillmentText?: string;
    fulfillmentMessages?: ResponseMessage[];
  };
  originalDetectIntentRequest: { source?: string; payload: Record<string, any> };
  session: string;
}

export interface WebhookResponse {
  fulfillmentText: string;
  fulfillmentMessages: ResponseMessage[];
  endInteraction: boolean;
  followupEventInput?: { name: string };
}
