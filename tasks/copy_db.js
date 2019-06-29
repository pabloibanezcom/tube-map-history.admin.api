const exportDB = require('./db/_export_DB');
const importDB = require('./db/_import_DB');
const deleteDump = require('./db/_delete_dump');

exportDB()
  .then(importDB)
  .then(deleteDump)
  .catch(err => console.log(err));
