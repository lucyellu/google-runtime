import Promise from 'bluebird';
import { Request, Response } from 'express';

import log from '../../logger';
import { AbstractController } from './utils';

class GoogleController extends AbstractController {
  handler = async (req: Request, res: Response) => {
    const { google } = this.services;

    /**
     * google (dialogflow) webhookclient builds the response so
     * handling errors here because unable to use responseBuilder.route
     */
    await Promise.try(() => google.handleRequest(req, res)).catch((error) => {
      log.error(`[app] [http] [${GoogleController.name}] handler failed ${log.vars({ error })}`);
      if (!res.headersSent) res.status(error.code || 500).send(error.message ?? 'error');
    });
  };

  handlerV2 = async (req: Request, res: Response) => {
    const { googleV2 } = this.services;

    /**
     * googleV2 (conversational actions) webhookclient builds the response so
     * handling errors here because unable to use responseBuilder.route
     */
    await Promise.try(() => googleV2.handleRequest(req, res)).catch((error) => {
      log.error(`[app] [http] [${GoogleController.name}] handlerV2 failed ${log.vars({ error })}`);
      if (!res.headersSent) res.status(error.code || 500).send(error.message ?? 'error');
    });
  };
}

export default GoogleController;
