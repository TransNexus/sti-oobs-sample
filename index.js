// Import packages
const crypto = require('crypto');
const https = require('https');
const fs = require('fs');
const axios = require('axios');
const jws = require('jws');
const uuid = require('uuid');

// Load config file and private key
const config = require('./config.json');
const privateKey = fs.readFileSync('./privateKey.pem');

// Create https agent for connection reuse
const agent = new https.Agent({
  keepAlive: true,
});

async function main() {
  try {
    // Generate PASSporT
    const passport = jws.sign({
      header: {
        alg: 'ES256',
        ppt: 'shaken',
        typ: 'passport',
        x5u: config.certificateRepositoryUrl,
      },
      payload: {
        attest: config.attestationLevel,
        dest: {
          tn: [
            config.calledNumber,
          ],
        },
        iat: Math.floor(Date.now() / 1000),
        orig: {
          tn: config.callingNumber,
        },
        origid: uuid.v4(),
      },
      secret: privateKey,
    });

    // Generate publish authentication token
    const publishAuthenticationToken = jws.sign({
      header: {
        alg: 'ES256',
        x5u: config.certificateRepositoryUrl,
      },
      payload: {
        iat: Math.floor(Date.now() / 1000),
        action: 'publish',
        sub: config.serviceProviderCode,
        iss: config.serviceProviderCode,
        aud: 'cps.transnexus.com',
        jti: uuid.v4(),
        dest: {
          tn: [
            config.calledNumber,
          ],
        },
        orig: {
          tn: config.callingNumber,
        },
        passports: `sha256-${crypto.createHash('sha256').update(JSON.stringify([passport])).digest('base64')}`,
      },
      secret: privateKey,
    });

    // Publish PASSporT
    console.log('------------------ Publish Response ------------------');
    const publishResponse = await axios.request({
      url: `https://cps.transnexus.com/passports/${config.calledNumber}/${config.callingNumber}`,
      method: 'post',
      data: {
        passports: [
          passport,
        ],
      },
      headers: {
        'Authorization': `Bearer ${publishAuthenticationToken}`,
      },
      httpsAgent: agent,
    });
    console.log(JSON.stringify(publishResponse.data, null, 2), '\n');

    // Generate retrieve authentication token
    const retrieveAuthenticationToken = jws.sign({
      header: {
        alg: 'ES256',
        x5u: config.certificateRepositoryUrl,
      },
      payload: {
        iat: Math.floor(Date.now() / 1000),
        action: 'retrieve',
        sub: config.serviceProviderCode,
        iss: config.serviceProviderCode,
        aud: 'cps.transnexus.com',
        jti: uuid.v4(),
        dest: {
          tn: [
            config.calledNumber,
          ],
        },
        orig: {
          tn: config.callingNumber,
        },
      },
      secret: privateKey,
    });

    // Retrieve PASSporT
    console.log('------------------ Retrieve Response ------------------');
    const retrieveResponse = await axios.request({
      url: `https://cps.transnexus.com/passports/${config.calledNumber}/${config.callingNumber}`,
      method: 'get',
      headers: {
        'Authorization': `Bearer ${retrieveAuthenticationToken}`,
      },
      httpsAgent: agent,
    });
    console.log(JSON.stringify(retrieveResponse.data, null, 2), '\n');

  } catch (err) {
    console.error(JSON.stringify(err.response.data, null, 2), '\n');
  }
}

main();
