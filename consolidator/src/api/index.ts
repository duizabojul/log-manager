import * as express from 'express';
import routes from './routes';

const api = express();

routes.forEach((route:any) => {
  api.use(route.baseRoute, route.router);
});

export default api;