const transformDraftAmounts = (draft) => {
  return {
    ...draft,
    linesAmount: draft.lines.length,
    stationsAmount: draft.stations.length,
    connectionsAmount: draft.connections.length,
    lines: undefined,
    stations: undefined,
    connections: undefined
  }
}

module.exports = transformDraftAmounts;