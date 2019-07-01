const isKey = (val) => {
  return !val.includes(' ');
}

const isYear = (val) => {
  return Number.isInteger(val) && val >= 1800 && val <= 2019;
}

const validations = {
  isKey: {
    validator: isKey,
    message: 'This value can not contain spaces'
  },
  isYear: {
    validator: isYear,
    message: 'Year must be between 1800 and 2019'
  }
}

module.exports = validations;
