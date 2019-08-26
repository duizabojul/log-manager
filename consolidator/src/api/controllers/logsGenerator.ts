import { Request, Response, NextFunction } from 'express';
import axios from 'axios';

let logsGeneratorLaunched = false

const logsGeneratorSettings = {
  MAX_INTERVAL_MS : 200,
  NB_SITE : 8,
  NB_INGESTORS : 6
}

const startLogsGenerator = (req:Request, res:Response, next:NextFunction) => {
  if(logsGeneratorLaunched){
    res.send('Logs Generator already launched')
    return
  }
  logsGeneratorLaunched = true
  floodIngestors()
  res.send('Logs Generator launched')
}

const stopLogsGenerator = (req:Request, res:Response, next:NextFunction) => {
  if(!logsGeneratorLaunched){
    res.send('Logs Generator already stopped')
    return
  }
  logsGeneratorLaunched = false
  res.send('Logs Generator stopped')
}

const floodIngestors = () => {
  if(!logsGeneratorLaunched) return
  const now = Date.now()
  Promise.all([...Array(getRandomInteger(logsGeneratorSettings.NB_INGESTORS))].map(() => {
    return axios.post('http://ingestor:8080/', {
      "vhost" : `site-${getRandomInteger(logsGeneratorSettings.NB_SITE)}.com`,
      "timestamp" : new Date().toISOString(),
      "message" : "test"
    })
  }))
  .finally(() => {
    setTimeout(floodIngestors, Math.max(0, getRandomInteger(logsGeneratorSettings.MAX_INTERVAL_MS) - (Date.now() - now)))
  })
}

const getRandomInteger  = (max:number) => {
  return Math.round(Math.random() * max)
}


export default {
  startLogsGenerator,
  stopLogsGenerator
}