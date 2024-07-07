const responseHelper = (res, code, result) => {
  res.status(code).json(result);
};

module.exports = responseHelper;
