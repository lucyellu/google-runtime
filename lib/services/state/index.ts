import { State as StateObj } from '@voiceflow/general-runtime/build/runtime';

export { default as DynamoState } from './dynamo';
export { default as LocalState } from './local';
export { default as MongoState } from './mongo';

export interface State {
  saveToDb(userId: string, state: StateObj): Promise<void>;

  getFromDb<T extends Record<string, any> = Record<string, any>>(userId: string): Promise<T>;

  deleteFromDb(userId: string): Promise<void>;
}
