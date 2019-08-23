import * as express from 'express';
import axios from 'axios';
import HttpError from './HttpError';
// import LogFile from './ConsolidatorLogFile';


const PORT = 8080;
const HOST = '0.0.0.0';

const app = express();
app.use(express.json())
app.use((err:HttpError, req:express.Request, res:express.Response, next:express.NextFunction) => {
  console.error(err.message);
  if (!err.statusCode) err.statusCode = 500;
  res.status(err.statusCode).send(err.message);
});

let consolidatorLaunched = false
app.get('/consolidator/start', (req:express.Request, res:express.Response, next:express.NextFunction) => {
  if(consolidatorLaunched){
    res.send('Consolidator already launched')
    return
  }
  consolidatorLaunched = true
  requestIngestors()
  res.send('Consolidator launched')
});

const INTERVAL_MS = 1000
const requestIngestors = () => {
  if(!consolidatorLaunched) return
  const now = Date.now()
  axios.get('http://ingestor:8080/')
  .then(json => {

  }).finally(() => {
    setTimeout(() => {
      requestIngestors()
    }, Math.max(0, INTERVAL_MS - (Date.now() - now)))
  })
}

app.get('/consolidator/stop', (req:express.Request, res:express.Response, next:express.NextFunction) => {
  if(!consolidatorLaunched){
    res.send('Consolidator already stopped')
    return
  }
  consolidatorLaunched = false
  res.send('Consolidator stopped')
});

let logsGenerator = false
app.get('/logs-generator/start', (req:express.Request, res:express.Response, next:express.NextFunction) => {
  if(logsGenerator){
    res.send('Logs Generator already launched')
    return
  }
  logsGenerator = true
  floodIngestors()
  res.send('Logs Generator launched')
});
const logsGeneratorSettings = {
  MAX_INTERVAL_MS : 200,
  NB_SITE : 8,
  NB_INGESTORS : 6
}
const floodIngestors = () => {
  if(!logsGenerator) return
  const now = Date.now()
  Promise.all([...Array(getRandomInteger(logsGeneratorSettings.NB_INGESTORS))].map(() => {
    return  axios.post('http://ingestor:8080/', {
      "vhost" : `site-${getRandomInteger(logsGeneratorSettings.NB_SITE)}.com`,
      "timestamp" : new Date().toISOString(),
      "message" : "test"
    })
  }))
  .finally(() => {
    setTimeout(() => {
      floodIngestors()
    }, Math.max(0, getRandomInteger(logsGeneratorSettings.MAX_INTERVAL_MS) - (Date.now() - now)))
  })
}

const getRandomInteger  = (max:number) => {
  return Math.round(Math.random() * max)
}

app.get('/logs-generator/stop', (req:express.Request, res:express.Response, next:express.NextFunction) => {
  if(!logsGenerator){
    res.send('Logs Generator already stopped')
    return
  }
  logsGenerator = false
  res.send('Logs Generator stopped')
});



app.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);