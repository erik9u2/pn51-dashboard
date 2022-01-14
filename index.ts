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
  </main>
  <script>
    document.addEventListener("DOMContentLoaded", () => {
      const refresh = async () => {
        const response = await fetch("/data");
        const json = await response.json();
        for (const key of Object.keys(json)) {
          const val = json[key];
          const el = document.getElementById(key);
          if (!el) {
            document.querySelector("main").innerHTML += '<section><h2>' +
              key + '</h2><pre id="' + key + '">' + val + '</pre></section>';
          } else {
            el.innerHTML = json[key];
          }
        }
        const defaultTimeout = 2000;
        const timeout = document.getElementById("timeout").value;
        const timeoutInt = parseInt(timeout, 10) || defaultTimeout;
        setTimeout(refresh, Math.max(defaultTimeout, timeoutInt));
      };
      refresh();
    }, false);
  </script>
</body>
</html>
`;

const server = Deno.listen({
  port: 14044,
});

for await (const conn of server) {
  serveHttp(conn);
}

async function serveHttp(conn: Deno.Conn): Promise<void> {
  const httpConn = Deno.serveHttp(conn);
  for await (const reqEvent of httpConn) {
    const isDataReq = reqEvent.request.url.endsWith("/data");
    if (isDataReq) {
      sendOk(reqEvent, {
        uname: await exec("uname -a"),
        uptime: await exec("uptime"),
        cpu: await exec("mpstat"),
        cpuFrequency: await exec("lscpu | grep MHz"),
        memory: await exec("free -h"),
        disk: await exec("df -h"),
        sensors: await exec("sensors"),
        moneroLog: await exec("tail /var/log/monero/monero.log"),
      });
    } else {
      sendOk(reqEvent, indexHtml);
    }
  }
}

function sendOk(
  reqEvent: Deno.RequestEvent,
  dataRaw: string | { [prop: string]: string }
): void {
  const isJSON = typeof dataRaw !== "string";
  const body = isJSON ? JSON.stringify(dataRaw) : dataRaw;
  const contentType = isJSON ? "application/json" : "text/html";
  reqEvent.respondWith(
    new Response(body, {
      status: 200,
      headers: {
        "Content-Type": `${contentType}; charset=UTF-8`,
      },
    })
  );
}

async function exec(cmd: string): Promise<string> {
  const process = Deno.run({
    cmd: ["bash", "-c", cmd],
    stdout: "piped",
  });
  const status = await process.status();
  if (status.success) {
    return new TextDecoder().decode(await process.output());
  } else {
    return `error ${status.code}`;
  }
}
