import { Router } from 'express';
import logsGeneratorController from '../controllers/logsGenerator';

const logsGeneratorRouter = Router();

logsGeneratorRouter.get('/start', logsGeneratorController.startLogsGenerator);
logsGeneratorRouter.get('/stop', logsGeneratorController.stopLogsGenerator);

export default logsGeneratorRouter;