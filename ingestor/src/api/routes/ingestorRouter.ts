import { Router } from 'express';
import ingestorController from '../controllers/ingestor';

const ingestorRouter = Router();

ingestorRouter.get('/', ingestorController.getLogs);
ingestorRouter.post('/', ingestorController.addLog);

export default ingestorRouter;