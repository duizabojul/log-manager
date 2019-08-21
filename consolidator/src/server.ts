import * as express from 'express';
import axios from 'axios';


const PORT = 8080;
const HOST = '0.0.0.0';

const app = express();
app.get('/', (req:express.Request, res:express.Response) => {
  axios.get('http://ingestor:8080/').then(result => {
    res.send(`hostname de l'ingestor atteint : ${result.data.hostname}`);
  }).catch(err => {
    res.send(err.message)
    
  })
});

app.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);