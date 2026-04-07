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
                v-for="(bg, index) in coverList"
                :key="index"
                class="cover-item"
                :class="{ active: config.thumb === bg }"
                :style="{ backgroundImage: `url(${bg})` }"
                @click="config.thumb = bg"
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

const coverList = ["/preview/themes/forest.png"];

const createBook = () => {
  if (!config.title) return ElMessage.warning("请输入题目");
  if (!content) return ElMessage.warning("请输入内容");
  ElMessage.success("开始生成有声书");

  // TODO: 调用 media-generator 技能生成有声书
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

const fetchthumb = async () => {
  try {
    const pngs = await Opencode.scan_worksapce_file(APPID, {
      path: "",
      postfix: "png",
    });
    console.log(pngs);
  } catch (error) {
    console.error("保存配置失败:", error);
  }
};

const savethumb = async () => {
  await Opencode.write_workspace_file_content(
    APPID,
    "thumb.png",
    // content.value,
  );
};

const saveContent = async () => {
  await Opencode.write_workspace_file_content(
    APPID,
    "content.txt",
    content.value,
  );
};

onMounted(() => {
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

      .cover-item {
        width: 160px;
        height: 220px;
        border-radius: 12px;
        background-size: cover;
        background-position: center;
        cursor: pointer;
        border: 3px solid transparent;
        transition: all 0.2s;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);

        &:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
        }

        &.active {
          border-color: #409eff;
          box-shadow: 0 0 0 4px rgba(64, 158, 255, 0.2);
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
