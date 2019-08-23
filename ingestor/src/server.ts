import * as express from 'express';
import api from './api'

const PORT = 8080;
const HOST = '0.0.0.0';
const app = express();

app.use('/', api)
app.listen(PORT, HOST);
