# byond_client

> **byond_client** is a Deno implementation of the byond topic protocol used for communicating between byond servers.

### Import

Replace `LATEST_VERSION` with
[current latest version](https://deno.land/x/byond_client)

```ts
import {
    ByondClient
} from "https://deno.land/x/byond_client@LATEST_VERSION/mod.ts";
```

### Usage

```ts
const client = new ByondClient();

await client.connect({
    hostname: "game.yogstation.net",
    port: "4133"
});

// Basic Example: ?ping
const playersOnline = client.send("ping");
console.log(`Players Online: ${playersOnline}`);
/// Players Online: 47

// Using parameters and parsing Byond response: ?status&comms_key=SuperSecretPassword
const info = new URLSearchParams(await client.send("status", {
    comms_key: "SuperSecretPassword"
}));
console.log(`Current Gamemode: ${info.gamemode}`)
/// Current Gamemode: Shadowlings

client.close();
```

### Todo
  1. Locking or Queuing topic requests for thread safety
  2. Connecting pooling
  3. Documentation