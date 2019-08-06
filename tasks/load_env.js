const exec = require('child_process').exec;
const dotenv = require('dotenv');
const chalk = require('chalk');

if (!process.env.npm_config_env) {
  return
}

const env = dotenv.config({ path: './.env' }).parsed;
Object.assign(env, dotenv.config({ path: `./.env.${process.env.npm_config_env}` }).parsed);

Object.entries(env).forEach(([key, val]) => {
  exec(`heroku config:set ${key}=${val}`);
  console.log(chalk.blue(key), chalk.green(val));
})
