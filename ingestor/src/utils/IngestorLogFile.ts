import * as fs from 'fs-extra';
import * as uuid from 'uuid/v4';

class IngestorLogFile {
  id:string
  path:string
  fileExists:boolean
  jsonOpened:boolean
  jsonClosed:boolean
  openingJsonPromise:any
  pauseWrites:boolean
  writingPromises:Array<any>
  constructor (params:any = {id : null}){
    const isNewFile = !params.id
    this.id = params.id || uuid()
    this.path = `/data/logs/${this.id}.json`
    this.fileExists = false
    this.jsonOpened = false
    this.jsonClosed = false
    if(!isNewFile){
      this.checkFileStructure()
    }
    this.openingJsonPromise = null
    this.pauseWrites = false
    this.writingPromises = []
  }

  getId () {
    return this.id
  }

  checkFileStructure () {
    this.fileExists = fs.existsSync(this.path)
    if(this.fileExists){
      const content = this.getContentAsString()
      this.jsonOpened = content.length > 0 && content.charAt(0) === '['
      this.jsonClosed = content.length > 0 && content.charAt(content.length -1) === ']'
    }
  }

  getContentAsString () {
    return this.fileExists ? fs.readFileSync(this.path, {encoding : 'utf8'}) : ''
  }

  isEmpty () {
    return !this.fileExists || !this.jsonOpened
  }

  hasValidJson () {
    return this.fileExists && this.jsonOpened && this.jsonClosed
  }

  writeNewLog (log:Object) {
    if(this.jsonClosed || this.pauseWrites) return Promise.reject('log file not writable')
    const promiseId = uuid()
    const promise = this.ensureFileExistsAndJsonOpened().then(() => {
      return fs.outputJsonSync(this.path, {...log, id : promiseId} , {EOL : ',\n', flag : 'a+'})
    })
    this.writingPromises.push({promiseId, promise})
    promise.finally(() => {
      this.writingPromises = this.writingPromises.filter(writingPromise => writingPromise.promiseId !== promiseId)
    })
    return promise
  }

  ensureFileExistsAndJsonOpened () {
    if(this.jsonOpened) return Promise.resolve()
    this.openingJsonPromise = this.openingJsonPromise || fs.outputFile(this.path, '[\n').then(() => {
      this.fileExists = true
      this.jsonOpened = true
    }).finally(() => {
      this.openingJsonPromise = null
    })
    return this.openingJsonPromise
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
    if(this.jsonClosed) return Promise.resolve() 
    return fs.outputFile(this.path, `${this.jsonOpened ? '' : '['}{}\n]`, {flag : 'a+'}).then(() => {
      this.jsonOpened = true
      this.jsonClosed = true
    })
  }

  getJsonFromFile () {
    if(!this.hasValidJson()){
      return Promise.resolve([])
    } 
    return fs.readJSON(this.path)
    .then(json => json.slice(0,-1)).catch(() => {
      return []
    })
  }

  removeFromFs () {
    fs.removeSync(this.path)
    this.jsonOpened = false
    this.jsonClosed = false
    this.fileExists = false
  }

  static factory(params:any = {id : null}) {
    return new this(params);
  }
}


export default IngestorLogFile