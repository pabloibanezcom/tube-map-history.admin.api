const fs = require('fs');
const XLSX = require('xlsx');
const verifyRoles = require('../auth/role-verification');
const getUniqueInArray = require('../util/getUniqueInArray');
const getTown = require('../util/getTown');
const addCreatedAndModified = require('../util/addCreatedAndModified');
const storage = require('../util/storage');
const stationService = require('./station.service');
const lineService = require('./line.service');
const connectionService = require('./connection.service');

const service = {};

service.exportDraftData = async (modelsService, exportId) => {

  const draft = await modelsService.getModel('Draft').findOne({ exportId: exportId }).populate({ path: 'town', select: 'url' });
  if (!draft) {
    return { statusCode: 404, data: 'Draft does not exist' };
  }

  const stations = await modelsService.getModel('Station')
    .find({ draft: draft._id })
    .sort('name')
    .select('name geometry year yearEnd');
  try {
    const book = XLSX.utils.book_new();
    // Stations
    const stationsSheet = XLSX.utils.json_to_sheet(stations.map(s => {
      return {
        name: s.name,
        year: s.year,
        yearEnd: s.yearEnd,
        lat: s.geometry.coordinates[0],
        lng: s.geometry.coordinates[1]
      }
    }));
    XLSX.utils.book_append_sheet(book, stationsSheet, 'Stations');
    // Lines
    const lines = await modelsService.getModel('Line')
      .find({ draft: draft._id })
      .sort('order')
      .select('order key name shortName colour fontColour year connections')
      .populate({ path: 'connections', sort: 'order', populate: { path: 'stations', select: 'name' } });
    lines.map(l => {

      const line_data = [
        ['order', 'key', 'name', 'shortName', 'colour', 'fontColour', 'lineyear', '', 'station_from', 'station_to', 'connectionYear', 'connectionYearEnd'],
        [l.order, l.key, l.name, l.shortName, l.colour, l.fontColour, l.year],
        [],
      ];

      l.connections.map(c => {
        line_data.push(['', '', '', '', '', '', '', '', c.stations[0].name, c.stations[1].name, c.year, c.yearEnd]);
      });

      var lineSheet = XLSX.utils.aoa_to_sheet(line_data);

      XLSX.utils.book_append_sheet(book, lineSheet, `Line_${l.shortName}`);
    });

    if (!fs.existsSync('temp')) {
      fs.mkdirSync('temp');
    }

    const fileName = `temp/${draft.town.url}`;

    XLSX.writeFile(book, `${fileName}.xlsx`);
    return { fileName };
  }
  catch (err) {
    return { statusCode: 500, data: err };
  }
}

service.importDraftData = async (modelsService, user, draftId, fileName) => {
  if (!verifyRoles(['M', 'A'], user, draftId)) {
    return { statusCode: 401, data: 'Unauthorized' };
  }

  const draft = await modelsService.getModel('Draft').findOne({ _id: draftId }).populate({ path: 'town', select: 'url' });
  if (!draft) {
    return { statusCode: 404, data: 'Draft does not exist' };
  }

  if (draft.isPublished) {
    return { statusCode: 403, data: 'Draft can not be updated as it is published' };
  }

  if (!fileName.includes(draft.town.url)) {
    return { statusCode: 400, data: 'File name does not match Town ID' };
  }

  const Station = modelsService.getModel('Station');
  const Line = modelsService.getModel('Line');
  const Connection = modelsService.getModel('Connection');
  const stationDocuments = [];

  const clearDraft = async () => {
    await Line.deleteMany({ draft: draft._id });
    await Station.deleteMany({ draft: draft._id });
    await Connection.deleteMany({ draft: draft._id });
  }

  const generateStation = async (station, draftId) => {
    const stationObj = {
      ...station,
      geometry: {
        type: 'Point',
        coordinates: [
          station.lat,
          station.lng
        ]
      }
    }
    return await stationService.addStation(modelsService, user, draftId, stationObj);
  }

  const generateLine = async (lineSheet, draftId) => {
    const lineObj = {
      key: lineSheet[0].key,
      order: lineSheet[0].order,
      name: lineSheet[0].name,
      shortName: lineSheet[0].shortName,
      colour: lineSheet[0].colour,
      fontColour: lineSheet[0].fontColour,
      year: lineSheet[0].lineyear
    };
    return await lineService.addLine(modelsService, user, draftId, lineObj);
  }

  const generateConnection = async (line, connection, prevConnection, draftId) => {
    const stationFromName = connection['station_from'] || prevConnection['station_to'];
    const stationA = stationDocuments.find(s => s.name === stationFromName);
    const stationB = stationDocuments.find(s => s.name === connection['station_to']);

    const connectionObj = {
      line: line.id,
      stations: [
        stationA.id,
        stationB.id
      ],
      year: connection['connectionYear'],
      yearEnd: connection['connectionYearEnd']
    };

    return await connectionService.addConnection(modelsService, user, draftId, connectionObj);
  }

  try {

    const book = XLSX.readFile(fileName);
    if (!book) {
      return { statusCode: 400, data: 'No xlxs file was found' };
    }

    // Clear draft
    await clearDraft();

    // Add stations
    const stations = XLSX.utils.sheet_to_json(book.Sheets['Stations']);
    for (let st of stations) {
      const stationDocument = await generateStation(st, draft._id);
      stationDocuments.push(stationDocument.data);
    }

    // Lines and Connections
    for (let sheetName of Object.keys(book.Sheets)) {
      // Line
      if (sheetName.startsWith('Line_')) {
        const lineRes = await generateLine(XLSX.utils.sheet_to_json(book.Sheets[sheetName]), draft._id);
        // Line connections
        const connections = XLSX.utils.sheet_to_json(book.Sheets[sheetName]).slice(1);
        for (let i = 0; i < connections.length; i++) {
          await generateConnection(lineRes.data, connections[i], i > 0 ? connections[i - 1] : null, draft._id);
        }
      }
    }

    return { statusCode: 200, data: 'All data was imported correctly' };
  }
  catch (err) {
    console.log(err);
    return { statusCode: 500, data: err };
  }
}

service.importTowns = async (modelsService, user, imgPath) => {
  if (!verifyRoles(['A'], user)) {
    return { statusCode: 401, data: 'Unauthorized' };
  }
  const Town = modelsService.getModel('Town');
  const Country = modelsService.getModel('Country');
  try {
    const book = XLSX.readFile('temp/towns.xlsx');
    const towns = XLSX.utils.sheet_to_json(book.Sheets['Towns']);
    for (let tw of towns) {
      let townDocument = await Town.findOne({ url: tw.url });
      if (!townDocument) {
        townDocument = new Town({});
      }
      townDocument.order = tw.oder;
      townDocument.name = tw.name;
      const country = await Country.findOne({ name: tw.country });
      if (country) {
        townDocument.country = country.id;
      }
      townDocument.url = tw.url;
      townDocument.center = {
        type: 'Point',
        coordinates: [
          tw.lng,
          tw.lat
        ]
      };
      townDocument.zoom = tw.zoom;
      townDocument.year = tw.year;
      townDocument.alias = tw.alias;
      townDocument.order = tw.order;

      await townDocument.save();
    }
    return { statusCode: 200, data: 'All towns were imported correctly' };
  }
  catch (err) {
    return { statusCode: 500, data: err };
  }
}

service.importTownsImages = async (modelsService, user, files) => {
  if (!verifyRoles(['A'], user)) {
    return { statusCode: 401, data: 'Unauthorized' };
  }

  const Town = modelsService.getModel('Town');

  const uplodadAndSaveUrl = async (file, folder) => {
    const tempFilePath = `temp/${folder}/${file.name}`;
    file.mv(tempFilePath, async (err) => {
      if (err) {
        return { statusCode: 500, data: err };
      }

      const town = await Town.findOne({ url: file.name.split('.')[0] });
      town.imgCard = await storage.uploadAndGetUrl(tempFilePath, `/${folder}/${file.name}`);
      await town.save();
      fs.unlinkSync(tempFilePath);
    });
  }

  const processFolder = async (folder) => {
    if (files[folder]) {
      if (!fs.existsSync('temp')) {
        fs.mkdirSync('temp');
      }
      if (!fs.existsSync(`temp/${folder}`)) {
        fs.mkdirSync(`temp/${folder}`);
      }
      for (const file of files[folder]) {
        await uplodadAndSaveUrl(file, folder);
      }
    }
  }

  try {
    await processFolder('imgCard');
    return { statusCode: 200, data: 'All town images were imported correctly' };
  }
  catch (err) {
    return { statusCode: 500, data: err };
  }
}

service.importCountries = async (modelsService, user) => {
  if (!verifyRoles(['A'], user)) {
    return { statusCode: 401, data: 'Unauthorized' };
  }
  const Country = modelsService.getModel('Country');
  try {
    const book = XLSX.readFile('temp/countries.xlsx');
    const countries = XLSX.utils.sheet_to_json(book.Sheets['Countries']);
    for (let ct of countries) {
      let countryDocument = await Country.findOne({ code: ct.code });
      if (!countryDocument) {
        countryDocument = new Country({});
      }
      countryDocument.code = ct.code;
      countryDocument.name = ct.name;
      countryDocument.continent = ct.continent;
      await countryDocument.save();
    }
    return { statusCode: 200, data: 'All countries were imported correctly' };
  }
  catch (err) {
    return { statusCode: 500, data: err };
  }
}

service.doCalculations = async (modelsService, user, draftId) => {

  if (!verifyRoles(['A'], user)) {
    return { statusCode: 401, data: 'Unauthorized' };
  }

  const Draft = modelsService.getModel('Draft');
  const Line = modelsService.getModel('Line');
  const Station = modelsService.getModel('Station');
  const Connection = modelsService.getModel('Connection');

  // Draft
  const draft = await Draft.findOne({ _id: draftId });
  const linesAmount = await Line.countDocuments({ draft: draftId });
  const stationsAmount = await Station.countDocuments({ draft: draftId });
  const connectionsAmoun = await Connection.countDocuments({ draft: draftId });
  draft.linesAmount = linesAmount;
  draft.stationsAmount = stationsAmount;
  draft.connectionsAmount = connectionsAmoun;
  await draft.save();

  // Lines
  const calculateStationsAndDistanceInLine = async (Line) => {
    const lines = await Line.find({}).populate({ path: 'connections', populate: { path: 'stations', select: 'id' } });
    for (const l of lines) {
      const allStations = [];
      l.distance = 0;
      l.connections.forEach(c => {
        c.stations.forEach(s => allStations.push(s.id));
        l.distance += c.distance;
      });
      l.stationsAmount = getUniqueInArray(allStations).length;
      await l.save();
    }
  }

  calculateStationsAndDistanceInLine(Line);
}

module.exports = service;