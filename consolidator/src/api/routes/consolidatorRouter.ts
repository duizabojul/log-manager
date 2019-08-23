import { Router } from 'express';
import consolidatorController from '../controllers/consolidator';

const consolidatorRouter = Router();

consolidatorRouter.get('/start', consolidatorController.startConsolidator);
consolidatorRouter.get('/stop', consolidatorController.stopConsolidator);

export default consolidatorRouter;