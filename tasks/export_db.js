const execFile = require('child_process').execFile;
const chalk = require('chalk');
require('dotenv').load();

const exportDB = async () => {

  return new Promise((resolve, reject) => {
    if (!process.env.npm_config_source) {
      console.log(chalk.red('You must provide source ("local", "dev" or "int")'));
      reject();
    }

    const path = process.env.MONGO_PATH + 'mongodump.exe';
    const host = process.env.MONGO_CLUSTER_HOST;
    const user = process.env.MONGO_CLUSTER_USER;
    const password = process.env.MONGO_CLUSTER_PASSWORD;
    const db = process.env[`MONGO_DB_${process.env.npm_config_source.toUpperCase()}`];

    execFile(path,
      [
        `/host:${host}`,
        '/ssl',
        `/username:${user}`,
        `/password:${password}`,
        `/authenticationDatabase:${user}`,
        `/db:${db}`
      ],
      (err, data) => {
        if (!err) {
          console.log(chalk.green('Database exported successfully'));
          resolve();
        } else {
          reject();
        }
      });
  });

};

exportDB();

module.export = exportDB;