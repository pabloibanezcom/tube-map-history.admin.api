const duplicateLine = (line) => {
  return {
    order: line.order,
    key: line.key,
    name: line.name,
    shortName: line.shortName,
    colour: line.colour,
    fontColour: line.fontColour,
    year: line.year,
    distance: line.distance,
    stationsAmount: line.stationsAmount,
    startStations: line.startStations,
    town: line.town,
    connections: line.connections
  }
}

module.exports = duplicateLine;