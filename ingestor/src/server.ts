import * as express from 'express';
import * as uuid from 'uuid/v1';
import * as fs from 'fs-extra';


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
app.use(express.json())
app.use((err:HttpError, req:express.Request, res:express.Response, next:express.NextFunction) => {
  console.error(err.message);
  if (!err.statusCode) err.statusCode = 500;
  res.status(err.statusCode).send(err.message);
});

let workingFile = {
  path : '',
  initialized: false,
  hasContent : function () {
    return this.initialized && this.path && fs.existsSync(this.path)
  },
  writeNewLog : function(log:Object) {
    this.initialize()
    fs.outputJsonSync(this.path, log , {EOL : ',\n', flag : 'a+'})
  },
  initialize: function() {
    if(this.initialized) return;
    fs.outputFileSync(this.path, '[\n')
    this.initialized = true
  },
  closeAndGetLogs: function(){
    fs.outputFileSync(this.path, '{}\n]', {flag : 'a+'})
    const logs = fs.readJsonSync(this.path)
    logs.pop()
    return logs
  }
}
const initNewWorkingFile = () => {
  const newUuid = uuid()
  const newWorkingFile = {
    uuid: `${newUuid}`,
    path: `/data/${newUuid}.json`,
    initialized: false,
  }
  workingFile = {...workingFile, ...newWorkingFile}
}
initNewWorkingFile()

app.get('/logs', (req:express.Request, res:express.Response, next:express.NextFunction) => {
  const fileToSend = workingFile
  if(!fileToSend.hasContent()) {
    res.json([])
  } else {
    initNewWorkingFile()
    res.json(fileToSend.closeAndGetLogs())
  }
});

app.post('/logs', (req:express.Request, res:express.Response, next:express.NextFunction) => {
  const newLog = req.body;
  if(!newLog || !newLog.vhost || !newLog.timestamp){
    next(new HttpError('Bad log format', 500))
    return
  }
  workingFile.writeNewLog(newLog)
  res.send('OK');
});


app.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);