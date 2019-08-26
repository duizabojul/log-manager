import { Request, Response, NextFunction } from 'express';
import { LogFile, HttpError } from '../../utils';

let currentLogFile = LogFile.getUnusedFileOrCreate()

const getLogs = (req:Request, res:Response, next:NextFunction) => {
  const logFileToSend = currentLogFile
  if(logFileToSend.isEmpty()) {
    res.json([])
  } else {
    currentLogFile = LogFile.getUnusedFileOrCreate(logFileToSend)
    logFileToSend.getLogsAndRemoveFromFs()
    .then(json => {
      res.json(json)
    })
    .catch((err:any) => {
      next(new HttpError(err))
    })
  }
};


const addLog = (req:Request, res:Response, next:NextFunction) => {
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

};

export default {
  getLogs,
  addLog
}