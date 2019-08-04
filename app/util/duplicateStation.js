const duplicateStation = (station) => {
  return {
    name: station.name,
    geometry: station.geometry,
    year: station.year,
    yearEnd: station.yearEnd,
    markerIcon: station.markerIcon,
    markerColor: station.markerColor,
    town: station.town,
    connections: station.connections
  }
}

module.exports = duplicateStation;