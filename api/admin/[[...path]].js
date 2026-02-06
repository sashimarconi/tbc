const handler = require("../admin-router");

module.exports = async (req, res) => {
  await handler(req, res);
};
