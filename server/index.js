import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { Readable, Transform } from "node:stream";
import { WritableStream, TransformStream } from "node:stream/web";
import csvtojson from "csvtojson";
import { setTimeout } from "node:timers/promises";

const PORT = 3000;
// curl -i -X OPTIONS -N localhost:3000
// curl -N localhost:3000
createServer(async (req, res) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "*",
  };
  if (req.method === "OPTIONS") {
    res.writeHead(204, headers);
    res.end();
    return;
  }

  let items = 0;
  req.once("close", (_) => console.log(`connection was closed!`, items));
  Readable.toWeb(createReadStream("./animeflv.csv"))
    // o passo a passo que cada item individual vai trafegar
    .pipeThrough(Transform.toWeb(csvtojson()))
    .pipeThrough(
      new TransformStream({
        transform(chunk, controller) {
          //   console.log("chunk", Buffer.from(chunk).toString());
          const data = JSON.parse(Buffer.from(chunk));
          const mappedData = {
            title: data.title,
            description: data.description,
            url_anime: data.url_anime,
          };
          // quebra de linha pois é NDJSON
          controller.enqueue(JSON.stringify(mappedData).concat("\n"));
        },
      })
    )
    // pipeTo é a ultima etapa
    .pipeTo(
      new WritableStream({
        async write(chunk) {
          await setTimeout(200);
          items++;
          res.write(chunk);
        },
        close() {
          res.end();
        },
      })
    );

  res.writeHead(200, headers);
})
  .listen(PORT)
  .on("Listening", (_) => console.log(`Server is running at port ${PORT}`));
