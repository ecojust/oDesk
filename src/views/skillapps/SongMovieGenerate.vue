<template>
  <div class="Song-Movie-Generate">
    <ServerStatus
      :isConnected="isConnected"
      :isConnectting="isConnectting"
      :sessionId="sessionId"
      :skills="skills"
      @reconnect="activeWorkspace"
      @resetSkills="resetSkills"
      @selectSkill="selectSkill"
      @openWorkspace="openWorkspace"
    />

    <!-- 中间内容区域 -->
    <div class="content-section">123123</div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, onBeforeUnmount } from "vue";
import { useI18n } from "vue-i18n";
import Opencode, { songMovieGeneratorconfig } from "@/service/shell/opencode";
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
  openWorkspace,
} = useSkillApp(APPID, ["song-movie-generater"]);
const APPID = "oDesk-song-movie-generater";

const lyric = ref("");
const config = ref({
  name: "暗里着迷",
  // lyric_file: "lyric.txt",
  music_file: "暗里着迷.mp3",
  offset: 1.0,
  thumb: "thumb2.png",
});

const readConfig = async () => {
  try {
    const res = await Opencode.read_workspace_file_content(
      APPID,
      "config.json",
    );
    config.value = JSON.parse(res);
    config.value.name = config.value.name || "";
  } catch (error) {
    config.value = songMovieGeneratorconfig;
    await Opencode.write_workspace_file_content(
      APPID,
      "config.json",
      JSON.stringify(songMovieGeneratorconfig),
    );
    console.log("config", error);
  }
};

const readlyric = async () => {
  try {
    const res = await Opencode.read_workspace_file_content(APPID, "lyric.txt");
    lyric.value = res;
  } catch (error) {
    lyric.value = "";
    await Opencode.write_workspace_file_content(APPID, "lyric.txt", "");
    console.log("lyric", error);
  }
};

// 初始化
onMounted(() => {
  // searchFiles();
  activeWorkspace();
  readConfig();
  readlyric();
});

onBeforeUnmount(async () => {});
</script>

<style lang="less" scoped>
.Song-Movie-Generate {
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
