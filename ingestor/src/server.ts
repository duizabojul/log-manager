import * as os from 'os';
import * as express from 'express';

const PORT = 8080;
const HOST = '0.0.0.0';

const app = express();
app.get('/', (req:express.Request, res:express.Response) => {
  const hostname = os.hostname()
  res.json({hostname});
});

app.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);