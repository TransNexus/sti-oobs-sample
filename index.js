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
        origid: config.originationIdentifier || uuid.v4(),
      },
      secret: privateKey,
    });

    // Check health
    const healthResponse = await axios.request({
      url: `https://cps.transnexus.com/health`,
      method: 'get',
      httpsAgent: agent,
    });
    console.log('------------------- Health Response ------------------');
    console.log(JSON.stringify(healthResponse.data, null, 2), '\n');

    // Generate publish authentication token
    const publishAuthenticationToken = jws.sign({
      header: {
        alg: 'ES256',
        x5u: config.certificateRepositoryUrl,
      },
      payload: {
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + config.retentionTime,
        action: 'publish',
        spc: config.serviceProviderCode,
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
    const publishStartTime = process.hrtime();
    const publishResponse = await axios.request({
      url: `https://cps.transnexus.com/passports/${config.serviceProviderCode}/${config.calledNumber}/${config.callingNumber}`,
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
    const publishLatency = process.hrtime(publishStartTime);
    console.log('------------------ Publish Response ------------------');
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
        spc: config.serviceProviderCode,
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
    const retrieveStartTime = process.hrtime();
    const retrieveResponse = await axios.request({
      url: `https://cps.transnexus.com/passports/${config.serviceProviderCode}/${config.calledNumber}/${config.callingNumber}`,
      method: 'get',
      headers: {
        'Authorization': `Bearer ${retrieveAuthenticationToken}`,
      },
      httpsAgent: agent,
    });
    const retrieveLatency = process.hrtime(retrieveStartTime);
    console.log('------------------ Retrieve Response -----------------');
    console.log(JSON.stringify(retrieveResponse.data, null, 2), '\n');

    // Print latency
    console.log('---------------------- Latency -----------------------');
    console.log(`Publish: ${publishLatency[0] * 1000 + publishLatency[1] / 1000000} ms`);
    console.log(`Retrieve: ${retrieveLatency[0] * 1000 + retrieveLatency[1] / 1000000} ms`);

  } catch (err) {
    console.error(JSON.stringify(err.response.data, null, 2), '\n');
  }
}

main();
