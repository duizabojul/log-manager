import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { LogFile } from '../../utils'

let consolidatorLaunched = false
const INTERVAL_MS = 1000

const startConsolidator = (req:Request, res:Response, next:NextFunction) => {
  if(consolidatorLaunched){
    res.send('Consolidator already launched')
    return
  }
  consolidatorLaunched = true
  requestIngestors()
  res.send('Consolidator launched')
};


const stopConsolidator = (req:Request, res:Response, next:NextFunction) => {
  if(!consolidatorLaunched){
    res.send('Consolidator already stopped')
    return
  }
  consolidatorLaunched = false
  res.send('Consolidator stopped')
};


const requestIngestors = () => {
  if(!consolidatorLaunched) return
  const now = Date.now()
  axios.get('http://ingestor:8080/')
  .then(json => {
    return storeAllLogs(json.data)
  }).then((results) => {
    //HANDLE POSSIBLE WRITES FAILURES
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

const storeLogsByDateAndHostname = (logsForHostAndDate:any) => {
  const file = LogFile.getInstance({logDateString : logsForHostAndDate.logDateString, vhost : logsForHostAndDate.vhost})
  return file.writeNewLogs(logsForHostAndDate.logs)
}

const splitLogsByHostAndDate = (json:Array<any>):Array<any> => {
  const map:any = {}
  return json.reduce((acc, curr) => {
    const logDate = new Date(curr.timestamp)
    const logDateString = formatDate(logDate)
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

const formatDate = (date:Date) => {
  var day = date.getDate();
  var month = date.getMonth() + 1;
  var year = date.getFullYear();
  return `${addZeroIfSingleDigit(day)}-${addZeroIfSingleDigit(month)}-${year}`
}

const addZeroIfSingleDigit = (number:Number) => {
  return number < 10 ? `0${number}` : number 
}

export default {
  startConsolidator,
  stopConsolidator
}