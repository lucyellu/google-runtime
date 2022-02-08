import { BaseButton, BaseModels } from '@voiceflow/base-types';
import { replaceVariables, SLOT_REGEXP, transformStringVariableToNumber } from '@voiceflow/common';
import { Runtime, Store } from '@voiceflow/general-runtime/build/runtime';
import { GoogleNode } from '@voiceflow/google-types';
import { VoiceNode } from '@voiceflow/voice-types';
import _ from 'lodash';

import { S, T } from '@/lib/constants';

interface GoogleDateTimeSlot {
  seconds: number;
  day: number;
  hours: number;
  nanos: number;
  year: number;
  minutes: number;
  month: number;
}

export const transformDateTimeVariableToString = (date: GoogleDateTimeSlot) => {
  if (!date.year && !date.hours) return ''; // not GoogleDateTime type

  // time type
  if (!date.year) return `${date.hours}:${date.minutes}`;

  // date type
  if (!date.hours) return `${date.day}/${date.month}/${date.year}`;

  // datetime type
  return `${date.day}/${date.month}/${date.year} ${date.hours}:${date.minutes ?? '00'}`;
};

export const mapSlots = (mappings: BaseModels.SlotMapping[], slots: { [key: string]: string }, overwrite = false): Record<string, any> => {
  const variables: Record<string, any> = {};

  if (mappings && slots) {
    mappings.forEach((map: BaseModels.SlotMapping) => {
      if (!map.slot) return;

      const toVariable = map.variable;
      const fromSlot = map.slot;

      // extract slot value from request
      const fromSlotValue = slots[fromSlot] || null;

      if (toVariable && (fromSlotValue || overwrite)) {
        variables[toVariable] = _.isObject(fromSlotValue)
          ? transformDateTimeVariableToString(fromSlotValue)
          : transformStringVariableToNumber(fromSlotValue);
      }
    });
  }

  return variables;
};

export const addChipsIfExistsV1 = <B extends { chips?: string[] }>(block: B, runtime: Runtime, variables: Store): void => {
  if (block.chips) {
    runtime.turn.set(
      T.CHIPS,
      block.chips.map((chip) => replaceVariables(chip, variables.getState()))
    );
  }
};

export const replaceIDVariables = (input: string, variables: Record<string, string>) =>
  input.replace(SLOT_REGEXP, (_match, inner) => variables[inner] || inner);

export const addChipsIfExists = <N extends { chips?: BaseButton.Chip[]; buttons?: GoogleNode.Buttons.ButtonNode[] }>(
  node: N,
  runtime: Runtime,
  variables: Store
): void => {
  if (node.buttons) {
    runtime.turn.set(
      T.CHIPS,
      node.buttons.map((button) => replaceIDVariables(button.name, variables.getState()))
    );
  } else if (node.chips) {
    runtime.turn.set(
      T.CHIPS,
      node.chips.map((chip) => replaceIDVariables(chip?.label, variables.getState()))
    );
  }
};

export const addVariables =
  (regex: typeof replaceVariables) =>
  (value: string | undefined | null, variables: Store, defaultValue = '') =>
    value ? regex(value, variables.getState()) : defaultValue;

export const EMPTY_AUDIO_STRING = '<audio src=""/>';

export const removeEmptyPrompts = (prompts?: string[] | null): string[] =>
  prompts?.filter((prompt) => prompt != null && prompt !== EMPTY_AUDIO_STRING) ?? [];

export const addRepromptIfExists = <B extends VoiceNode.Utils.NoReplyNode>(node: B, runtime: Runtime, variables: Store): void => {
  const prompt = _.sample(node.noReply?.prompts || node.reprompt ? [node.reprompt] : []);

  if (prompt) {
    runtime.storage.set(S.REPROMPT, replaceVariables(prompt, variables.getState()));
  }
};
