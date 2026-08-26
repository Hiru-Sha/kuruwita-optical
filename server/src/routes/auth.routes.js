const router = require("express").Router();
const { login, registerAdmin } = require("../controllers/auth.controller");

router.post("/login", login);
router.post("/register-admin", registerAdmin); // first time only

module.exports = router;