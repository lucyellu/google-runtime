import { ConversationV3 } from '@assistant/conversation';
import { ChatModels } from '@voiceflow/chat-types';
import Client, { DataAPI, Runtime } from '@voiceflow/general-runtime/build/runtime';
import { GoogleConstants, GoogleProgram, GoogleVersion } from '@voiceflow/google-types';
import { VoiceModels } from '@voiceflow/voice-types';
import { DialogflowConversation } from 'actions-on-google';

import type { FullServiceMap } from '..';
import { WebhookResponse } from '../dialogflow/types';

export enum RequestType {
  INTENT = 'INTENT',
  MEDIA_STATUS = 'MEDIA_STATUS',
}

export enum IntentName {
  VOICEFLOW = 'VoiceFlowIntent',
}

export type VoicePrompt = VoiceModels.Prompt<GoogleConstants.Voice>;
export type ChatPrompt = ChatModels.Prompt;
export type AnyPrompt = VoicePrompt | ChatPrompt;

export const isVoicePrompt = (prompt: unknown): prompt is VoicePrompt => {
  return !!prompt && typeof prompt === 'object' && 'content' in prompt && 'voice' in prompt;
};

export const isChatPrompt = (prompt: unknown): prompt is ChatPrompt => {
  return !!prompt && typeof prompt === 'object' && 'content' in prompt;
};

export const isAnyPrompt = (prompt: unknown): prompt is AnyPrompt => isVoicePrompt(prompt) || isChatPrompt(prompt);

export interface IntentRequestPayload {
  intent: string;
  input: string;
  action?: string;
  slots: { [key: string]: string };
}

export interface IntentRequest {
  type: RequestType.INTENT;
  payload: IntentRequestPayload;
}

export type GoogleRuntimeClient = Client<
  unknown,
  DataAPI<GoogleProgram.Program, GoogleVersion.VoiceVersion>,
  FullServiceMap
>;

export type GoogleRuntime = Runtime<
  unknown,
  DataAPI<GoogleProgram.Program, GoogleVersion.VoiceVersion>,
  FullServiceMap
>;

export type ResponseBuilder = (runtime: GoogleRuntime, conv: DialogflowConversation<any>) => void | boolean;

export type ResponseBuilderV2 = (runtime: GoogleRuntime, conv: ConversationV3) => void | boolean;

export type ResponseBuilderDialogflowES = (runtime: GoogleRuntime, res: WebhookResponse) => void | boolean;
