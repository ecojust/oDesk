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

  <!-- PNG图片选择对话框 -->
  <el-dialog
    v-model="dialogVisible"
    title="🔍 生成进度 - 扫描到的图片"
    width="900px"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    top="5vh"
    center
    :append-to-body="true"
    :lock-scroll="false"
  >
    <div class="png-grid">
      <div
        v-for="png in scannedPngs"
        :key="png.url"
        class="png-item"
        :style="{ backgroundImage: `url(${png.url})` }"
        :title="png.title"
      >
        <div class="png-name">{{ png.title }}</div>
      </div>
    </div>

    <template #footer>
      <span class="dialog-footer">
        <div
          style="
            flex: 1;
            text-align: left;
            color: #909399;
            font-size: 13px;
            display: flex;
            align-items: center;
            gap: 8px;
          "
        >
          <svg
            v-if="isGenerating"
            class="spin-icon"
            viewBox="0 0 24 24"
            width="16"
            height="16"
          >
            <path
              d="M12 4V1M12 23v-3M4.22 4.22 2.11 2.11M21.89 21.89l-2.11-2.11M1 12H4M20 12h3M4.22 19.78l-2.11 2.11M21.89 2.11l-2.11 2.11"
              fill="none"
              stroke="#409eff"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>
          <span>{{
            isGenerating ? "生成中，实时扫描图片..." : "✅ 生成完成"
          }}</span>
          <span style="color: #409eff; font-weight: 600"
            >已发现 {{ scannedPngs.length }} 张图片</span
          >
        </div>
        <el-button @click="confirmCreate" :disabled="isGenerating"
          >关闭</el-button
        >
      </span>
    </template>
  </el-dialog>
</template>

<script setup>
import { onMounted, reactive, ref } from "vue";
import { ElMessage } from "element-plus";
import { useSkillApp } from "@/composables/useSkillApp";
import ServerStatus from "@/components/ServerStatus.vue";
import Opencode, { audio_book_config } from "@/service/shell/opencode";
import { open } from "@tauri-apps/plugin-dialog";
import { sleep } from "../../utils/util";

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

const isGenerating = ref(false);
const dialogVisible = ref(false);
const scannedPngs = ref([]);

const createBook = async () => {
  if (!config.value.title) return ElMessage.warning("请输入题目");
  if (!content.value) return ElMessage.warning("请输入内容");

  // 立即打开对话框
  dialogVisible.value = true;
  isGenerating.value = true;
  scannedPngs.value = [];

  loopScan();
  // 后台执行生成逻辑
  try {
    console.log("Starting article publishing...");
    await Opencode.delete_workspace_folder(APPID, "output");
    const answer = await Opencode.send_message("请根据配置生成口播");
    console.log("AI Response:", answer);
    ElMessage.success("有声书生成成功");
  } catch (error) {
    console.error("发布失败:", error);
    ElMessage.error("生成失败，请重试");
  } finally {
    isGenerating.value = false;
  }
};

const loopScan = async () => {
  const scanPngFiles = async (delay) => {
    if (!isGenerating.value) {
      return;
    }
    try {
      const pngs = await Opencode.scan_worksapce_file(APPID, {
        path: "output/frames",
        postfix: "png",
      });
      console.log("实时扫描到PNG文件:", pngs.length + " 个");

      scannedPngs.value = pngs.reverse();

      await sleep(delay);
      await scanPngFiles(delay);
    } catch (error) {
      console.error("扫描PNG文件失败:", error);
    }
  };
  // 开始循环扫描PNG文件
  scanPngFiles(3000);
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

const confirmCreate = async () => {
  // 停止扫描
  if (scanInterval) {
    clearInterval(scanInterval);
    scanInterval = null;
  }
  dialogVisible.value = false;
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

.png-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
  max-height: 520px;
  overflow-y: auto;
  padding: 12px;
  margin: 0 -10px;

  .png-item {
    width: 100%;
    height: 140px;
    border-radius: 10px;
    background-size: cover;
    background-position: center;
    position: relative;
    cursor: pointer;
    border: 2px solid #f0f2f5;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
    overflow: hidden;

    &:hover {
      transform: translateY(-4px) scale(1.02);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.12);
      border-color: #409eff;
      z-index: 10;
    }

    .png-name {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: linear-gradient(transparent, rgba(0, 0, 0, 0.85));
      color: white;
      font-size: 11px;
      padding: 20px 8px 8px 8px;
      border-bottom-left-radius: 8px;
      border-bottom-right-radius: 8px;
      text-overflow: ellipsis;
      overflow: hidden;
      white-space: nowrap;
      font-weight: 500;
      letter-spacing: 0.2px;
    }
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.spin-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
