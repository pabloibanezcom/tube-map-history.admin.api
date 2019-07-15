const isSorted = (arr, prop, desc) => {
  return arr.every((x, i) => {
    return i === 0 || (desc ? x[prop] <= arr[i - 1][prop] : x[prop] >= arr[i - 1][prop]);
  });
}

module.exports = isSorted;