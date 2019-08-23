import * as express from 'express';
import LogFile from './IngestorLogFile';
import HttpError from './HttpError';


const PORT = 8080;
const HOST = '0.0.0.0';
let currentLogFile = LogFile.factory()

const app = express();
app.use(express.json())
app.use((err:HttpError, req:express.Request, res:express.Response, next:express.NextFunction) => {
  console.error(err.message);
  if (!err.statusCode) err.statusCode = 500;
  res.status(err.statusCode).send(err.message);
});

app.get('/', (req:express.Request, res:express.Response, next:express.NextFunction) => {
    const logFileToSend = currentLogFile
  if(!logFileToSend.existsInFs()) {
    res.json([])
  } else {
    currentLogFile = LogFile.factory()
    logFileToSend.getLogsAndRemoveFromFs()
    .then(json => {
      res.json(json)
    })
    .catch((err:any) => {
      next(new HttpError(err))
    })
  }
});

app.post('/', (req:express.Request, res:express.Response, next:express.NextFunction) => {
  const newLog = req.body;
  if(!newLog || !newLog.vhost || !newLog.timestamp){
    next(new HttpError('Bad log format', 500))
    return
  }
  currentLogFile.writeNewLog(newLog)
  .then(() => {
    res.status(200).end();
  })
  .catch((err:any) => {
    next(new HttpError(err))
  })
  
});


app.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);