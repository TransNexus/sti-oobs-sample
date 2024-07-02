# STI-OOBS Sample

This script:

1. Generates a PASSporT
1. Checks STI-CPS health
1. Generates an STI-CPS publish authentication token
1. Publishes the PASSporT to the [TransNexus CPS](https://cps.transnexus.com) using an HTTP POST
1. Generates an STI-CPS retrieve authentication token
1. Retrieves the PASSporT from the [TransNexus CPS](https://cps.transnexus.com) using an HTTP GET
1. Prints publish and retrieve latency

The [TransNexus CPS](https://cps.transnexus.com) is a completely free STI-CPS that can be used by any service provider with a SHAKEN certificate issued by an STI-PA approved STI-CA.

## Config

This script requires a private key and a config file to function. The private key must be in the file `./privateKey.pem`. The config file must be `./config.json`. The config file must include all of the fields show below:

```json
{
  "certificateRepositoryUrl": "https://certificates.example.com/example.pem",
  "serviceProviderCode": "1234",
  "callingNumber": "12013776051",
  "calledNumber": "19032469103",
  "attestationLevel": "A",
  "retentionTime": 3
}
```
