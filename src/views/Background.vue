<template>
  <div class="background" ref="parent">
    <div class="log">
      <div class="item" v-for="i in msg" :key="i">
        {{ i }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import Config from "@/service/config";
import { initBabylon, Shader } from "@/service/shader";
import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import Opencode from "@/service/shell/opencode";
import { onBeforeUnmount } from "vue";

import RequestService from "@/utils/request";
import System from "@/service/shell/system";

const parent = ref();
const msg = ref([]);
let instance = null;
let iframe = null;

const config = ref({});

// 向 iframe 发送消息
const sendToIframe = (data) => {
  if (iframe && iframe.contentWindow) {
    iframe.contentWindow.postMessage(data, "*");
  }
};

// 处理来自 iframe 的调用请求
const handleInvoke = async (id, method, payload) => {
  // msg.value.push("invoke", method);

  try {
    switch (method) {
      case "get": {
        const result = await RequestService.get(payload);
        sendToIframe({
          id,
          code: 200,
          data: result,
          msg: "get return from shell",
        });
        break;
      }
      case "postBody": {
        const result = await RequestService.postBody(payload);
        sendToIframe({
          id,
          code: 200,
          data: result,
          msg: "get return from shell",
        });
        break;
      }

      case "get_system_stats":
      case "open_executable": {
        // msg.value.push("invoke", payload);

        const result = await invoke(method, payload || {});

        // msg.value.push("handleInvoke", result);

        // 返回结果给 iframe
        sendToIframe({
          id,
          code: 200,
          data: result,
          msg: "get return from shell",
        });
        break;
      }

      case "open_workspace": {
        if (config.value.mode == "html") {
          const htmlPath = config.value.htmlPath; ///Users/juzisang/Library/Application Support/oDesk/wallpaper_html/h_l3mefl/index.html
          const workspace = htmlPath.split("wallpaper_html")[1].split("/")[1];
          await Opencode.open_workspace(workspace);
          sendToIframe({
            id,
            code: 200,
            data: null,
            msg: "open workspace successful!",
          });
        } else {
          sendToIframe({
            id,
            code: 403,
            data: null,
            msg: "current mode don't support open workspace!",
          });
        }
        break;
      }

      case "workspace_file_insert_text": {
        if (config.value.mode == "html") {
          const htmlPath = config.value.htmlPath; ///Users/juzisang/Library/Application Support/oDesk/wallpaper_html/h_l3mefl/index.html
          const workspace = htmlPath.split("wallpaper_html")[1].split("/")[1];
          await Opencode.workspace_file_insert_text(workspace, payload);
          sendToIframe({
            id,
            code: 200,
            data: null,
            msg: "open workspace successful!",
          });
        } else {
          sendToIframe({
            id,
            code: 403,
            data: null,
            msg: "current mode don't support open workspace!",
          });
        }
        break;
      }

      case "opencode": {
        if (config.value.mode == "html") {
          const htmlPath = config.value.htmlPath; ///Users/juzisang/Library/Application Support/oDesk/wallpaper_html/h_l3mefl/index.html
          const workspace = htmlPath.split("wallpaper_html")[1].split("/")[1];

          await Opencode.create_workspace(workspace);
          const result = await Opencode.execute_opencode_serve(workspace);
          sendToIframe({
            id,
            code: 200,
            data: result,
            msg: "opencode server start successful!",
          });
        } else {
          sendToIframe({
            id,
            code: 403,
            data: null,
            msg: "current mode don't support opencode server!",
          });
        }

        break;
      }

      default:
        console.log(`${method}: invalid method request!`);
        sendToIframe({
          id,
          code: 404,
          data: null,
          msg: "invalid method request!",
        });
        break;
    }
  } catch (error) {
    console.log(`${method}: something error in shell`, error);
    sendToIframe({
      id,
      code: 500,
      data: null,
      msg: "something error in shell",
    });
  }
};

// 监听来自 iframe 的消息
const handleMessage = async (event) => {
  // 验证消息来源
  if (
    !iframe ||
    !iframe.contentWindow ||
    event.source !== iframe.contentWindow
  ) {
    return;
  }
  const data = event.data;

  // msg.value.push(data.method);

  // 处理调用请求
  if (data && data.id && data.method) {
    await handleInvoke(data.id, data.method, data.payload);
    return;
  }
};

const initBackground = async () => {
  msg.value.push("initBackground");
  if (!parent.value) {
    return;
  }

  switch (config.value.mode) {
    case "shader":
      msg.value.push("shader");

      msg.value.push(config.value.shaderPath);

      // const code = await fetch(config.shaderPath).then((r) => r.text());
      const code = await Shader.getGlslContent(config.value.shaderPath);

      msg.value.push("code");

      const canvas = document.createElement("canvas");
      canvas.id = "babylon-canvas";
      canvas.className = "babylon-canvas";
      canvas.style.cssText = "width:100%;height:100%;display:block;";
      parent.value.appendChild(canvas);

      msg.value.push("initBabylon");

      instance = initBabylon(canvas, () => {
        return code;
      });
      break;

    case "html":
      window.addEventListener("message", handleMessage);

      msg.value.push("iframe");
      msg.value.push(config.htmlPath);

      iframe = document.createElement("iframe");
      iframe.src = convertFileSrc(config.value.htmlPath);
      iframe.border = "none";
      iframe.style.cssText =
        "width:100%;height:100%;display:block;border-width:0px;";

      parent.value.appendChild(iframe);
      msg.value.push(iframe.src);

      break;
    default:
      console.warn("Unknown background type:", config.value.mode);
  }
};

onMounted(async () => {
  msg.value.push("onMounted");
  config.value = await Config.readConfig();
  console.log("config.value", config.value);
  msg.value.push("readConfig");
  try {
    initBackground();
  } catch (error) {
    console.error("Failed to initialize background:", error);
  }
});

onBeforeUnmount(() => {
  iframe && window.removeEventListener("message", handleMessage);
  Opencode.kill_existing_opencode_processes();
});

onUnmounted(() => {});
</script>

<style lang="less">
.background {
  width: 100vw;
  height: 100vh;
  margin: 0;
  padding: 0;
  /* border:1px solid red; */
  background: black;
  .log {
    display: none;
  }
}
</style>
