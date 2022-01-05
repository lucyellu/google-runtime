import { ResponseMessage, WebhookResponse } from '../../types';

// eslint-disable-next-line import/prefer-default-export
export const addResponseMessage = (res: WebhookResponse, text: string, messages: ResponseMessage[] = [{ text: { text: [text] } }]) => {
  res.fulfillmentText = `${res.fulfillmentText} ${text}`.trim();
  res.fulfillmentMessages.push(...messages);
};
