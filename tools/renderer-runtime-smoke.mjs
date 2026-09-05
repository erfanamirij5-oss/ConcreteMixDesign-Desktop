const port = Number(process.env.TOLOU_DEBUG_PORT ?? '9222');
const deadline = Date.now() + 30_000;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function getPageTarget() {
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json`);
      if (response.ok) {
        const targets = await response.json();
        const page = targets.find(target => target.type === 'page' && target.webSocketDebuggerUrl);
        if (page) return page;
      }
    } catch {
      // Electron may still be starting.
    }
    await sleep(500);
  }
  throw new Error(`Electron DevTools endpoint did not expose a page target on port ${port}.`);
}

function evaluate(wsUrl, expression) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const requestId = 1;
    const timer = setTimeout(() => {
      ws.close();
      reject(new Error('Timed out waiting for renderer Runtime.evaluate response.'));
    }, 15_000);

    ws.addEventListener('open', () => {
      ws.send(JSON.stringify({
        id: requestId,
        method: 'Runtime.evaluate',
        params: {
          expression,
          returnByValue: true,
          awaitPromise: true
        }
      }));
    });

    ws.addEventListener('message', event => {
      const message = JSON.parse(String(event.data));
      if (message.id !== requestId) return;
      clearTimeout(timer);
      ws.close();
      if (message.error) reject(new Error(JSON.stringify(message.error)));
      else resolve(message.result?.result?.value);
    });

    ws.addEventListener('error', () => {
      clearTimeout(timer);
      reject(new Error('Could not connect to Electron renderer DevTools WebSocket.'));
    });
  });
}

const target = await getPageTarget();
const state = await evaluate(target.webSocketDebuggerUrl, `(() => {
  const root = document.querySelector('#root');
  return {
    href: location.href,
    title: document.title,
    readyState: document.readyState,
    rootChildren: root ? root.childElementCount : -1,
    rootTextLength: root ? root.innerText.trim().length : -1,
    bodyTextLength: document.body ? document.body.innerText.trim().length : -1
  };
})()`);

if (!state || state.readyState !== 'complete') {
  throw new Error(`Renderer document did not finish loading: ${JSON.stringify(state)}`);
}
if (!String(state.href ?? '').startsWith('file://')) {
  throw new Error(`Packaged renderer is not running from file://: ${JSON.stringify(state)}`);
}
if (state.rootChildren < 1 || state.rootTextLength < 10 || state.bodyTextLength < 10) {
  throw new Error(`Renderer root is effectively blank: ${JSON.stringify(state)}`);
}

console.log(`Renderer runtime smoke passed: ${JSON.stringify(state)}`);
