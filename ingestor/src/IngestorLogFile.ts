import * as fs from 'fs-extra';
import * as uuid from 'uuid/v4';

class IngestorLogFile {
  id:string
  path:string
  initialized:boolean
  initializingPromise:any
  closed:boolean
  pauseWrites:boolean
  writingPromises:Array<any>
  constructor (params:any = {id : null}){
    this.id = params.id || uuid()
    this.path = `/data/logs/${this.id}.json`
    this.initialized = false
    this.initializingPromise = null
    this.closed = false
    this.pauseWrites = false
    this.writingPromises = []
  }


  existsInFs () {
    return this.initialized
  }

  writeNewLog (log:Object) {
    if(this.closed || this.pauseWrites) return Promise.reject('log file not writable')
    const promiseId = uuid()
    const promise = this.initialize().then(() => {
      return fs.outputJsonSync(this.path, {...log, id : promiseId} , {EOL : ',\n', flag : 'a+'})
    }).finally(() => {
      this.writingPromises = this.writingPromises.filter(writingPromise => writingPromise.promiseId !== promiseId)
    })
    this.writingPromises.push({promiseId, promise})
    return promise
  }

  initialize () {
    if(this.initialized) return Promise.resolve()
    this.initializingPromise = this.initializingPromise || fs.outputFile(this.path, '[\n').then(() => {
      this.initialized = true
    }).finally(() => {
      this.initializingPromise = null
    })
    return this.initializingPromise
  }

  getLogsAndRemoveFromFs () {
    return new Promise((resolve, reject) => {
      this.pauseWrites = true
      this.waitForAllWrites()
      .then(() => this.closeJson())
      .catch((err) => {
        this.pauseWrites = false
        reject(err)
      })
      .then(() => this.getJsonFromFile())
      .then(json => {
        resolve(json)
        this.removeFromFs()
      })
     
    })
  }

  waitForAllWrites () {
    return Promise.all(this.writingPromises.map(promise => promise.catch((e:any) => e)))
  }

  closeJson () {
    if(this.closed) return Promise.resolve() 
    return fs.outputFile(this.path, `${this.initialized ? '' : '['}{}\n]`, {flag : 'a+'}).then(() => {
      this.closed = true
    })
  }

  getJsonFromFile () {
    if(!this.initialized || !this.closed){
      return Promise.resolve([])
    } 
    return fs.readJSON(this.path)
    .then(json => json.slice(0,-1)).catch(() => {
      return []
    })
  }

  removeFromFs () {
    fs.removeSync(this.path)
    this.initialized = false
    this.closed = false
  }

  static factory(params:any = {id : null}) {
    return new this(params);
  }
}


export default IngestorLogFile