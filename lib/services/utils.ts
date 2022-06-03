import { Store } from '@voiceflow/general-runtime/build/runtime';

import { S } from '../constants';

export const generateResponseText = (output: string) => output.replace(/<[^<>]+\/?>/g, '').trim() || '🔊';

export const checkModelVersion = (storage: Store, minVersion: number) =>
  (storage.get<number>(S.MODEL_VERSION) || 0) >= minVersion;
