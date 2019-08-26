import * as fs from 'fs-extra';
import * as uuid from 'uuid/v4';
import { minioManager, constants} from '.'

const store:any = {}

class ConsolidatorLogFile {
  path:string
  fileExists:boolean
  jsonOpened:boolean
  jsonClosed:boolean
  openingJsonPromise:any
  pauseWrites:boolean
  writingPromises:Array<any>

  constructor ({path, logDateString, vhost} : {path:any, logDateString:any, vhost:any} ){
    this.path = path || `${constants.BASE_PATH}/${logDateString}/${logDateString}_${vhost}.json`
    this.fileExists = false
    this.jsonOpened = false
    this.jsonClosed = false
    this.checkFileStructure()
    this.openingJsonPromise = null
    this.pauseWrites = false
    this.writingPromises = []
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

  writeNewLogs (logs:Array<Object>) {
    if(this.jsonClosed || this.pauseWrites) return Promise.reject('log file not writable')
    const promiseId = uuid()
    const promise = this.ensureFileExistsAndJsonOpened().then(() => {
      let content:string =  JSON.stringify(logs)
      content = content.substring(1, content.length - 1).replace(/\},\{/g, '},\n{')
      content = `${content},\n`
      return fs.writeFile(this.path, content, {flag : 'a+'})
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

  uploadToMinioAndRemoveFromFs () {
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
        return this.sortJson()
      })
      .then(() => {
        return this.uploadJsonToMinio()
      })
      .catch(reject)
      .then(() => {
        resolve()
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

  sortJson () {
    return this.getJsonFromFile().then(json => {
      const map:any = {}
      const logsArr = json.reduce((acc:Array<any>, curr:any) => {
        if(curr.id && !map[curr.id]){
          map[curr.id] = curr
          acc.push({log : curr, timestamp : new Date(curr.timestamp).getTime()})
        }
        return acc
      }, [])
      logsArr.sort((a:any, b:any) => {
        return a.timestamp - b.timestamp
      })
      let content:string =  JSON.stringify(logsArr.map((log:any) => log.log)).replace(/\},\{/g, '},\n{')
      return fs.writeFile(this.path, content)
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

  hasValidJson () {
    return this.fileExists && this.jsonOpened && this.jsonClosed
  }

  uploadJsonToMinio () {
    return minioManager.addLogsFile(this.path)
  }

  removeFromFs () {
    fs.remove(this.path).then(() => {
      this.jsonOpened = false
      this.jsonClosed = false
      this.fileExists = false
    })
  }

  removeFromStore = () => {
    store[this.path] = null
  }

}

export const getLogFileInstance = (params:any):ConsolidatorLogFile => {
  const filePath = params.path || `${constants.BASE_PATH}/${params.logDateString}/${params.logDateString}_${params.vhost}.json`
  let instance = store[filePath] || new ConsolidatorLogFile(params)
  store[filePath] = instance
  return instance
}

export default {
  getLogFileInstance
}


