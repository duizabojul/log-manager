import * as fs from 'fs-extra';
import * as uuid from 'uuid/v4';
import * as lockfile from 'lockfile';
import { constants } from '.'

class IngestorLogFile {
  
  path:string
  fileExists:boolean
  jsonOpened:boolean
  jsonClosed:boolean
  openingJsonPromise:any
  pauseWrites:boolean
  writingPromises:Array<any>
  
  constructor (filePath:any){
    this.path = filePath || `${constants.BASE_PATH}/${uuid()}.json`
    this.fileExists = false
    this.jsonOpened = false
    this.jsonClosed = false
    if(filePath){
      this.checkFileStructure()
    }
    this.openingJsonPromise = null
    this.pauseWrites = false
    this.writingPromises = []
  }

  getPath = () => {
    return this.path
  }
  
  lock () {
    try {
      lockfile.lockSync(`${this.path}.lock`)
      return true
    } catch (error) {
      return false
    }
  }
  
  unlock () {
    try {
      lockfile.unlockSync(`${this.path}.lock`)
      return true
    } catch (error) {
      return false
    }
  }
  
  checkFileStructure () {
    this.fileExists = fs.existsSync(this.path)
    const content = this.getFileContentAsString()
    this.jsonOpened = content.length > 0 && content.charAt(0) === '['
    this.jsonClosed = content.length > 0 && content.charAt(content.length -1) === ']'
  }

  getFileContentAsString () {
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
      return fs.writeJson(this.path, {...log, id : promiseId} , {EOL : ',\n', flag : 'a+'})
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
      .then(() => {
        return this.closeJson()
      })
      .catch(() => {
        this.pauseWrites = false
      })
      .then(() => {
        return this.getJsonFromFile()
      })
      .catch(reject)
      .then(json => {
        resolve(json)
        this.removeFromFs()
      })
    })
  }
  
  waitForAllWrites () {
    return Promise.all(this.writingPromises.map(writingPromise => writingPromise.promise.catch((e:any) => e)))
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
    return fs.remove(this.path).then(() => {
      this.jsonOpened = false
      this.jsonClosed = false
      this.fileExists = false
      this.unlock()
    })
  }
  
  static getUnusedFileOrCreate (fileToIgnore:any = null):IngestorLogFile {
    const files = fs.readdirSync(constants.BASE_PATH).filter(fileName => fileName.match(".json$") && (!fileToIgnore || `${constants.BASE_PATH}/${fileName}` !== fileToIgnore.getPath()))
    let unusedFile = null
    for (let index = 0; index < files.length; index++) {
      const filePath= `${constants.BASE_PATH}/${files[index]}`
      const file = new this(filePath)
      if(file.lock()){
        if(file.jsonClosed){
          file.removeFromFs()
        } else {
          unusedFile = file
          break;
        }
      }
    }
    if(!unusedFile){
      unusedFile = new this(null);
      unusedFile.lock()
    } 
    return unusedFile
  }
}


export default IngestorLogFile