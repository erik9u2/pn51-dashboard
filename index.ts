const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PN51 Dashboard</title>
  <style>
  pre {
    background-color: #eee;
    border: 1px solid #ccc;
    padding: 5px;
    overflow: auto;
  }
  </style>
</head>
<body id="app">
  <main>
    <h1>PN51 Dashboard</h1>
    <label>
      Timeout:
      <input value="2000" id="timeout">
    </label>
    <section>
      <h2>uname -a</h2>
      <pre id="uname"></pre>
    </section>
    <section>
      <h2>uptime</h2>
      <pre id="uptime"></pre>
    </section>
    <section>
      <h2>free -h</h2>
      <pre id="memory"></pre>
    </section>
    <section>
      <h2>df -h</h2>
      <pre id="disk"></pre>
    </section>
    <section>
      <h2>sensors</h2>
      <pre id="sensors"></pre>
    </section>
    <section>
      <h2>monero.log</h2>
      <pre id="monerolog"></pre>
    </section>
  </main>
  <script>
    (async () => {
      const refresh = async () => {
        const response = await fetch("/data");
        const json = await response.json();
        for (const key of Object.keys(json)) {
          document.getElementById(key).innerHTML = json[key];
        }
        const defaultTimeout = 2000;
        const timeout = document.getElementById("timeout").value;
        const timeoutInt = parseInt(timeout, 10) || defaultTimeout;
        setTimeout(refresh, Math.max(defaultTimeout, timeoutInt));
      };
      refresh();
    })();
  </script>
</body>
</html>
`;

const exec = async (cmd: string[]) => {
  const process = Deno.run({
    cmd,
    stdout: "piped",
  });
  const status = await process.status();
  if (status.success) {
    const rawOutput = await process.output();
    return new TextDecoder().decode(rawOutput);
  } else {
    return "-";
  }
};

const options = {
  port: 14044,
};

const server = Deno.listen(options);

for await (const conn of server) {
  serveHttp(conn);
}

async function serveHttp(conn: Deno.Conn) {
  const httpConn = Deno.serveHttp(conn);
  for await (const requestEvent of httpConn) {
    const isDataReq = requestEvent.request.url.endsWith("/data");
    if (isDataReq) {
      requestEvent.respondWith(
        new Response(
          JSON.stringify({
            uname: await exec(["uname", "-a"]),
            uptime: await exec(["uptime"]),
            memory: await exec(["free", "-h"]),
            disk: await exec(["df", "-h"]),
            sensors: await exec(["sensors"]),
            monerolog: await exec(["tail", "/var/log/monero/monero.log"]),
          }),
          {
            status: 200,
            headers: {
              "content-type": "application/json; charset=UTF-8",
            },
          }
        )
      );
    } else {
      requestEvent.respondWith(
        new Response(indexHtml, {
          status: 200,
          headers: {
            "content-type": "text/html; charset=UTF-8",
          },
        })
      );
    }
  }
}
