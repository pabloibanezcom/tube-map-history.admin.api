const buildParams = (params, asArguments, sourceDB) => {
  const sourceDBArr = sourceDB || [];
  if (asArguments) {
    return Object.entries(params).map(([key, value]) => `/${key}${value ? `:${value}` : ''}`).concat(sourceDBArr);
  } else {
    return Object.entries(params).map(([key, value]) => `--${key} ${value || ''}`).concat(sourceDBArr).join(' ');
  }
}

module.exports = buildParams;