const pendingCallbacks = new Map();

const generateId = () =>
  "msg_" + Date.now() + "_" + +Math.random().toString(36).substr(2, 9);

window.addEventListener("message", async (event) => {
  const data = event.data;

  if (data && data.id) {
    const callback = pendingCallbacks.get(data.id);
    if (callback) {
      // 有回调，说明是响应消息
      if (data.code === 200) {
        callback.resolve(data);
      } else {
        callback.reject(new Error(data.msg));
      }
      pendingCallbacks.delete(data.id);
    } else {
      // 没有回调，说明是请求消息，需要处理
      console.log("收到消息----", data.method);

      // action from shell
      switch (data.method) {
        case "screenshot":
          const canvas = await html2canvas(document.body, {
            backgroundColor: "#1a1a2e",
            scale: 0.5,
          });
          window.parent.postMessage(
            {
              id: data.id,
              method: data.method,
              code: 200,
              data: canvas.toDataURL("image/png"),
            },
            "*",
          );
          break;

        default:
          window.parent.postMessage(
            {
              id: data.id,
              method: data.method,
              code: 404,
              data: null,
              msg: "unknown method",
            },
            "*",
          );
          break;
      }
    }
    return;
  }
});

async function invoke(data_type, payload) {
  return new Promise((resolve, reject) => {
    const id = generateId();
    pendingCallbacks.set(id, { resolve, reject });
    parent.postMessage({ id, method: data_type, payload }, "*");
    setTimeout(() => {
      if (pendingCallbacks.has(id)) {
        pendingCallbacks.delete(id);
        reject(new Error("Request timeout"));
      }
    }, 10000);
  });
}
