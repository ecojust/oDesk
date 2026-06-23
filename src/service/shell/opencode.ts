import { invoke } from "@tauri-apps/api/core";
import { convertFileSrc } from "@tauri-apps/api/core";
import RequestService from "@/utils/request";
import { sleep, getFileName } from "@/utils/util";
import { resolveModelSettings } from "@/service/modelSettings";

export type SendMessageOptions = {
  onThinking?: (text: string, part: any) => void;
  onText?: (text: string, part: any) => void;
  onEvent?: (event: any) => void;
};

type MessageWindow = {
  push: (payload: { status: string; text?: string }) => void;
  close: (delay?: number) => void;
};

export default class Opencode {
  static worksapce: string = "";
  static sessionId: string = "";
  private static activeMessageWindow: MessageWindow | null = null;

  static async initialize_workspace_serve(workspace: string) {
    await Opencode.create_workspace(workspace);
    await sleep(1000);
    await Opencode.execute_opencode_serve(workspace);
    await sleep(3000);
    await Opencode.new_session();
  }

  static async openWorkspace(workspace: string) {
    try {
      const result = await invoke("workspace_file_insert_text", {
        workspace,
      });
      console.log(result);
      return result;
    } catch (e) {
      // alert("Failed to workspace_file_insert_text: " + e);
      throw e;
    }
  }

  static async send_message(message: string, options: SendMessageOptions = {}) {
    const modelSettings = await resolveModelSettings();
    const messageWindow = Opencode.createMessageWindow(message);
    const resolvedOptions: SendMessageOptions = {
      onThinking: (text, part) => {
        messageWindow.push({ status: "thinking", text });
        options.onThinking?.(text, part);
      },
      onText: (text, part) => {
        messageWindow.push({ status: "text", text });
        options.onText?.(text, part);
      },
      onEvent: (event) => {
        const status = Opencode.getEventStatus(event);

        if (
          status !== "event" &&
          status !== "thinking" &&
          status !== "text" &&
          !Opencode.isMessagePartStreamEvent(event)
        ) {
          messageWindow.push({
            status,
            text: Opencode.getEventText(event),
          });
        }

        options.onEvent?.(event);
      },
    };
    const abortController = new AbortController();
    const partTextMap = new Map<string, string>();
    const partTypeMap = new Map<string, string>();
    const shouldSubscribeEvents =
      resolvedOptions.onThinking ||
      resolvedOptions.onText ||
      resolvedOptions.onEvent;
    let markEventReady = () => {};
    const eventReady = shouldSubscribeEvents
      ? new Promise<void>((resolve) => {
          markEventReady = resolve;
        })
      : Promise.resolve();
    const eventPromise = shouldSubscribeEvents
      ? RequestService.subscribeSse({
          url: "http://127.0.0.1:4096/event",
          signal: abortController.signal,
          onOpen: markEventReady,
          onEvent: (event) => {
            Opencode.handleMessageEvent(
              event.data,
              Opencode.sessionId,
              partTextMap,
              partTypeMap,
              resolvedOptions,
            );
          },
        }).catch((error) => {
          if (!abortController.signal.aborted) {
            console.log("opencode event subscribe failed", error);
          }

          markEventReady();
        })
      : Promise.resolve();

    try {
      await Promise.race([eventReady, sleep(1000)]);

      const result = await RequestService.postBody({
        url: `http://127.0.0.1:4096/session/${Opencode.sessionId}/message`,
        data: {
          agent: "build",
          model: {
            modelID: modelSettings.modelID,
            providerID: modelSettings.providerID,
          },
          parts: [
            {
              type: "text",
              text: message,
            },
          ],
        },
      });

      // 播放成功音效
      Opencode.playSuccessSound();

      messageWindow.push({ status: "done", text: "opencode 执行完成" });

      return (
        result?.parts?.find((part: any) => part.type == "text")?.text || ""
      );
    } catch (error: any) {
      messageWindow.push({
        status: "error",
        text: error?.message || "opencode 请求失败",
      });
      throw error;
    } finally {
      abortController.abort();
      await eventPromise;
    }
  }

  private static handleMessageEvent(
    data: any,
    sessionId: string,
    partTextMap: Map<string, string>,
    partTypeMap: Map<string, string>,
    options: SendMessageOptions,
  ) {
    const payload = data?.payload || data;

    if (!payload || payload.properties?.sessionID !== sessionId) {
      return;
    }

    options.onEvent?.(payload);

    if (payload.type === "message.part.updated") {
      const part = payload.properties.part;

      if (!part?.id || typeof part.text !== "string") {
        return;
      }

      partTextMap.set(part.id, part.text);
      partTypeMap.set(part.id, part.type);

      if (part.type === "reasoning") {
        options.onThinking?.(part.text, part);
      } else if (part.type === "text") {
        options.onText?.(part.text, part);
      }
    } else if (payload.type === "message.part.delta") {
      const { partID, field, delta } = payload.properties;

      if (!partID || typeof delta !== "string") {
        return;
      }

      const text = `${partTextMap.get(partID) || ""}${delta}`;
      partTextMap.set(partID, text);
      const partType = partTypeMap.get(partID);

      if (partType === "reasoning") {
        options.onThinking?.(text, payload.properties);
      } else if (partType === "text") {
        options.onText?.(text, payload.properties);
      } else if (field === "reasoning" || field === "reasoningText") {
        options.onThinking?.(text, payload.properties);
      } else if (field === "text") {
        options.onText?.(text, payload.properties);
      }
    }
  }

  private static createMessageWindow(message: string): MessageWindow {
    if (typeof document === "undefined") {
      return {
        push: () => {},
        close: () => {},
      };
    }

    Opencode.activeMessageWindow?.close();

    const root = document.createElement("div");
    const header = document.createElement("div");
    const title = document.createElement("div");
    const closeButton = document.createElement("button");
    const list = document.createElement("div");
    const meta = document.createElement("div");

    root.id = "opencode-message-window";
    root.style.cssText = [
      "position: fixed",
      "top: 0",
      "right: 0",
      "width: 720px",
      "height: 100vh",
      "box-sizing: border-box",
      "z-index: 2147483647",
      "display: flex",
      "flex-direction: column",
      "padding: 12px",
      "border-left: 1px solid rgba(31, 41, 55, 0.14)",
      "background: rgba(255, 255, 255, 0.98)",
      "box-shadow: -12px 0 32px rgba(15, 23, 42, 0.16)",
      "font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      "color: #111827",
      "overflow: hidden",
    ].join(";");
    header.style.cssText =
      "display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 8px;";
    title.style.cssText =
      "min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; font-weight: 700; line-height: 18px;";
    closeButton.type = "button";
    closeButton.textContent = "Close";
    closeButton.style.cssText = [
      "border: 1px solid rgba(31, 41, 55, 0.16)",
      "background: #ffffff",
      "color: #374151",
      "border-radius: 6px",
      "padding: 3px 8px",
      "font-size: 12px",
      "line-height: 16px",
      "flex: 0 0 auto",
      "cursor: pointer",
    ].join(";");
    list.style.cssText = [
      "font-size: 13px",
      "line-height: 20px",
      "flex: 1 1 auto",
      "min-height: 0",
      "overflow: auto",
      "color: #374151",
    ].join(";");
    meta.style.cssText =
      "flex: 0 0 auto; font-size: 12px; line-height: 16px; color: #6b7280; margin-top: 8px;";

    header.appendChild(title);
    header.appendChild(closeButton);
    root.appendChild(header);
    root.appendChild(list);
    root.appendChild(meta);
    document.body.appendChild(root);

    let lastRecord:
      | {
          status: string;
          text: string;
          header: HTMLDivElement;
          body: HTMLDivElement;
        }
      | undefined;

    const messageWindow: MessageWindow = {
      push: ({ status, text }) => {
        const view = Opencode.getMessageWindowView(status);
        const time = new Date().toLocaleTimeString();
        const rawText = text || view.defaultText;
        const bodyText = Opencode.truncateMessageText(rawText);
        const previousRecord = lastRecord;
        const shouldUpdateLast =
          previousRecord?.status === status &&
          rawText.includes(previousRecord.text);

        title.textContent = "opencode message history";
        root.style.borderLeft = `4px solid ${view.color}`;

        if (shouldUpdateLast && previousRecord) {
          previousRecord.header.textContent = `${view.title} · ${time}`;
          previousRecord.text = rawText;
          previousRecord.body.textContent = bodyText;
          list.scrollTop = list.scrollHeight;
          return;
        }

        const item = document.createElement("div");
        const itemHeader = document.createElement("div");
        const itemBody = document.createElement("div");

        item.style.cssText = [
          `border-left: 3px solid ${view.color}`,
          "padding: 8px 10px",
          "margin-bottom: 8px",
          "background: rgba(249, 250, 251, 0.92)",
          "border-radius: 6px",
        ].join(";");
        itemHeader.style.cssText =
          "font-size: 12px; line-height: 16px; font-weight: 700; color: #111827; margin-bottom: 4px;";
        itemBody.style.cssText =
          "white-space: pre-wrap; word-break: break-word; color: #374151;";
        itemHeader.textContent = `${view.title} · ${time}`;
        itemBody.textContent = bodyText;

        item.appendChild(itemHeader);
        item.appendChild(itemBody);
        list.appendChild(item);
        lastRecord = {
          status,
          text: rawText,
          header: itemHeader,
          body: itemBody,
        };
        meta.textContent = `Prompt: ${Opencode.truncateMessageText(message, 120)}`;
        list.scrollTop = list.scrollHeight;
      },
      close: (delay = 0) => {
        window.setTimeout(() => {
          root.remove();

          if (Opencode.activeMessageWindow === messageWindow) {
            Opencode.activeMessageWindow = null;
          }
        }, delay);
      },
    };

    closeButton.addEventListener("click", () => messageWindow.close());
    Opencode.activeMessageWindow = messageWindow;
    messageWindow.push({ status: "start", text: "正在发送消息给 opencode" });

    return messageWindow;
  }

  private static getMessageWindowView(status: string) {
    const views: Record<
      string,
      { title: string; color: string; defaultText: string }
    > = {
      start: {
        title: "opencode: sending",
        color: "#2563eb",
        defaultText: "正在发送消息给 opencode",
      },
      thinking: {
        title: "opencode: thinking",
        color: "#7c3aed",
        defaultText: "正在思考",
      },
      text: {
        title: "opencode: replying",
        color: "#059669",
        defaultText: "正在生成回复",
      },
      tool: {
        title: "opencode: running tool",
        color: "#d97706",
        defaultText: "正在执行工具",
      },
      event: {
        title: "opencode: event",
        color: "#475569",
        defaultText: "收到 opencode 事件",
      },
      done: {
        title: "opencode: done",
        color: "#16a34a",
        defaultText: "opencode 执行完成",
      },
      error: {
        title: "opencode: error",
        color: "#dc2626",
        defaultText: "opencode 请求失败",
      },
    };

    return views[status] || views.event;
  }

  private static getEventStatus(event: any) {
    const partType = event?.properties?.part?.type;

    if (partType === "reasoning") {
      return "thinking";
    }

    if (partType === "text") {
      return "text";
    }

    if (partType === "tool" || event?.type?.includes("tool")) {
      return "tool";
    }

    if (event?.type === "session.error") {
      return "error";
    }

    return "event";
  }

  private static isMessagePartStreamEvent(event: any) {
    return (
      event?.type === "message.part.delta" ||
      event?.type === "message.part.updated"
    );
  }

  private static getEventText(event: any) {
    const part = event?.properties?.part;

    if (typeof part?.text === "string") {
      return part.text;
    }

    if (typeof event?.properties?.delta === "string") {
      return event.properties.delta;
    }

    if (typeof part?.title === "string") {
      return part.title;
    }

    return event?.type || "收到 opencode 事件";
  }

  private static truncateMessageText(text: string, maxLength = 5000) {
    if (text.length <= maxLength) {
      return text;
    }

    return `${text.slice(0, maxLength)}...`;
  }

  static playSuccessSound() {
    try {
      const audio = new Audio();
      audio.src = "./music/bell.mp3";
      audio.play().catch((e2) => {
        console.log("Alternative audio play also failed:", e2);
      });
    } catch (e) {
      console.log("Failed to play success sound:", e);
    }
  }

  static async new_session() {
    try {
      console.log("new_session-------");
      const result = await RequestService.postBody({
        url: "http://127.0.0.1:4096/session",
      });
      Opencode.sessionId = result.id || "";
    } catch (error) {
      console.error("Failed to create session:", error);
      throw error;
    }
  }

  static async workspace_file_insert_text(
    workspace: string,
    payload: {
      fileName: string;
      newLine: string;
    },
  ) {
    console.log("workspace_file_insert_text", payload);
    try {
      const result = await invoke("workspace_file_insert_text", {
        workspace,
        filename: payload.fileName,
        newline: payload.newLine,
      });
      console.log(result);
      return result;
    } catch (e) {
      // alert("Failed to workspace_file_insert_text: " + e);
      throw e;
    }
  }

  static async open_workspace(workspace: string) {
    try {
      const result = await invoke("open_workspace", { workspace });
      console.log(result);
      return result;
    } catch (e) {
      // alert("Failed to open workspace: " + e);
      throw e;
    }
  }

  static async unzip_skill_to_workspace(skill: string, workspace: string) {
    try {
      console.log("unzip_skill_to_workspace-----ewb");
      const result = await invoke("unzip_skill_to_workspace", {
        skill,
        workspace,
      });
      console.log(result);
      return result;
    } catch (e) {
      // alert("Failed to unzip skill to workspace: " + e);
      throw e;
    }
  }

  static async create_workspace(workspace: string) {
    try {
      const result = await invoke("create_workspace", { workspace });
      console.log(result);
      return result;
    } catch (e) {
      // alert("Failed to create workspace: " + e);
      throw e;
    }
  }

  static async execute_opencode_serve(workspace: string) {
    try {
      Opencode.worksapce = "";
      const result = await invoke("execute_opencode_serve", { workspace });
      Opencode.worksapce = workspace;
      console.log(result);
      return result;
    } catch (e) {
      console.log("Failed to start opencode serve: ", e);
      throw e;
    }
  }

  static async kill_existing_opencode_processes() {
    try {
      const result = await invoke("kill_existing_opencode_processes", {});
      console.log(result);
      return result;
    } catch (e) {
      console.log("Failed to kill existing processes: ", e);
      throw e;
    }
  }

  static async read_workspace_file_content(
    workspace: string,
    filename: string,
  ) {
    try {
      let content = await invoke("read_workspace_file_content", {
        workspace,
        filename,
      });
      return content;
    } catch (e) {
      console.log("Failed to start opencode serve: ", e);
      throw e;
    }
  }

  static async copy_file_to_workspace(
    workspace: String,
    sourcepath: String,
    targetfilename: String,
  ) {
    try {
      let ret = await invoke("copy_file_to_workspace", {
        workspace,
        sourcepath,
        targetfilename,
      });
      return ret;
    } catch (e) {
      console.log("Failed to start opencode serve: ", e);
      throw e;
    }
  }

  static async write_workspace_file_content(
    workspace: string,
    filename: string,
    content: string,
  ) {
    try {
      let ret = await invoke("write_workspace_file_content", {
        workspace,
        filename,
        content,
      });
      return ret;
    } catch (e) {
      console.log("Failed to start opencode serve: ", e);
      throw e;
    }
  }

  static async scan_worksapce_file(
    workspace: string,
    payload: {
      path: string;
      postfix: string | Array<string>;
    },
  ) {
    try {
      let result: any[] = await invoke("scan_worksapce_file", {
        workspace,
        ...payload,
      });

      if (result instanceof Array) {
        result = result.map((item, index) => {
          const filePath = item[0];
          const fileUrl = convertFileSrc(filePath);
          const title = getFileName(filePath) || `本地图片 ${index + 1}`;
          return {
            title: title,
            path: filePath,
            url: fileUrl,
            time: item[1],
            size: item[2],
            type: title.split(".").pop(),
          };
        });

        if (payload.postfix instanceof Array) {
          result = result.filter((r: any) => payload.postfix.includes(r.type));
        } else {
          result = result.filter(
            (r: any) => r.type == (payload.postfix || "html"),
          );
          result.sort(
            (a: any, b: any) =>
              new Date(b.time).getTime() - new Date(a.time).getTime(),
          );
        }
      }
      return result;
    } catch (e) {
      console.log("Failed to start opencode serve: ", e);
      throw e;
    }
  }

  static async killAllOpencodeServer() {
    const result = await invoke("kill_existing_opencode_processes");
    console.log("killAllOpencodeServer", result);
  }

  static async scan_worksapce_skills(
    workspace: string,
    payload: {
      path: string;
    },
  ) {
    try {
      let result = await invoke("scan_worksapce_folder", {
        workspace,
        ...payload,
      });

      if (result instanceof Array) {
        result = result.map((folderPath) => {
          return getFileName(folderPath);
        });
        //@ts-ignore
        result = result.filter((name: string) => {
          return !name.toUpperCase().includes("MACOSX");
        });
      }
      return result;
    } catch (e) {
      console.log("Failed to start opencode serve: ", e);
      throw e;
    }
  }

  static async export_workspace_file(
    workspace: string,
    payload: {
      filePath: string;
      targetPath: string;
    },
  ) {
    try {
      const parameters = {
        workspace,
        filepath: payload.filePath,
        targetpath: payload.targetPath,
      };
      console.log("export_workspace_file", parameters);

      let result = await invoke("export_workspace_file", parameters);
      return result;
    } catch (e) {
      console.log("Failed to export_workspace_file ", e);
      throw e;
    }
  }

  static async export_workspace_file_with_alias(
    workspace: string,
    payload: {
      filePath: string;
      alias: string;
    },
  ) {
    try {
      const parameters = {
        workspace,
        filepath: payload.filePath,
        alias: payload.alias,
      };

      let result = await invoke("export_workspace_file_with_alias", parameters);
      return result;
    } catch (e) {
      console.log("Failed to export_workspace_file ", e);
      throw e;
    }
  }

  static async export_workspace_skill(
    workspace: string,
    payload: {
      skill: string;
      targetpath: string;
    },
  ) {
    try {
      let result = await invoke("export_workspace_skill", {
        workspace,
        ...payload,
      });

      console.log("result", result);
    } catch (e) {
      console.log("Failed to start opencode serve: ", e);
      throw e;
    }
  }

  static async delete_workspace_skill(workspace: string, skill: string) {
    try {
      const result = await invoke("delete_workspace_skill", {
        workspace,
        skill,
      });
      console.log(result);
      return result;
    } catch (e) {
      console.log("Failed to delete workspace skill: ", e);
      throw e;
    }
  }

  static async delete_workspace_folder(workspace: string, folderPath: string) {
    try {
      const result = await invoke("delete_workspace_folder", {
        workspace,
        folderPath,
      });
      console.log(result);
      return result;
    } catch (e) {
      console.log("Failed to delete workspace folder: ", e);
      throw e;
    }
  }
}

const wechat_config = {
  wechat: {
    appid: "",
    appsecret: "",
  },
  wenyanTheme: "default",
  wenyanCustomCss: false,
  thumb: "", //"ai"
  polishMode: false,
};

const audio_book_config = {
  title: "中国社会各阶级的分析",
  voice: "zh-CN-XiaoxiaoNeural",
  thumb: "thumb.png",
  showtext: false,
  textcolor: "#ff0000",
  progress: {
    current: 29,
    total: 29,
    percentage: 100,
    status: "completed",
    lastUpdated: "2026-04-09T03:36:43.349Z",
  },
};

const songMovieGeneratorconfig = {
  name: "",
  lyric_file: "lyric.txt",
  music_file: "",
  offset: 1.0,
  thumb: "thumb2.png",
  pip: {
    name: "",
    size: {
      width: 300,
      height: 300,
    },
    position: {
      x: 0,
      y: 0,
    },
  },
};

export { wechat_config, audio_book_config, songMovieGeneratorconfig };
