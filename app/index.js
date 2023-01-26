const API_URL = "http://localhost:3000";
let counter = 0;

async function consumeAPI(signal) {
  const response = await fetch(API_URL, {
    signal,
  });
  // let counter = 0;
  const reader = response.body
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(parsedNDJSON());
  // .pipeTo(
  //   new WritableStream({
  //     write(chunk) {
  //       console.log(++counter, "chunk", chunk);
  //     },
  //   })
  // );

  return reader;
}

function appendToHTML(element) {
  return new WritableStream({
    write({ title, description, url_anime }) {
      const card = `
      <article class="border border-zinc-700 rounded p-4 bg-zinc-800">
        <div class="flex flex-col gap-2">
          <h3 class="text-xl font-bold">[${++counter}] ${title}</h3>
          <p class="text-sm antialiased">${description.slice(0, 100)}...</p>
          <a href="#" class="underline">${url_anime}</a>
        </div>
      </article>
      `;
      element.innerHTML += card;
    },
    abort(reason) {
      console.log("aborted**");
    },
  });
}

// essa função se certifica se dois chunks cheguem em uma unica transmissão
function parsedNDJSON() {
  let ndjsonBuffer = "";

  return new TransformStream({
    transform(chunk, controller) {
      ndjsonBuffer += chunk;
      const items = ndjsonBuffer.split("\n");
      items
        .slice(0, -1)
        .forEach((item) => controller.enqueue(JSON.parse(item)));

      ndjsonBuffer = items[items.length - 1];
    },
    // verificar algo pendendo que não foi processado
    flush(controller) {
      if (!ndjsonBuffer) return;
      controller.enqueue(JSON.parse(ndjsonBuffer));
    },
  });
}

const [start, stop, cards] = ["start", "stop", "cards"].map((item) =>
  document.getElementById(item)
);

let abordController = new AbortController();
start.addEventListener("click", async () => {
  const readeble = await consumeAPI(abordController.signal);
  readeble.pipeTo(appendToHTML(cards));
});

stop.addEventListener("click", () => {
  abordController.abort();
  console.log("aborting...");
  abordController = new AbortController();
});
