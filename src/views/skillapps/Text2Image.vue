<template>
  <div class="text-2-image">
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
        <div class="panel-title">{{ t("text2Image.panelTitle") }}</div>

        <el-form label-position="top">
          <!-- 图片标题 -->
          <el-form-item :label="t('text2Image.imageSubject')">
            <el-input
              v-model="config.title"
              :placeholder="t('text2Image.subjectPlaceholder')"
              clearable
              @change="saveConfig"
            />
          </el-form-item>

          <!-- 显示标题 -->
          <el-form-item :label="t('text2Image.showTitle')">
            <el-switch v-model="config.showtitle" @change="saveConfig" />
          </el-form-item>

          <!-- 显示场景标签 -->
          <el-form-item :label="t('text2Image.showSceneLabel')">
            <el-switch v-model="config.showscenelabel" @change="saveConfig" />
          </el-form-item>

          <!-- 封面背景 -->
          <el-form-item :label="t('text2Image.generatedImage')">
            <div class="generate-images">
              <img @click="showPreview = true" :src="generatedUrl" alt="" />
            </div>
            <el-button
              v-if="generatedUrl"
              type="primary"
              @click="downloadImage"
              style="width: 100%; margin-top: 12px"
            >
              {{ t("text2Image.downloadImage") }}
            </el-button>
          </el-form-item>
        </el-form>
      </div>

      <el-image-viewer
        v-if="showPreview"
        show-progress
        :url-list="[generatedUrl]"
        @close="showPreview = false"
      >
        <template #viewer-error="{ activeIndex, src }">
          <div class="image-slot viewer-error">
            <el-icon><icon-picture /></el-icon>
          </div>
        </template>
      </el-image-viewer>

      <!-- 右侧内容区 -->
      <div class="content-area">
        <el-input
          v-model="prompt"
          type="textarea"
          :placeholder="t('text2Image.promptPlaceholder')"
          class="content-input"
          resize="none"
          @change="savePrompt"
        />

        <div class="footer-bar">
          <span class="counter">{{
            t("text2Image.wordCount", { count: prompt.length })
          }}</span>
          <div style="display: flex; gap: 12px">
            <el-button
              type="primary"
              @click="generateImage"
              :loading="isGenerating"
              >{{ t("text2Image.generateImage") }}</el-button
            >
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { ElMessage } from "element-plus";
import { useSkillApp } from "@/composables/useSkillApp";
import ServerStatus from "@/components/ServerStatus.vue";
import Opencode from "@/service/shell/opencode";
import { Picture as IconPicture } from "@element-plus/icons-vue";

const { t } = useI18n();
const APPID = "oDesk-text-2-image";

const {
  isConnectting,
  skills,
  sessionId,
  isConnected,
  activeWorkspace,
  resetSkills,
  selectSkill,
  openWorkspace,
  readConfig,
  saveConfig,
  config,
} = useSkillApp(APPID, ["text-to-scene-illustration"]);

const prompt = ref("");
const isGenerating = ref(false);
const generatedUrl = ref("");
const generatedPath = ref("");

const showPreview = ref(false);

const generateImage = async () => {
  if (!prompt.value)
    return ElMessage.warning(t("text2Image.pleaseEnterPrompt"));
  isGenerating.value = true;
  try {
    console.log("Starting image generation...");
    const answer = await Opencode.send_message(
      "请适用text-to-scene-illustration这个skill根据配置生成图片",
    );
    console.log("AI Response:", answer);
    ElMessage.success(t("text2Image.generateSuccess"));
    getImage();
  } catch (error) {
    console.error("生成失败:", error);
    ElMessage.error(t("text2Image.generateFailed"));
  } finally {
    isGenerating.value = false;
  }
};

const getImage = async () => {
  try {
    const images = await Opencode.scan_worksapce_file(APPID, {
      path: "",
      postfix: "png",
    });
    const illustration = images.find(
      (image) => image.title == "illustration.png",
    );
    if (illustration) {
      generatedUrl.value = `${illustration.url}?v=${new Date().getTime()}`;
      generatedPath.value = illustration.path;
    }
  } catch (imageError) {
    console.error("扫描图片文件失败:", imageError);
  }
};

const downloadImage = async () => {
  if (generatedPath.value) {
    await Opencode.export_workspace_file_with_alias(APPID, {
      filePath: generatedPath.value,
      alias: `${config.value.title}.png`,
    });
    ElMessage.success(t("text2Image.downloadSuccess"));
  }
};

const savePrompt = async () => {
  await Opencode.write_workspace_file_content(
    APPID,
    "content.txt",
    prompt.value,
  );
};

const readPrompt = async () => {
  try {
    const res = await Opencode.read_workspace_file_content(
      APPID,
      "content.txt",
    );
    prompt.value = res;
  } catch (error) {
    prompt.value = "";
  }
};

onMounted(async () => {
  await activeWorkspace();
  readConfig({
    title: "",
    showscenelabel: false,
    showtitle: true,
  });
  readPrompt();
  getImage();
});
</script>

<style lang="less" scoped>
.text-2-image {
  height: 100vh;
  background: #f8f9fa;
  box-sizing: border-box;
  overflow: hidden;
  padding-right: 0 !important;

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

    .generate-images {
      width: 100%;
      min-height: 180px;
      border-radius: 12px;
      border: 2px dashed #dcdfe6;
      background: #fafafa;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;

      &:has(img[src]) {
        border-style: solid;
        border-color: #ebeef5;
        background: white;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
      }

      &:hover:has(img[src]) {
        border-color: #409eff;
        box-shadow: 0 8px 25px rgba(64, 158, 255, 0.15);
        transform: translateY(-2px);
      }

      img {
        max-width: 100%;
        max-height: 220px;
        border-radius: 8px;
        object-fit: contain;
        display: block;
        transition: all 0.3s ease;

        &:hover {
          transform: scale(1.02);
        }
      }

      &:not(:has(img[src]))::after {
        content: attr(data-preview-hint);
        color: #909399;
        font-size: 13px;
        padding: 20px;
        text-align: center;
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

.image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
  max-height: 450px;
  overflow-y: auto;
  padding: 12px;
  margin: 0 -10px;

  .image-item {
    width: 100%;
    height: 160px;
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

    .image-name {
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
</style>
