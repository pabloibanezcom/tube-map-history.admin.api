const express = require('express');
const cors = require('cors')
const path = require('path');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const passport = require('passport');
const flash = require('connect-flash');
const session = require('express-session');

require('dotenv').load();
const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.APP_NAME,
  resave: true,
  saveUninitialized: true
}));

const options = {
  app_name: process.env.APP_NAME,
  token_key: process.env.TOKEN_KEY,
  host: process.env.HOST,
  mongodb_uri: process.env.MONGODB_URI,
  root_path: process.env.ROOT_PATH,
  exampleUsers: require('./app/auth/exampleUsers')
};

let generator;
if (process.env.DEV_MODE) {
  generator = require('../../scaffolding/node-express-mongodb');
} else {
  generator = require('node-express-mongodb');
}

generator.init(app, options);

module.exports = app;
