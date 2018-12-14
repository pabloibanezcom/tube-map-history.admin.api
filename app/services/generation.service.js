const XLSX = require('xlsx');
const connectionService = require('./connection.service');
const getUniqueInArray = require('../util/getUniqueInArray');

const service = {};

service.exportDB = async (modelsService) => {
  const stations = await modelsService.getModel('Station')
    .find({})
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
      .find({})
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

    XLSX.writeFile(book, 'TubeMapHistory_DB.xlsx');
    return;
  }
  catch (err) {
    return { statusCode: 500, data: err };
  }
}

service.importDB = async (modelsService) => {
  const Station = modelsService.getModel('Station');
  const Line = modelsService.getModel('Line');
  const Connection = modelsService.getModel('Connection');
  const stationDocuments = [];

  const generateStation = async (stationObj) => {
    const stationDocument = new Station({
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
    const book = XLSX.readFile('TubeMapHistory_DB.xlsx');
    // Stations
    await Station.remove({});
    const stations = XLSX.utils.sheet_to_json(book.Sheets['Stations']);
    for (let st of stations) {
      const stationDocument = await generateStation(st);
      stationDocuments.push(stationDocument);
    }
    // Lines and Connections
    await Line.remove({});
    await Connection.remove({});
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

service.doCalculations = async (modelsService) => {

  const Line = modelsService.getModel('Line');

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