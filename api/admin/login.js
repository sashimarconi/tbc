const loginHandler = require("../auth/login");

module.exports = async (req, res) => {
  await loginHandler(req, res);
};
