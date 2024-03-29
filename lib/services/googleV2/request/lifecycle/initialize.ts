import { ConversationV3 } from '@assistant/conversation';
import { BaseVersion } from '@voiceflow/base-types';
import { Frame, Store } from '@voiceflow/general-runtime/build/runtime';
import { VoiceflowConstants } from '@voiceflow/voiceflow-types';

import { F, S, V } from '@/lib/constants';
import { createResumeFrame, RESUME_DIAGRAM_ID } from '@/lib/services/runtime/programs/resume';
import { GoogleRuntime } from '@/lib/services/runtime/types';

import { AbstractManager, injectServices } from '../../../types';

const utils = {
  resume: {
    createResumeFrame,
    RESUME_DIAGRAM_ID,
  },
  client: {
    Frame,
    Store,
  },
};

@injectServices({ utils })
class InitializeManager extends AbstractManager<{ utils: typeof utils }> {
  static VAR_VF = 'voiceflow';

  async build(runtime: GoogleRuntime, conv: ConversationV3): Promise<void> {
    const { resume, client } = this.services.utils;

    // fetch the metadata for this version (project)
    const {
      platformData: { settings, slots, modelVersion },
      variables: versionVariables,
      rootDiagramID,
    } = await runtime.api.getVersion(runtime.getVersionID());

    const { stack, storage, variables } = runtime;

    // increment user sessions by 1 or initialize
    if (!storage.get(S.SESSIONS)) {
      storage.set(S.SESSIONS, 1);
    } else {
      storage.produce((draft) => {
        draft[S.SESSIONS] += 1;
      });
    }

    // set based on input
    storage.set(S.LOCALE, conv.user.locale);
    if (!conv.user.params.userId) conv.user.params.userId = this.services.uuid4();
    storage.set(S.USER, conv.user.params.userId);

    storage.set(S.MODEL_VERSION, modelVersion ?? 0);

    // default global variables
    variables.merge({
      [V.TIMESTAMP]: 0,
      locale: storage.get(S.LOCALE),
      user_id: storage.get(S.USER),
      sessions: storage.get(S.SESSIONS),
      platform: VoiceflowConstants.PlatformType.GOOGLE,

      // hidden system variables (code block only)
      [InitializeManager.VAR_VF]: {
        // TODO: implement all exposed voiceflow variables
        capabilities: conv.device.capabilities,
        events: [],
      },
    });

    // initialize all the global variables
    client.Store.initialize(variables, versionVariables, 0);
    client.Store.initialize(
      variables,
      slots.map((slot) => slot.name),
      0
    );

    const { session = { type: BaseVersion.SessionType.RESTART } } = settings;
    // restart logic
    const shouldRestart =
      stack.isEmpty() ||
      session.type === BaseVersion.SessionType.RESTART ||
      variables.get<{ resume?: boolean }>(InitializeManager.VAR_VF)?.resume === false;
    if (shouldRestart) {
      // start the stack with just the root flow
      stack.flush();
      stack.push(new client.Frame({ programID: rootDiagramID }));
    } else if (session.type === BaseVersion.SessionType.RESUME && session.resume) {
      // resume prompt flow - use command flow logic
      stack.top().storage.set(F.CALLED_COMMAND, true);

      // if there is an existing resume flow, remove itself and anything above it
      const resumeStackIndex = stack
        .getFrames()
        .findIndex((frame) => frame.getProgramID() === resume.RESUME_DIAGRAM_ID);
      if (resumeStackIndex >= 0) {
        stack.popTo(resumeStackIndex);
      }

      stack.push(resume.createResumeFrame(session.resume, session.follow));
    } else {
      // give runtime to where the user left off with last speak block
      stack.top().storage.delete(F.CALLED_COMMAND);
      const lastSpeak = stack.top().storage.get(F.SPEAK) ?? '';

      storage.set(S.OUTPUT, lastSpeak);
    }
  }
}

export default InitializeManager;
