import { routeWrapper } from '@/lib/utils';
import { Config, MiddlewareGroup } from '@/types';

import { FullServiceMap } from '../services';

export interface MiddlewareClass<T = MiddlewareGroup> {
  new (services: FullServiceMap, config: Config): T;
}

/**
 * Build all middlewares
 */
const buildMiddleware = (_services: FullServiceMap, _config: Config) => {
  const middlewares = {};

  // everything before this will be route-wrapped
  routeWrapper(middlewares);

  return middlewares;
};

export type MiddlewareMap = ReturnType<typeof buildMiddleware>;

export default buildMiddleware;
