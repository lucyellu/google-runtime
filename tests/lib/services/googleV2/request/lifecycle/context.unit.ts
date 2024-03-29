import { expect } from 'chai';
import sinon from 'sinon';

import { S, T } from '@/lib/constants';
import RuntimeClientManager from '@/lib/services/googleV2/request/lifecycle/runtime';

describe('runtimeClientManagerV2 unit tests', async () => {
  describe('build', () => {
    it('works', async () => {
      const outputString = 'output';

      const stateObj = {
        turn: {
          set: sinon.stub(),
        },
        storage: {
          set: sinon.stub(),
          get: sinon.stub().returns(outputString),
        },
      };

      const rawState = { foo: 'bar' };

      const client = {
        createRuntime: sinon.stub().returns(stateObj),
      };

      const versionID = 'version-id';
      const projectID = 'project-id';
      const services = {
        state: {
          getFromDb: sinon.stub().resolves(rawState),
        },
        runtimeClientV2: client,
        dataAPI: {
          getVersion: sinon.stub().resolves({ id: versionID }),
          getProject: sinon.stub().resolves({ id: projectID }),
        },
      };
      const runtimeClientManager = new RuntimeClientManager(services as any, null as any);

      const userID = 'user-id';

      const result = await runtimeClientManager.build(versionID, userID);

      expect(result).to.eql(stateObj);
      expect(services.state.getFromDb.args[0]).to.eql([userID]);
      expect(client.createRuntime.args[0]).to.eql([
        {
          versionID,
          state: rawState,
          version: { id: versionID },
          project: { id: projectID },
        },
      ]);
      expect(stateObj.turn.set.args[0]).to.eql([T.PREVIOUS_OUTPUT, outputString]);
      expect(stateObj.storage.get.args[0]).to.eql([S.OUTPUT]);
      expect(stateObj.storage.set.args[0]).to.eql([S.OUTPUT, '']);
    });
  });
});
