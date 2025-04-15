import { Buffer } from 'node:buffer';
import { error, log } from 'node:console';
import { createPrivateKey, hash, randomUUID, sign } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { connect } from 'node:http2';
import { hrtime } from 'node:process';

const config = JSON.parse(await readFile('./config.json'));
const privateKey = createPrivateKey(await readFile('./privateKey.pem'));

function jwt({header, payload, algorithm, privateKey}) {
  return new Promise((resolve, reject) => {
    const data = `${Buffer.from(JSON.stringify(header)).toString('base64url')}.${Buffer.from(JSON.stringify(payload)).toString('base64url')}`;
    const key = {
      key: privateKey,
      dsaEncoding: 'ieee-p1363',
    };
    sign(algorithm, data, key, (err, signature) => {
      return err ? reject(err) : resolve(`${data}.${signature.toString('base64url')}`);
    });
  });
}

function request(requestHeaders, requestBody) {
  return new Promise(resolve => {
    const req = session.request(requestHeaders, {
      endStream: !requestBody,
    });
    if (requestBody) {
      req.end(requestBody);
    }
    let responseBody = '';
    req.on('data', chunk => {
      responseBody += chunk;
    });
    req.on('end', () => {
      return resolve(responseBody);
    });
  });
}

const session = connect('https://cps.transnexus.com');

session.on('error', err => {
  error(err);
});

session.on('connect', async () => {
  const passport = await jwt({
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
      origid: config.originationIdentifier || randomUUID(),
    },
    algorith: 'SHA256',
    privateKey: privateKey,
  });

  const healthStartTime = hrtime();
  const healthResponse = await request({
    ':path': '/health',
  });
  const healthLatency = hrtime(healthStartTime);
  log('------------------- Health Response ------------------');
  log(healthResponse);
  log('');

  const publishAuthenticationToken = await jwt({
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
      jti: randomUUID(),
      dest: {
        tn: [
          config.calledNumber,
        ],
      },
      orig: {
        tn: config.callingNumber,
      },
      passports: `sha256-${hash('sha256', JSON.stringify([passport]), 'base64')}`,
    },
    algorith: 'SHA256',
    privateKey: privateKey,
  });

  const publishStartTime = hrtime();
  const publishResponse = await request({
    ':method': 'POST',
    ':path': `/passports/${config.serviceProviderCode}/${config.calledNumber}/${config.callingNumber}`,
    'authorization': `Bearer ${publishAuthenticationToken}`,
    'content-type': 'application/json',
  }, JSON.stringify({
    passports: [
      passport,
    ],
  }));
  const publishLatency = hrtime(publishStartTime);
  log('------------------ Publish Response ------------------');
  log(publishResponse);
  log('');

  const retrieveAuthenticationToken = await jwt({
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
      jti: randomUUID(),
      dest: {
        tn: [
          config.calledNumber,
        ],
      },
      orig: {
        tn: config.callingNumber,
      },
    },
    algorith: 'SHA256',
    privateKey: privateKey,
  });

  const retrieveStartTime = hrtime();
  const retrieveResponse = await request({
    ':path': `/passports/${config.serviceProviderCode}/${config.calledNumber}/${config.callingNumber}`,
    'authorization': `Bearer ${retrieveAuthenticationToken}`,
  });
  const retrieveLatency = hrtime(retrieveStartTime);
  log('------------------ Retrieve Response -----------------');
  log(retrieveResponse);
  log('');

  log('---------------------- Latency -----------------------');
  log(`Health: ${healthLatency[0] * 1000 + healthLatency[1] / 1000000} ms`);
  log(`Publish: ${publishLatency[0] * 1000 + publishLatency[1] / 1000000} ms`);
  log(`Retrieve: ${retrieveLatency[0] * 1000 + retrieveLatency[1] / 1000000} ms`);

  session.close();
});
