const appleLogin = require('./appleStrategy');
const passportLogin = require('./localStrategy');
const googleLogin = require('./googleStrategy');
const githubLogin = require('./githubStrategy');
const discordLogin = require('./discordStrategy');
const facebookLogin = require('./facebookStrategy');
// Temporarily disable OpenID strategy due to ES module compatibility issue
// const { setupOpenId, getOpenIdConfig } = require('./openidStrategy');
const setupOpenId = async () => {
  console.log('[OpenID] OpenID strategy disabled - ES module compatibility issue');
  return null;
};
const getOpenIdConfig = () => null;
const jwtLogin = require('./jwtStrategy');
const ldapLogin = require('./ldapStrategy');
const { setupSaml } = require('./samlStrategy');
const openIdJwtLogin = require('./openIdJwtStrategy');

module.exports = {
  appleLogin,
  passportLogin,
  googleLogin,
  githubLogin,
  discordLogin,
  jwtLogin,
  facebookLogin,
  setupOpenId,
  getOpenIdConfig,
  ldapLogin,
  setupSaml,
  openIdJwtLogin,
};
