import { assertEquals } from "./deps.ts";
import { ByondClient } from "./mod.ts";

const TEST_HOSTNAME = "localhost";
const TEST_PORT = 5613;

let listener: Deno.Listener;
let connection: Deno.Conn;

async function mockByondServer(
  expectedPayload: Uint8Array,
  response: Uint8Array
) {
  listener = Deno.listen({
    hostname: TEST_HOSTNAME,
    port: TEST_PORT,
  });
  connection = await listener.accept();

  const payload = new Uint8Array(expectedPayload.length);
  await connection.read(payload);
  assertEquals(payload, expectedPayload);

  await connection.write(response);

  connection.close();
  listener.close();
}

Deno.test("?ping", async () => {
  mockByondServer(
    // ?ping
    Uint8Array.from([0, 131, 0, 11, 0, 0, 0, 0, 0, 63, 112, 105, 110, 103, 0]),
    Uint8Array.from([0, 131, 0, 5, 42, 0, 0, 60, 66])
  );

  const connector = new ByondClient();
  await connector.connect({ hostname: TEST_HOSTNAME, port: TEST_PORT });
  const response = await connector.send("?ping");
  connector.close();

  assertEquals(47, response);
});

Deno.test("ping", async () => {
  // ?ping
  mockByondServer(
    Uint8Array.from([0, 131, 0, 11, 0, 0, 0, 0, 0, 63, 112, 105, 110, 103, 0]),
    Uint8Array.from([0, 131, 0, 5, 42, 0, 0, 60, 66])
  );

  const connector = new ByondClient();
  await connector.connect({ hostname: TEST_HOSTNAME, port: TEST_PORT });
  const response = await connector.send("ping");
  connector.close();

  assertEquals(47, response);
});

Deno.test("?status&comms_key=SuperSecretPassword", async () => {
  mockByondServer(
    // ?ping&comms_key=Super%26Secret%3FPassword
    Uint8Array.from([
      0, 131, 0, 47, 0, 0, 0, 0, 0, 63, 112, 105, 110, 103, 38, 99, 111, 109,
      109, 115, 95, 107, 101, 121, 61, 83, 117, 112, 101, 114, 37, 50, 54, 83,
      101, 99, 114, 101, 116, 37, 51, 70, 80, 97, 115, 115, 119, 111, 114, 100,
      0,
    ]),
    Uint8Array.from([0, 131, 0, 5, 42, 0, 0, 60, 66])
  );

  const connector = new ByondClient();
  await connector.connect({ hostname: TEST_HOSTNAME, port: TEST_PORT });
  const response = await connector.send("?ping", {
    comms_key: "Super&Secret?Password",
  });
  connector.close();

  assertEquals(47, response);
});
