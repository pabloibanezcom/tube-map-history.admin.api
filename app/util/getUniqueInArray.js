const getUniqueInArray = (arr) => {
  const seen = {};
  arr.forEach(el => {
    seen[el] = true;
  });
  return Object.keys(seen);
}

module.exports = getUniqueInArray;