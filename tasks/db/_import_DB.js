const exec = require('child_process').exec;
const execFile = require('child_process').execFile;
const chalk = require('chalk');
const buildParams = require('./_build_params');
require('dotenv').load();

const importDB = async () => {

  return new Promise((resolve, reject) => {
    if (!process.env.npm_config_source) {
      console.log(chalk.red('You must provide source ("local", "dev" or "int")'));
      reject();
    }

    const host = process.env.MONGO_CLUSTER_HOST;
    const username = process.env.MONGO_CLUSTER_USER;
    const password = process.env.MONGO_CLUSTER_PASSWORD;
    const db_source = `dump/${process.env[`MONGO_DB_${process.env.npm_config_source.toUpperCase()}`]}`;
    const db_target = process.env[`MONGO_DB_${process.env.npm_config_target.toUpperCase()}`];
    const params = {
      host,
      ssl: null,
      username,
      password,
      authenticationDatabase: username,
      db: db_target
    };

    const path = process.env.MONGO_PATH ? process.env.MONGO_PATH + 'mongorestore.exe' : `mongorestore ${buildParams(params, false, db_source)}`;
    const callBack = (err, data) => {
      if (!err) {
        console.log(chalk.green('Database imported successfully'));
        resolve();
      } else {
        console.log(err);
        reject();
      }
    };

    if (process.env.MONGO_PATH) {
      execFile(path, buildParams(params, true, db_source), callBack)
    } else {
      exec(path, callBack);
    }
  });

};

module.exports = importDB;
