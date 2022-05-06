import { ResponseMessage, WebhookResponse } from '../../types';

export const addResponseMessage = (res: WebhookResponse, text: string, messages: ResponseMessage[] = [{ text: { text: [text] } }]) => {
  res.fulfillmentText = `${res.fulfillmentText} ${text}`.trim();
  res.fulfillmentMessages.push(...messages);
};
