import { invoke } from "@tauri-apps/api/core";
import { convertFileSrc } from "@tauri-apps/api/core";
import RequestService from "@/utils/request";

export default class Opencode {
  static worksapce: string = "";
  static sessionId: string = "";

  static async send_message(message: string) {
    const result = await RequestService.postBody({
      url: `http://127.0.0.1:4096/session/${Opencode.sessionId}/message`,
      data: {
        agent: "build",
        model: {
          modelID: "big-pickle",
          providerID: "opencode",
        },
        parts: [
          {
            type: "text",
            text: message,
          },
        ],
      },
    });
    return result.parts?.find((part: any) => part.type == "text")?.text || "";
  }

  static async new_session() {
    try {
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
      alert("Failed to workspace_file_insert_text: " + e);
      throw e;
    }
  }

  static async open_workspace(workspace: string) {
    try {
      const result = await invoke("open_workspace", { workspace });
      console.log(result);
      return result;
    } catch (e) {
      alert("Failed to open workspace: " + e);
      throw e;
    }
  }

  static async create_workspace(workspace: string) {
    try {
      const result = await invoke("create_workspace", { workspace });
      console.log(result);
      return result;
    } catch (e) {
      alert("Failed to create workspace: " + e);
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

  static async scan_worksapce_file(
    workspace: string,
    payload: {
      path: string;
      postfix: string;
    },
  ) {
    try {
      let result = await invoke("scan_worksapce_file", {
        workspace,
        ...payload,
      });

      if (result instanceof Array) {
        result = result.map((filePath, index) => {
          const fileUrl = convertFileSrc(filePath);
          return {
            title: filePath.split("/").pop() || `本地图片 ${index + 1}`,
            url: fileUrl,
          };
        });
      }
      return result;
    } catch (e) {
      console.log("Failed to start opencode serve: ", e);
      throw e;
    }
  }
}
