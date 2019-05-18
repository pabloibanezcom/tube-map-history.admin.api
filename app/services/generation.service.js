const XLSX = require('xlsx');
const connectionService = require('./connection.service');
const getUniqueInArray = require('../util/getUniqueInArray');
const getTown = require('../util/getTown');

const service = {};

service.exportDB = async (modelsService, townIdOrName) => {
  const townId = await getTown(modelsService, townIdOrName);
  if (!townId) {
    return { statusCode: 404, data: 'Town not found' };
  }
  const stations = await modelsService.getModel('Station')
    .find({ town: townId })
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
      .find({ town: townId })
      .sort('order')
      .select('order name shortName colour fontColour year connections')
      .populate({ path: 'connections', sort: 'order', populate: { path: 'stations', select: 'name' } });
    lines.map(l => {

      const line_data = [
        ['order', 'name', 'shortName', 'colour', 'fontColour', 'lineyear', '', 'station_from', 'station_to', 'connectionYear', 'connectionYearEnd'],
        [l.order, l.name, l.shortName, l.colour, l.fontColour, l.year],
        [],
      ];

      l.connections.map(c => {
        line_data.push(['', '', '', '', '', '', '', c.stations[0].name, c.stations[1].name, c.year, c.yearEnd]);
      });

      var lineSheet = XLSX.utils.aoa_to_sheet(line_data);

      XLSX.utils.book_append_sheet(book, lineSheet, `Line_${l.name}`);
    });

    XLSX.writeFile(book, `${townIdOrName}.xlsx`);
    return;
  }
  catch (err) {
    return { statusCode: 500, data: err };
  }
}

service.importTownData = async (modelsService, townIdOrName, fileName) => {
  const town = await getTown(modelsService, townIdOrName, false);
  if (!town) {
    return { statusCode: 404, data: 'Town not found' };
  }
  if (!fileName.includes(town.url)) {
    return { statusCode: 400, data: 'File name does not match Town ID' };
  }
  const Station = modelsService.getModel('Station');
  const Line = modelsService.getModel('Line');
  const Connection = modelsService.getModel('Connection');
  const stationDocuments = [];

  const generateStation = async (stationObj) => {
    const stationDocument = new Station({
      town: town.id,
      name: stationObj.name,
      year: stationObj.year,
      yearEnd: stationObj.yearEnd,
      geometry: {
        type: 'Point',
        coordinates: [
          stationObj.lat,
          stationObj.lng
        ]
      },
      markerIcon: 'multiple'
    });
    return await stationDocument.save();
  }

  const generateLine = async (lineSheet) => {
    const lineDocument = new Line({
      town: town.id,
      order: lineSheet[0].order,
      name: lineSheet[0].name,
      shortName: lineSheet[0].shortName,
      colour: lineSheet[0].colour,
      fontColour: lineSheet[0].fontColour
    });
    return await lineDocument.save();
  }

  const generateConnection = async (line, connection, prevConnection, order) => {
    const stationFromName = connection['station_from'] || prevConnection['station_to'];
    await connectionService.addConnection(modelsService, {
      town: town.id,
      order: order,
      line: line.id,
      stations: [
        stationDocuments.find(s => s.name === stationFromName).id,
        stationDocuments.find(s => s.name === connection['station_to']).id
      ],
      year: connection['connectionYear'],
      yearEnd: connection['connectionYearEnd']
    });
  }

  try {
    const book = XLSX.readFile(fileName);
    // Stations
    await Station.remove({ town: town.id });
    const stations = XLSX.utils.sheet_to_json(book.Sheets['Stations']);
    for (let st of stations) {
      const stationDocument = await generateStation(st);
      stationDocuments.push(stationDocument);
    }
    // Lines and Connections
    await Line.remove({ town: town.id });
    await Connection.remove({ town: town.id });
    for (let sheetName of Object.keys(book.Sheets)) {
      // Line
      if (sheetName.startsWith('Line_')) {
        const line = await generateLine(XLSX.utils.sheet_to_json(book.Sheets[sheetName]));
        // Line connections
        const connections = XLSX.utils.sheet_to_json(book.Sheets[sheetName]).slice(1);
        for (let i = 0; i < connections.length; i++) {
          await generateConnection(line, connections[i], i > 0 ? connections[i - 1] : null, i + 1);
        }
      }
    }
    // Final calculations
    service.doCalculations(modelsService);
    return { statusCode: 200, data: 'All data was imported correctly' };
  }
  catch (err) {
    return { statusCode: 500, data: err };
  }
}

service.importTowns = async (modelsService) => {
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
          tw.lat,
          tw.lng
        ]
      };
      townDocument.zoom = tw.zoom;
      townDocument.year = tw.year;
      townDocument.alias = tw.alias;
      await townDocument.save();
    }
    return { statusCode: 200, data: 'All towns were imported correctly' };
  }
  catch (err) {
    return { statusCode: 500, data: err };
  }
}

service.importCountries = async (modelsService) => {
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

service.doCalculations = async (modelsService) => {

  const Town = modelsService.getModel('Town');
  const Line = modelsService.getModel('Line');
  const Station = modelsService.getModel('Station');
  const Connection = modelsService.getModel('Connection');

  // Towns
  const towns = await Town.find({});
  for (let t of towns) {
    t.linesAmount = await Line.count({ town: t.id });
    t.stationsAmount = await Station.count({ town: t.id });
    t.connectionsAmount = await Connection.count({ town: t.id });
    await t.save();
  }

  // Lines
  const calculateStationsAndDistanceInLine = async (Line) => {
    const lines = await Line.find({}).populate({ path: 'connections', populate: { path: 'stations', select: 'id' } });
    for (const l of lines) {
      const allStations = [];
      l.distance = 0;
      l.connections.forEach(c => {
        c.stations.forEach(s => allStations.push(s.id));
        l.distance += c.distance;
        l.year = !l.year || (l.year > c.year) ? c.year : l.year;
      });
      l.stationsAmount = getUniqueInArray(allStations).length;
      await l.save();
    }
  }

  calculateStationsAndDistanceInLine(Line);
}



module.exports = service;