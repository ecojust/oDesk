<template>
  <div class="app-skill">
    <ServerStatus
      :isConnected="isConnected"
      :isConnectting="isConnectting"
      :sessionId="sessionId"
      :skills="skills"
      @reconnect="activeWorkspace"
      @resetSkills="resetSkills"
      @selectSkill="selectSkill"
    />

    <!-- 中间内容区域 -->
    <div class="content-section">123123</div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, onBeforeUnmount } from "vue";
import { useI18n } from "vue-i18n";
import Opencode from "@/service/shell/opencode";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { ElMessage } from "element-plus";
import { useSkillApp } from "@/composables/useSkillApp";
import ServerStatus from "@/components/ServerStatus.vue";
const { t } = useI18n();

// 使用公共技能应用组合式函数
const {
  isConnectting,
  skills,
  sessionId,
  isConnected,
  activeWorkspace,
  resetSkills,
  selectSkill,
} = useSkillApp(APPID, ["movie-resource-finder"]);
const APPID = "oDesk-skill-app";

const searchFiles = async () => {
  try {
    const content = await Opencode.read_workspace_file_content(
      APPID,
      "list.json",
    );
    const res = JSON.parse(content);
    console.log("res", res);

    movies.value = res.playUrls;

    searchQuery.value = res?.movie || "";
  } catch (error) {}
};

// 初始化
onMounted(() => {
  // searchFiles();
});

onBeforeUnmount(async () => {});
</script>

<style lang="less" scoped>
.app-skill {
  position: relative;
  height: 100%;
  box-sizing: border-box;

  // 内容区域样式
  .content-section {
    flex: 1;
    display: flex;
    max-width: 1200px;
    margin: 0px auto 16px;
    height: calc(100% - 0px);
    box-sizing: border-box;
    padding-top: 50px;
  }
}
</style>
