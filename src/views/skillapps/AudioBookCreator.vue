<template>
  <div class="Audio-Book-Creator">
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

    <div class="main-container">
      <!-- 左侧配置区 -->
      <div class="config-panel">
        <div class="panel-title">有声书设置</div>

        <el-form label-position="top">
          <!-- 书籍标题 -->
          <el-form-item label="书籍题目">
            <el-input
              v-model="config.title"
              placeholder="输入有声书标题"
              clearable
              @change="saveConfig"
            />
          </el-form-item>

          <!-- 封面背景 -->
          <el-form-item label="封面图片">
            <div class="cover-selector">
              <div
                class="cover-item"
                :style="preview ? { backgroundImage: `url(${preview})` } : {}"
                @click="selectCoverImage"
              ></div>
            </div>
          </el-form-item>
        </el-form>
      </div>

      <!-- 右侧内容区 -->
      <div class="content-area">
        <el-input
          v-model="content"
          type="textarea"
          placeholder="在此输入书本内容..."
          class="content-input"
          resize="none"
          @change="saveContent"
        />

        <div class="footer-bar">
          <span class="counter">字数：{{ content.length }}</span>
          <el-button type="primary" @click="createBook">生成有声书</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from "vue";
import { ElMessage } from "element-plus";
import { useSkillApp } from "@/composables/useSkillApp";
import ServerStatus from "@/components/ServerStatus.vue";
import Opencode, { audio_book_config } from "@/service/shell/opencode";
import { open } from "@tauri-apps/plugin-dialog";

const APPID = "oDesk-audio-book-creator";

const {
  isConnectting,
  skills,
  sessionId,
  isConnected,
  activeWorkspace,
  resetSkills,
  selectSkill,
  openWorkspace,
} = useSkillApp(APPID, ["media-generator"]);

const config = ref({
  title: "中国社会各阶级的分析",
  voice: "zh-CN-XiaoxiaoNeural",
  thumb: "thumb.png",
});
const content = ref("");
const preview = ref("");

const coverList = ["/preview/themes/forest.png"];

const isgenerating = ref(false);
const createBook = async () => {
  if (!config.value.title) return ElMessage.warning("请输入题目");
  if (!content.value) return ElMessage.warning("请输入内容");

  // TODO: 调用 media-generator 技能生成有声书
  isgenerating.value = true;
  try {
    console.log("Starting article publishing...");
    const answer = await Opencode.send_message("请根据配置生成口播");
    console.log("AI Response:", answer);
  } catch (error) {
    console.error("发布失败:", error);
  } finally {
    isgenerating.value = false;
  }
};

const readConfig = async () => {
  try {
    const res = await Opencode.read_workspace_file_content(
      APPID,
      "config.json",
    );

    config.value = JSON.parse(res);
    config.value.title = config.value.title || "";
    console.log("config", config);
  } catch (error) {
    config.value = audio_book_config;
    await Opencode.write_workspace_file_content(
      APPID,
      "config.json",
      JSON.stringify(audio_book_config),
    );
    console.log("config", error);
  }
};

const readContent = async () => {
  try {
    const res = await Opencode.read_workspace_file_content(
      APPID,
      "content.txt",
    );

    content.value = res;
  } catch (error) {
    content.value = "";
  }
};

const saveConfig = async (showmessage = true) => {
  console.log("config.value", config.value);
  try {
    await Opencode.write_workspace_file_content(
      APPID,
      "config.json",
      JSON.stringify(config.value, null, 2),
    );
    showmessage && ElMessage.success("配置保存成功");
  } catch (error) {
    console.error("保存配置失败:", error);
    ElMessage.error("配置保存失败");
  }
};

const selectCoverImage = async () => {
  console.log("selectCoverImage");
  try {
    const path = await open({
      multiple: false,
      filters: [
        {
          name: "图片",
          extensions: ["png", "jpg", "jpeg", "webp", "gif"],
        },
      ],
    });

    if (path) {
      await Opencode.copy_file_to_workspace(APPID, path, "thumb.png");
      await fetchthumb();
      ElMessage.success("封面图片已选择");
    }
  } catch (error) {
    console.error("选择图片失败:", error);
    ElMessage.error("选择图片失败，请重试");
  }
};

const fetchthumb = async () => {
  try {
    const pngs = await Opencode.scan_worksapce_file(APPID, {
      path: "",
      postfix: "png",
    });

    const thumb = pngs.find((png) => png.title == "thumb.png");

    if (thumb) {
      preview.value = thumb.url;
    }

    console.log(pngs);
  } catch (error) {
    console.error("保存配置失败:", error);
  }
};

const saveContent = async () => {
  await Opencode.write_workspace_file_content(
    APPID,
    "content.txt",
    content.value,
  );
};

onMounted(async () => {
  await activeWorkspace();

  readConfig();
  readContent();
  fetchthumb();
});
</script>

<style lang="less" scoped>
.Audio-Book-Creator {
  height: 100vh;
  background: #f8f9fa;
  box-sizing: border-box;
  overflow: hidden;

  .main-container {
    display: flex;
    gap: 16px;
    padding: 16px;
    height: calc(100% - 0px);
    box-sizing: border-box;
    padding-top: 50px;
    max-width: 1200px;
    margin: 0 auto;
    width: 100%;
  }

  .config-panel {
    width: 300px;
    flex-shrink: 0;
    background: white;
    border-radius: 12px;
    padding: 20px;
    box-sizing: border-box;

    .panel-title {
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 24px;
      color: #303133;
      text-align: left;
      padding-bottom: 12px;
      border-bottom: 2px solid #f0f2f5;
    }

    .cover-selector {
      display: flex;
      justify-content: center;
      padding: 8px 0;
      width: 100%;

      .cover-item {
        width: 100%;
        height: 260px;
        border-radius: 12px;
        background-size: cover;
        background-position: center;
        cursor: pointer;
        border: 3px solid transparent;
        transition: all 0.2s;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        display: flex;
        align-items: center;
        justify-content: center;
        color: #909399;
        font-size: 14px;
        background-color: #f5f7fa;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 24 24' fill='none' stroke='%23c0c4cc' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='3' width='18' height='18' rx='2' ry='2'%3E%3C/rect%3E%3Ccircle cx='8.5' cy='8.5' r='1.5'%3E%3C/circle%3E%3Cpolyline points='21 15 16 10 5 21'%3E%3C/polyline%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: center 50px;

        &::after {
          content: "点击选择封面图片";
          margin-top: 100px;
        }

        &:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
        }
      }
    }
  }

  .content-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    background: white;
    border-radius: 12px;
    padding: 20px;
    box-sizing: border-box;
    min-height: 0;

    .content-input {
      flex: 1;
      :deep(textarea) {
        height: 100% !important;
        font-size: 15px;
        line-height: 1.8;
        border: none;
      }
    }

    .footer-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid #ebeef5;

      .counter {
        color: #909399;
        font-size: 13px;
      }
    }
  }
}
</style>
