import { invoke } from "@tauri-apps/api/core";
import { convertFileSrc } from "@tauri-apps/api/core";
import RequestService from "@/utils/request";
import { sleep, getFileName } from "@/utils/util";

export default class Opencode {
  static worksapce: string = "";
  static sessionId: string = "";

  static async initialize_workspace_serve(workspace: string) {
    await Opencode.create_workspace(workspace);
    await sleep(1000);
    await Opencode.execute_opencode_serve(workspace);
    await sleep(3000);
    await Opencode.new_session();
  }

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
            type: title.split(".").pop(),
          };
        });

        if (payload.postfix instanceof Array) {
          result = result.filter((r: any) => payload.postfix.includes(r.type));
        } else {
          result = result.filter(
            (r: any) => r.type == (payload.postfix || "html"),
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
}
