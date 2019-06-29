const execFile = require('child_process').execFile;
const argv = require('minimist')(process.argv.slice(2));
require('dotenv').load();

const path = process.env.MONGO_PATH + 'mongorestore.exe';
const host = process.env.MONGO_CLUSTER_HOST;
const user = process.env.MONGO_CLUSTER_USER;
const password = process.env.MONGO_CLUSTER_PASSWORD;
const db_source = argv.source;
const db_target = argv.target;

console.log(db_source);
console.log(db_target);

execFile(path,
  [
    `/host:${host}`,
    '/ssl',
    `/username:${user}`,
    `/password:${password}`,
    `/authenticationDatabase:${user}`,
    `/db:${db_target}`,
    `dump/${db_source}`
  ],
  (err, data) => {
    if (!err) {
      console.log('Database imported successfully');
    }
  });