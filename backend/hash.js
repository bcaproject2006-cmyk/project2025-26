const bcrypt = require("bcrypt");

async function generateHash() {
  const password = "AR202006";   // the password you want to login with

  const hash = await bcrypt.hash(password, 10);

  console.log("Your hashed password:");
  console.log(hash);
}

generateHash();