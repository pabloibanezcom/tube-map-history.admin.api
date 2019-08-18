const fs = require('fs');
const fileUpload = require('express-fileupload');
const log500 = require('../util/log500');
const service = require('../services/generation.service');

module.exports = (app, modelsService, passport) => {

  app.use(fileUpload());

  const registerExportDraftData = () => {
    const url = '/api/generation/export/draft/:draftId';
    app.get(url,
      passport.authenticate('local-user', { session: false }),
      (req, res) => {
        service.exportDraftData(modelsService, req.user, req.params.draftId)
          .then(result => {
            setTimeout(() => {
              if (fs.existsSync(`${result.fileName}.xlsx`)) {
                res.download(`${result.fileName}.xlsx`);
              }
            }, 500);
          })
          .catch(err => { log500(err); res.status(500).send(err) });
      });
    app.routesInfo['Generation'].push({ model: 'Generation', name: 'Export draft data', method: 'GET', url: url, auth: ['M', 'A'] });
  }

  const registerImportDraftData = () => {
    const url = '/api/generation/import/draft/:draftId';
    app.post(url,
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

          service.importDraftData(modelsService, req.user, req.params.draftId, `temp/${file.name}`)
            .then(result => res.status(result.statusCode).send(result.data))
            .catch(err => { log500(err); res.status(500).send(err) });
        });
      });
    app.routesInfo['Generation'].push({ model: 'Generation', name: 'Import draft data', method: 'POST', url: url, auth: ['M', 'A'] });
  }

  const registerImportTowns = () => {
    const url = '/api/generation/import/towns';
    app.post(url,
      passport.authenticate('local-user', { session: false }),
      (req, res) => {
        const dataFile = req.files.towns;
        if (!fs.existsSync('temp')) {
          fs.mkdirSync('temp');
        }
        if (fs.existsSync('temp/towns.xlsx')) {
          fs.unlinkSync('temp/towns.xlsx');
        }
        dataFile.mv('temp/towns.xlsx', (err) => {
          if (err)
            return res.status(500).send(err);

          service.importTowns(modelsService, req.user, req.body.imgPath)
            .then(result => res.status(result.statusCode).send(result.data))
            .catch(err => { log500(err); res.status(500).send(err) });
        });
      });
    app.routesInfo['Generation'].push({ model: 'Generation', name: 'Import Towns', method: 'POST', url: url, auth: ['A'] });
  }

  const registerImportTownImages = () => {
    const url = '/api/generation/import/towns/images';
    app.post(url,
      passport.authenticate('local-user', { session: false }),
      (req, res) => {
        service.importTownsImages(modelsService, req.user, req.files)
          .then(result => res.status(result.statusCode).send(result.data))
          .catch(err => { log500(err); res.status(500).send(err) });
      });
    app.routesInfo['Generation'].push({ model: 'Generation', name: 'Import Towns images', method: 'POST', url: url, auth: ['A'] });
  }

  const registerImportCountries = () => {
    const url = '/api/generation/import/countries';
    app.post(url,
      passport.authenticate('local-user', { session: false }),
      (req, res) => {
        const dataFile = req.files.countries;
        if (!fs.existsSync('temp')) {
          fs.mkdirSync('temp');
        }
        if (fs.existsSync('temp/countries.xlsx')) {
          fs.unlinkSync('temp/countries.xlsx');
        }
        dataFile.mv('temp/countries.xlsx', (err) => {
          if (err)
            return res.status(500).send(err);

          service.importCountries(modelsService, req.user)
            .then(result => res.status(result.statusCode).send(result.data))
            .catch(err => { log500(err); res.status(500).send(err) });
        });
      });
    app.routesInfo['Generation'].push({ model: 'Generation', name: 'Import Countries', method: 'POST', url: url, auth: ['A'] });
  }

  const registerDoCalculations = () => {
    const url = '/api/generation/calculate/:draftId';
    app.get(url,
      passport.authenticate('local-user', { session: false }),
      (req, res) => {
        service.doCalculations(modelsService, req.user, req.params.draftId)
          .then(result => res.status(200).send('All calculations were made successfully'))
          .catch(err => { log500(err); res.status(500).send(err) });
      });
    app.routesInfo['Generation'].push({ model: 'Generation', name: 'Do all calculations', method: 'GET', url: url, auth: ['A'] });
  }

  app.routesInfo['Generation'] = [];
  registerExportDraftData();
  registerImportDraftData();
  registerImportTowns();
  registerImportTownImages();
  registerImportCountries();
  registerDoCalculations();
};