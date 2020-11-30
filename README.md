# LibDeltaJS

This is a library for interfacing with Delta Web Map, used by the official client. It will automatically manage most of Delta Web Map for you.

## Usage

To initialize the library, you'll need to first create an enviornment config file. Here is a template, modify it as needed. 

```js
var cfg = {
    API_ENDPOINT: "https://deltamap.net/api",
    ECHO_API_ENDPOINT: "https://echo-content.deltamap.net",
    CONFIG_API_ENDPOINT: "https://config.deltamap.net",
    PACKAGES_API_ENDPOINT: "https://charlie-packages.deltamap.net",
    RPC_HOST: "wss://rpc-prod.deltamap.net",
    ENV: "prod",
    AUTH: {
        AUTH_CLIENT_ID: "66408GC0EFZY2Q9FMA7637WC",
        AUTH_CLIENT_SECRET: "XVAXEL509B0EH2O55FCWLWG3LEU60U2TSSNUMI05Y1"
    }
}
```

Now, initialize the ``DeltaConnection``.

```js
var conn = new DeltaConnection(cfg);
await conn.Init();
```