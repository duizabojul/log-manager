import { Request, Response, NextFunction } from 'express';
import axios from 'axios';

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

  }).finally(() => {
    setTimeout(() => {
      requestIngestors()
    }, Math.max(0, INTERVAL_MS - (Date.now() - now)))
  })
}


export default {
  startConsolidator,
  stopConsolidator
}