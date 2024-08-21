# STI-OOBS Sample

1. Generates a PASSporT
1. Checks the [TransNexus STI-CPS](https://cps.transnexus.com) health
1. Prints the health response body
1. Generates an STI-CPS publish authentication token
1. Publishes the PASSporT to the [TransNexus STI-CPS](https://cps.transnexus.com)
1. Prints the publish response body
1. Generates an STI-CPS retrieve authentication token
1. Retrieves the PASSporT from the [TransNexus STI-CPS](https://cps.transnexus.com)
1. Prints the retrieve response body
1. Prints the latency of each request

## Config

The private key must be in the file `./privateKey.pem`. The config file must be `./config.json`. The config file must include all of the fields show below:

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
