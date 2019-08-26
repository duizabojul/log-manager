import axios from 'axios';
import * as moment from 'moment';
import { Request, Response, NextFunction } from 'express';
import { HttpError, logsManager , minioManager } from '../../utils'

const INTERVAL_MS = 1000;
let consolidatorLaunched = false;
let consolidatorLaunching = false;


const startConsolidator = (req:Request, res:Response, next:NextFunction) => {
  if(consolidatorLaunched || consolidatorLaunching){
    res.send(`Consolidator ${consolidatorLaunched ? 'already launched' : 'launching'}`);
    return;
  }
  consolidatorLaunching = true;
  minioManager.initBucket().then((bucketStatus) => {
    consolidatorLaunched = true;
    requestIngestors();
    minioManager.startCron();
    res.send(`Consolidator launched : ${bucketStatus}`);
  }).catch(err => {
    next(new HttpError(err));
  }).finally(() => {
    consolidatorLaunching = false;
  })
};


const stopConsolidator = (req:Request, res:Response, next:NextFunction) => {
  if(!consolidatorLaunched){
    res.send('Consolidator already stopped')
    return
  }
  minioManager.stopCron()
  consolidatorLaunched = false
  res.send('Consolidator stopped')
};

const consolidateOnMinio = (req:Request, res:Response, next:NextFunction) => {
  minioManager.consolidateOnMinio()
  .then(() => {
    res.send('OK')
  })
  .catch(err => {
    next(new HttpError(err))
  })
};


const requestIngestors = () => {
  if(!consolidatorLaunched) return
  const now = Date.now()
  axios.get('http://ingestor:8080/')
  .then(res => {
    return storeAllLogs(res.data || [])
  })
  .finally(() => {
    setTimeout(requestIngestors, Math.max(0, INTERVAL_MS - (Date.now() - now)))
  })
}

const storeAllLogs = (json:Array<any>) => {
  if(!Array.isArray(json) || !json.length){
    return Promise.reject('No new logs')
  }
  const logsArr = splitLogsByHostAndDate(json)
  return Promise.all(logsArr.map(logsForHostAndDate => {
    return storeLogsByDateAndHostname(logsForHostAndDate)
  }))
}

const splitLogsByHostAndDate = (json:Array<any>):Array<any> => {
  const map:any = {}
  return json.filter(log => log.vhost && log.timestamp).reduce((acc, curr) => {
    const logDateString = moment(curr.timestamp).format('DD-MM-YY')
    const vhost = curr.vhost
    map[logDateString] = map[logDateString] || {}
    let record = map[logDateString][vhost]
    if(record){
      record.logs.push(curr)
    } else {
      record = {
        logDateString,
        vhost,
        logs : [curr]
      }
      acc.push(record)
      map[logDateString][vhost] = record
    } 
    return acc
  }, [])
}


const storeLogsByDateAndHostname = (logsForHostAndDate:any) => {
  const params = {...logsForHostAndDate}
  const file = logsManager.getLogFileInstance(params)
  return file.writeNewLogs(logsForHostAndDate.logs)
}


export default {
  startConsolidator,
  stopConsolidator,
  consolidateOnMinio
}