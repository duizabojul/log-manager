import * as express from 'express';
import { HttpError } from './utils';
import api from './api'

const PORT = 8080;
const HOST = '0.0.0.0';
const app = express();

app.use('/', api)
app.use(express.json())
app.use((err:HttpError, req:express.Request, res:express.Response, next:express.NextFunction) => {
  console.error(err.message);
  if (!err.statusCode) err.statusCode = 500;
  res.status(err.statusCode).send(err.message);
});
app.listen(PORT, HOST);
