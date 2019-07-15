const exec = require('child_process').exec;
const execFile = require('child_process').execFile;
const chalk = require('chalk');
const buildParams = require('./_build_params');
require('dotenv').load();

const exportDB = async () => {

  return new Promise((resolve, reject) => {
    if (!process.env.npm_config_source) {
      console.log(chalk.red('You must provide source ("local", "dev", "test" or "int")'));
      reject();
    }

    const host = process.env.MONGO_CLUSTER_HOST;
    const username = process.env.MONGO_CLUSTER_USER;
    const password = process.env.MONGO_CLUSTER_PASSWORD;
    const db = process.env[`MONGO_DB_${process.env.npm_config_source.toUpperCase()}`];
    const params = {
      host,
      ssl: null,
      username,
      password,
      authenticationDatabase: username,
      db
    };

    const path = process.env.MONGO_PATH ? process.env.MONGO_PATH + 'mongodump.exe' : `mongodump ${buildParams(params)}`;
    const callBack = (err, data) => {
      if (!err) {
        console.log(chalk.green('Database exported successfully'));
        resolve();
      } else {
        reject();
      }
    };

    if (process.env.MONGO_PATH) {
      execFile(path, buildParams(params, true), callBack)
    } else {
      exec(path, callBack);
    }
  });

};

module.exports = exportDB;