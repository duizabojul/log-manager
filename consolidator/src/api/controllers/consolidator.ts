import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import * as moment from 'moment'
import { HttpError, logsManager , minioManager } from '../../utils'

const INTERVAL_MS = 1000
let consolidatorLaunched = false
let consolidatorLaunching = false


const startConsolidator = (req:Request, res:Response, next:NextFunction) => {
  if(consolidatorLaunched){
    res.send('Consolidator already launched')
    return
  }
  if(consolidatorLaunching){
    res.send('Consolidator launching')
    return
  }
  consolidatorLaunching = true
  minioManager.initBucket().then((bucketStatus) => {
    consolidatorLaunching = false
    consolidatorLaunched = true
    requestIngestors()
    minioManager.startCron()
    res.send(`Consolidator launched : ${bucketStatus}`)
  }).catch(err => {
    consolidatorLaunching = false
    next(new HttpError(err))
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


const requestIngestors = () => {
  if(!consolidatorLaunched) return
  const now = Date.now()
  axios.get('http://ingestor:8080/')
  .then(json => {
    if(!json){
      return Promise.reject()
    }
    return storeAllLogs(json.data)
  }).finally(() => {
    setTimeout(() => {
      requestIngestors()
    }, Math.max(0, INTERVAL_MS - (Date.now() - now)))
  })
}

const storeAllLogs = (json:Array<any>) => {
  const logsArr = splitLogsByHostAndDate(json)
  return Promise.all(logsArr.map(logsForHostAndDate => {
    return storeLogsByDateAndHostname(logsForHostAndDate)
    .then(() => {
      return [null, logsForHostAndDate]
    })
    .catch((err:any) => {
      return [err]
    })
  }))
}

const splitLogsByHostAndDate = (json:Array<any>):Array<any> => {
  const map:any = {}
  return json.reduce((acc, curr) => {
    const logDate = moment(curr.timestamp)
    const logDateString = logDate.format('DD-MM-YY')
    const vhost = curr.vhost
    map[logDateString] = map[logDateString] || {}
    let record = map[logDateString][vhost]
    if(record){
      record.logs.push(curr)
    } else {
      record = {
        logDate,
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
  const file = logsManager.getLogFileInstance({logDateString : logsForHostAndDate.logDateString, vhost : logsForHostAndDate.vhost})
  return file.writeNewLogs(logsForHostAndDate.logs)
}



export default {
  startConsolidator,
  stopConsolidator
}