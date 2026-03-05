import { invoke } from "@tauri-apps/api/core";

export default class Opencode {
  static async workspace_file_insert_text(
    workspace: string,
    payload: {
      file_name: string;
      new_line: string;
    },
  ) {
    console.log("workspace_file_insert_text", payload);
    try {
      const result = await invoke("workspace_file_insert_text", {
        workspace,
        filename: payload.file_name,
        newline: payload.new_line,
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
      const result = await invoke("execute_opencode_serve", { workspace });
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
}
