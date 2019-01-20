const fs = require('fs');
const fileUpload = require('express-fileupload');
const service = require('../services/generation.service');

module.exports = (app, modelsService) => {

  app.use(fileUpload());

  const registerExportDB = () => {
    const url = '/api/generation/export/:town';
    app.get(url,
      (req, res) => {
        service.exportDB(modelsService, req.params.town)
          .then(result => {
            setTimeout(() => {
              if (fs.existsSync(`${req.params.town}.xlsx`)) {
                res.download(`${req.params.town}.xlsx`);
              }
            }, 500);
          })
          .catch(err => res.status(500).send(err));
      });
    app.routesInfo['Generation'].push({ model: 'Generation', name: 'Export DB by town', method: 'GET', url: url });
  }

  const registerImportTownData = () => {
    const url = '/api/generation/import/town/:town';
    app.post(url,
      (req, res) => {
        const file = req.files[Object.keys(req.files)[0]];
        if (fs.existsSync(`temp/${file.name}`)) {
          fs.unlinkSync(`temp/${file.name}`);
        }
        file.mv(`temp/${file.name}`, (err) => {
          if (err)
            return res.status(500).send(err);

          service.importTownData(modelsService, req.params.town, `temp/${file.name}`)
            .then(result => res.status(result.statusCode).send(result.data))
            .catch(err => res.status(500).send(err));
        });
      });
    app.routesInfo['Generation'].push({ model: 'Generation', name: 'Import town data', method: 'POST', url: url });
  }

  const registerImportTowns = () => {
    const url = '/api/generation/import/towns';
    app.post(url,
      (req, res) => {
        const dataFile = req.files.towns;
        if (fs.existsSync('temp/towns.xlsx')) {
          fs.unlinkSync('temp/towns.xlsx');
        }
        dataFile.mv('temp/towns.xlsx', (err) => {
          if (err)
            return res.status(500).send(err);

          service.importTowns(modelsService)
            .then(result => res.status(result.statusCode).send(result.data))
            .catch(err => res.status(500).send(err));
        });
      });
    app.routesInfo['Generation'].push({ model: 'Generation', name: 'Import Towns', method: 'POST', url: url });
  }

  const registerDoCalculations = () => {
    const url = '/api/generation/calculate';
    app.get(url,
      (req, res) => {
        service.doCalculations(modelsService)
          .then(result => res.status(200).send('All calculations were made successfully'))
          .catch(err => res.status(500).send(err));
      });
    app.routesInfo['Generation'].push({ model: 'Generation', name: 'Do all calculations', method: 'GET', url: url });
  }

  app.routesInfo['Generation'] = [];
  registerExportDB();
  registerImportTownData();
  registerImportTowns();
  registerDoCalculations();
};