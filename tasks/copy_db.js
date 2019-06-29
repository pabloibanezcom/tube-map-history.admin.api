const execFile = require('child_process').execFile;
const chalk = require('chalk');
require('dotenv').load();
const exportDB = require('./export_db');

if (process.env.npm_config_target === process.env.npm_config_source) {
  console.log(chalk.red('Target can not be same as source'));
  return;
}

const copyDB = async () => {
  await exportDB();
}

copyDB();



