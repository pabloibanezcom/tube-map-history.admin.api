const buildParams = (params, asArguments, sourceDB) => {
  if (asArguments) {
    return Object.entries(params).map(([key, value]) => `/${key}${value ? `:${value}` : ''}`).concat(sourceDB);
  } else {
    return Object.entries(params).map(([key, value]) => `--${key} ${value || ''}`).concat(sourceDB).join(' ');
  }
}

module.exports = buildParams;