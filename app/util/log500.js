const chalk = require('chalk');

const log500 = (err) => {
  console.log(chalk.red('--- 500: INTERNAL SERVER ERROR ---\n'), err);
}
module.exports = log500;