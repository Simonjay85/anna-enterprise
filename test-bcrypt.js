const bcrypt = require('bcryptjs');
const hash = "$2b$10$USDfgG4aSPjJ28SkogAhBeRENZ0tllFBr53T8Fr5ng253F9yIG6Pa";
bcrypt.compare("password", hash).then(res => console.log("Matches:", res));
