import { ref, onBeforeUnmount } from "vue";
import Opencode from "@/service/shell/opencode";
import { ElMessage } from "element-plus";

/**
 * 技能应用公共组合式函数
 * 提供共同的状态管理和方法
 * @param {string} appId - 应用ID
 * @param {string[]} skillls - 需要重置的技能列表
 */
export function useSkillApp(appId, skillls = []) {
  // 共同的响应式状态
  const isConnectting = ref(false);
  const skills = ref([]);
  const sessionId = ref("");
  const isConnected = ref(false);

  /**
   * 激活工作区
   */
  const activeWorkspace = async () => {
    console.log("activeWorkspace---");
    isConnected.value = false;
    isConnectting.value = true;

    try {
      await Opencode.initialize_workspace_serve(appId);
      isConnected.value = true;
      sessionId.value = Opencode.sessionId;

      // 扫描技能列表
      const skillsList1 = await Opencode.scan_worksapce_skills(appId, {
        path: ".opencode/skill/",
      });
      skills.value = skillsList1;

      // 安装技能
      for (const skill of skillls) {
        await Opencode.unzip_skill_to_workspace(skill, appId);
      }

      // 扫描技能列表
      const skillsList2 = await Opencode.scan_worksapce_skills(appId, {
        path: ".opencode/skill/",
      });
      skills.value = skillsList2;

      return true;
    } catch (error) {
      console.error("Workspace activation failed:", error);
      return false;
    } finally {
      isConnectting.value = false;
    }
  };

  /**
   * 重置技能
   */
  const resetSkills = async () => {
    try {
      for (const skill of skillls) {
        try {
          // 先尝试删除已存在的skill
          await Opencode.delete_workspace_skill(appId, skill);
          console.log(`已删除技能: ${skill}`);
        } catch (e) {
          // skill不存在时会报错，忽略这个错误
          console.log(`技能 ${skill} 不存在，跳过删除`);
        }

        // 然后重新unzip
        await Opencode.unzip_skill_to_workspace(skill, appId);
        console.log(`已安装技能: ${skill}`);
      }

      // 重新扫描技能列表
      const skillsList = await Opencode.scan_worksapce_skills(appId, {
        path: ".opencode/skill/",
      });
      skills.value = skillsList;

      ElMessage.info("请重新打开技能应用以完成重置");
    } catch (error) {
      console.error("重置技能失败:", error);
      ElMessage.error("重置技能失败: " + error.message);
    }
  };

  /**
   * 选择技能
   */
  const selectSkill = async (skill) => {
    console.log("skill", skill);
    await Opencode.export_workspace_skill(appId, {
      skill: skill,
    });
  };

  /**
   * 清理资源
   */
  const cleanup = async () => {
    await Opencode.killAllOpencodeServer();
  };

  // 组件卸载时清理
  onBeforeUnmount(async () => {
    await cleanup();
  });

  return {
    // 状态
    isConnectting,
    skills,
    sessionId,
    isConnected,

    // 方法
    activeWorkspace,
    resetSkills,
    selectSkill,
    cleanup,
  };
}
