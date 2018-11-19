const fs = require('fs');
const fileUpload = require('express-fileupload');
const service = require('../services/generation.service');

module.exports = (app, modelsService) => {

  const registerExportDB = () => {
    const url = '/api/generation/export';
    app.get(url,
      (req, res) => {
        service.exportDB(modelsService)
          .then(result => {
            setTimeout(() => {
              if (fs.existsSync('TubeMapHistory_DB.xlsx')) {
                res.download('TubeMapHistory_DB.xlsx');
              }
            }, 500);
          })
          .catch(err => res.status(500).send(err));
      });
    app.routesInfo['Generation'].push({ model: 'Generation', name: 'Export DB', method: 'GET', url: url });
  }

  const registerImportDB = () => {
    const url = '/api/generation/import';
    app.use(fileUpload());
    app.post(url,
      (req, res) => {
        const dataFile = req.files.dataFile;
        if (fs.existsSync('TubeMapHistory_DB.xlsx')) {
          fs.unlinkSync('TubeMapHistory_DB.xlsx');
        }
        dataFile.mv('TubeMapHistory_DB.xlsx', (err) => {
          if (err)
            return res.status(500).send(err);

          service.importDB(modelsService)
            .then(result => res.status(result.statusCode).send(result.data))
            .catch(err => res.status(500).send(err));
        });
      });
    app.routesInfo['Generation'].push({ model: 'Generation', name: 'Import DB', method: 'POST', url: url });
  }

  app.routesInfo['Generation'] = [];
  registerExportDB();
  registerImportDB();
};