import * as express from 'express';
import routes from './routes';
import { HttpError } from '../utils';

const api = express();
api.use(express.json())
api.use((err:HttpError, req:express.Request, res:express.Response, next:express.NextFunction) => {
  console.error(err.message);
  if (!err.statusCode) err.statusCode = 500;
  res.status(err.statusCode).send(err.message);
});
routes.forEach((route:any) => {
  api.use(route.baseRoute, route.router);
});

export default api;