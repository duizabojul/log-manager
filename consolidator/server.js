'use strict';
const express = require('express');
const axios = require('axios');

const PORT = 8080;
const HOST = '0.0.0.0';

const app = express();
app.get('/', (req, res) => {
  axios.get('http://ingestor:8080/').then(result => {
    console.log(result)
    res.send(result.data);
  }).catch(err => {
    res.send(err.message)
  })
});

app.listen(PORT, HOST);