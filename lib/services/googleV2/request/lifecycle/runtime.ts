import { State } from '@voiceflow/general-runtime/build/runtime';

import { S, T } from '@/lib/constants';
import { GoogleRuntime } from '@/lib/services/runtime/types';

import { AbstractManager } from '../../../types';

class RuntimeClientManager extends AbstractManager {
  async build(versionID: string, userID: string): Promise<GoogleRuntime> {
    const { state, runtimeClientV2, dataAPI } = this.services;

    const rawState = await state.getFromDb<State>(userID);
    const version = await dataAPI.getVersion(versionID);
    const runtime = runtimeClientV2.createRuntime(versionID, rawState, undefined, undefined, version);

    runtime.turn.set(T.PREVIOUS_OUTPUT, runtime.storage.get(S.OUTPUT));
    runtime.storage.set(S.OUTPUT, '');

    return runtime;
  }
}

export default RuntimeClientManager;
