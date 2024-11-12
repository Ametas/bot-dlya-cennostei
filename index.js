require('dotenv').config()
const express = require('express')
const path = require('path')
const bot = require('./bot')

const app = express()
const port = process.env.APP_PORT

app.use(express.static(path.join(__dirname, 'client', 'dist')))

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'dist', 'index.html'))
})

app.listen(port, () => {
  console.log(`http://localhost:${port}`)
})
