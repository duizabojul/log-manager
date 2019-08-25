import * as Minio from 'minio'
import { CronJob } from 'cron'
import { constants, logsManager } from '.'
import * as moment from 'moment'
import * as fs from 'fs-extra';

const minioClient = new Minio.Client({
  endPoint: 'minio',
  port: 9000,
  useSSL: false,
  accessKey: 'minio',
  secretKey: 'minio123'
});
const BUCKET_NAME = 'logs'

const minioCron = new CronJob('* * * * *', () => {
  consolidateOnMinio()
});

const startCron = () => {
  minioCron.start()
}

const stopCron = () => {
  minioCron.stop()
}

const consolidateOnMinio = () => {
  const today = moment()
  const directories = fs.readdirSync(constants.BASE_PATH, { withFileTypes: true })
  .filter(dirent => dirent.isDirectory())
  .map(dirent => dirent.name)
  directories.forEach(directoryName => {
    const date = moment(directoryName, 'DD-MM-YY')
    if(date.isValid() && date.isBefore(today, 'day')){
      sendDirectoryContentToMinio(directoryName).then(() => {
        fs.remove(`${constants.BASE_PATH}/${directoryName}`)
      })
    }
  })
}

const sendDirectoryContentToMinio = (directoryName:string) => {
  return fs.readdir(`${constants.BASE_PATH}/${directoryName}`).then(files => {
    return Promise.all(files.map(fileName => {
      const file = logsManager.getLogFileInstance({path : `${constants.BASE_PATH}/${directoryName}/${fileName}`})
      return file.uploadToMinioAndRemoveFromFs().then(() => {
        file.removeFromStore()
      })
    }))
  })
}



const initBucket = () => {
  return new Promise((resolve, reject) => {
    minioClient.bucketExists(BUCKET_NAME, (err, exists) => {
      if(err) {
        reject(`Error during bucket check exists : ${err}`)
      } else if (exists) {
        resolve(`Bucket ${BUCKET_NAME} already exists`)
      } else {
        minioClient.makeBucket(BUCKET_NAME, 'us-east-1')
        .then(() => {
          resolve(`Bucket ${BUCKET_NAME} created`)
        }).catch((err:any) => {
          reject(`Error creating bucket : ${err}`)
        })
      }
    })
  })
}

const addLogsFile = (filePath:string) => {
  return minioClient.fPutObject(BUCKET_NAME, filePath.replace(`${constants.BASE_PATH}/`, ''), filePath, {
    'Content-Type': 'application/json',
  })
}


export default {
  initBucket,
  addLogsFile,
  startCron,
  stopCron
}


