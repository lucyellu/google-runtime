export { Frame as F, default as Flags, Storage as S, Turn as T, Variables as V } from './flags';

export enum Source {
  MONGO = 'mongo',
  DYNAMO = 'dynamo',
  LOCAL = 'local',
}

export const MAIN_MODEL_VERSION = 1;
