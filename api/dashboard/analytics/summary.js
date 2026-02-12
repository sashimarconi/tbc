const handler = require("../../analytics/summary");

module.exports = async (req, res) => {
  await handler(req, res);
};
