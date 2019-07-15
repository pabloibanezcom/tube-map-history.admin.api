const fs = require('fs');
const fileUpload = require('express-fileupload');
const service = require('../services/generation.service');

module.exports = (app, modelsService, passport, modelDefinition) => {

  app.use(fileUpload());

  const registerExportDB = () => {
    const url = '/api/generation/export/:town';
    app.get(url,
      passport.authenticate('local-user', { session: false }),
      (req, res) => {
        service.exportDB(modelsService, req.user, req.params.town)
          .then(result => {
            setTimeout(() => {
              if (fs.existsSync(`${req.params.town}.xlsx`)) {
                res.download(`${req.params.town}.xlsx`);
              }
            }, 500);
          })
          .catch(err => res.status(500).send(err));
      });
    app.routesInfo['Generation'].push({ model: 'Generation', name: 'Export DB from town', method: 'GET', url: url, auth: ['A'] });
  }

  const registerImportTownData = () => {
    const url = '/api/generation/import/town/:town';
    app.put(url,
      passport.authenticate('local-user', { session: false }),
      (req, res) => {
        const file = req.files[Object.keys(req.files)[0]];
        if (!fs.existsSync('temp')) {
          fs.mkdirSync('temp');
        }
        if (fs.existsSync(`temp/${file.name}`)) {
          fs.unlinkSync(`temp/${file.name}`);
        }
        file.mv(`temp/${file.name}`, (err) => {
          if (err)
            return res.status(500).send(err);

          service.importTownData(modelsService, req.user, req.params.town, `temp/${file.name}`)
            .then(result => res.status(result.statusCode).send(result.data))
            .catch(err => res.status(500).send(err));
        });
      });
    app.routesInfo['Generation'].push({ model: 'Generation', name: 'Import town data', method: 'PUT', url: url, auth: ['A'] });
  }

  const registerImportTowns = () => {
    const url = '/api/generation/import/towns';
    app.put(url,
      passport.authenticate('local-user', { session: false }),
      (req, res) => {
        const dataFile = req.files.towns;
        if (fs.existsSync('temp/towns.xlsx')) {
          fs.unlinkSync('temp/towns.xlsx');
        }
        dataFile.mv('temp/towns.xlsx', (err) => {
          if (err)
            return res.status(500).send(err);

          service.importTowns(modelsService, req.user)
            .then(result => res.status(result.statusCode).send(result.data))
            .catch(err => res.status(500).send(err));
        });
      });
    app.routesInfo['Generation'].push({ model: 'Generation', name: 'Import Towns', method: 'PUT', url: url, auth: ['A'] });
  }

  const registerImportCountries = () => {
    const url = '/api/generation/import/countries';
    app.put(url,
      passport.authenticate('local-user', { session: false }),
      (req, res) => {
        const dataFile = req.files.countries;
        if (fs.existsSync('temp/countries.xlsx')) {
          fs.unlinkSync('temp/countries.xlsx');
        }
        dataFile.mv('temp/countries.xlsx', (err) => {
          if (err)
            return res.status(500).send(err);

          service.importCountries(modelsService, req.user)
            .then(result => res.status(result.statusCode).send(result.data))
            .catch(err => res.status(500).send(err));
        });
      });
    app.routesInfo['Generation'].push({ model: 'Generation', name: 'Import Countries', method: 'PUT', url: url, auth: ['A'] });
  }

  const registerDoCalculations = () => {
    const url = '/api/generation/calculate/:draftId';
    app.get(url,
      passport.authenticate('local-user', { session: false }),
      (req, res) => {
        service.doCalculations(modelsService, req.user, req.params.draftId)
          .then(result => res.status(200).send('All calculations were made successfully'))
          .catch(err => res.status(500).send(err));
      });
    app.routesInfo['Generation'].push({ model: 'Generation', name: 'Do all calculations', method: 'GET', url: url, auth: ['A'] });
  }

  app.routesInfo['Generation'] = [];
  registerExportDB();
  registerImportTownData();
  registerImportTowns();
  registerImportCountries();
  registerDoCalculations();
};