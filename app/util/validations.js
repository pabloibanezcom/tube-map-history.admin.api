const validateBody = (body, bodyValidations) => {
  let errors;
  Object.keys(bodyValidations).forEach(key => {
    const error = validations[bodyValidations[key]](body[key]);
    if (error) {
      if (!errors) {
        errors = {};
      }
      errors[key] = [error]
    }
  })
  return errors;
}

const required = (val) => {
  return !val ? 'It is required' : null;
}

const isNumber = (val) => {
  return !(!isNaN(val) &&
    parseInt(Number(val)) == val &&
    !isNaN(parseInt(val, 10))) ? 'It must be a number' : null;
}

const isYear = (val) => {
  return !(!isNumber(val) && val >= 1800 && val <= 2019) ? 'Year must be between 1800 and 2019' : null;
}

const validations = {
  required: required,
  isNumber: isNumber,
  isYear: isYear
}

module.exports = validateBody;
