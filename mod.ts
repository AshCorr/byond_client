import { varnum } from "./deps.ts";

const BYOND_RESPONSE_HEADER_SIZE = 5;

const BYOND_FLOAT_TYPE = 0x2a;
const BYOND_TEXT_TYPE = 0x06;

export class ByondClient {
  #connection?: Deno.TcpConn;

  constructor() {}

  async connect(connectionOptions: Deno.ConnectTlsOptions) {
    this.#connection = await Deno.connect(connectionOptions);
  }

  #urlEncode(topic: string, parameters?: { [key: string]: string }) {
    if (topic[0] !== "?") topic = "?" + topic;

    if (parameters === undefined) return topic;

    Object.keys(parameters).forEach((parameter) => {
      const value = parameters[parameter];

      if (value === undefined) {
        topic = topic += `&${parameter}`;
      } else {
        topic = topic += `&${parameter}=${encodeURIComponent(
          parameters[parameter]
        )}`;
      }
    });

    return topic;
  }

  #createByondPacket(topic: string) {
    const size = 2 + 2 + 5 + topic.length + 1;
    const dataBuffer = new Uint8Array(2 + 2 + 5 + topic.length + 1);
    dataBuffer[0] = 0x00;
    dataBuffer[1] = 0x83;
    dataBuffer[2] = 0x00;
    dataBuffer[3] = 5 + topic.length + 1;
    dataBuffer[4] = 0x00;
    dataBuffer[5] = 0x00;
    dataBuffer[6] = 0x00;
    dataBuffer[7] = 0x00;
    dataBuffer[8] = 0x00;

    const utfEncoded = new TextEncoder().encode(topic);
    dataBuffer.set(utfEncoded, 9);

    dataBuffer[size] = 0x00;

    return dataBuffer;
  }

  #decodeByondRespose(
    headerBuffer: Uint8Array,
    dataBuffer: Uint8Array
  ): number | string {
    const dataType = headerBuffer[4];

    switch (dataType) {
      case BYOND_FLOAT_TYPE: {
        const number = varnum(dataBuffer, {
          dataType: "float32",
          endian: "little",
        });

        if (number === null) {
          throw new Error(
            `Unexpected data from server, was expecting 4 bytes but received ${dataBuffer}`
          );
        }

        return number;
      }
      case BYOND_TEXT_TYPE:
        return new TextDecoder().decode(dataBuffer);
      default:
        throw new Error(
          `Unexpected type header returned by server: ${dataType}`
        );
    }
  }

  #decodeByondResponseSize(headerBuffer: Uint8Array) {
    const responseSize = varnum(headerBuffer.slice(2, 4), {
      dataType: "uint16",
    });

    if (responseSize === null) {
      throw new Error(`Unexpected header returned by server ${headerBuffer}`);
    }

    return responseSize;
  }

  async send(
    topic: string,
    parameters?: { [key: string]: string }
  ): Promise<string | number> {
    if (this.#connection === undefined)
      throw new Error("Tried using send() without open()ing first.");

    const byondPacket = this.#createByondPacket(
      this.#urlEncode(topic, parameters)
    );
    await this.#connection.write(byondPacket);

    const headerBuffer = new Uint8Array(BYOND_RESPONSE_HEADER_SIZE);
    await this.#connection.read(headerBuffer);

    const responseSize = this.#decodeByondResponseSize(headerBuffer);

    const dataBuffer = new Uint8Array(responseSize);
    await this.#connection.read(dataBuffer);

    return this.#decodeByondRespose(headerBuffer, dataBuffer);
  }

  close() {
    this.#connection?.close();
  }
}
