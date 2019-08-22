import * as express from 'express';
import axios from 'axios';


const PORT = 8080;
const HOST = '0.0.0.0';

class HttpError extends Error {
  statusCode:number;
  date:Date;
  constructor(message = 'Error', statusCode = 500) {
    super(message);
    if(Error.captureStackTrace) {
      Error.captureStackTrace(this, HttpError);
    }
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.date = new Date();
  }
}


const app = express();
app.use((err:HttpError, req:express.Request, res:express.Response, next:express.NextFunction) => {
  console.error(err.message);
  if (!err.statusCode) err.statusCode = 500;
  res.status(err.statusCode).send(err.message);
});


app.get('/', (req:express.Request, res:express.Response, next:express.NextFunction) => {
  axios.get('http://ingestor:8080/').then(result => {
    res.send(`hostname de l'ingestor atteint : ${result.data.hostname}`);
  }).catch(err => {
    res.send(err.message)
    
  })
});

app.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);