import { invoke } from "@tauri-apps/api/core";

export default class Opencode {
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

  static async check_workspace_status(workspace: string) {
    try {
      const result = await invoke("check_workspace_status", { workspace });
      console.log(result);
      return result;
    } catch (e) {
      console.log("Failed to check workspace status: ", e);
      throw e;
    }
  }
}
