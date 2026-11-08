<template>
  <div class="html-wallpaper">
    <div class="view-wrapper">
      <transition name="fade-slide" mode="out-in">
        <div v-if="view === 'list'" key="list" class="wallpaper-list">
          <el-scrollbar>
            <div v-if="loading" class="loading">
              {{ t("htmlWallpaper.loading") }}
            </div>
            <div v-else class="grid">
              <!-- 新增 HTML 按钮 -->
              <div class="html-item add-new" @click="createNewHTML">
                <div class="add-icon">
                  <el-icon size="48"><Plus /></el-icon>
                </div>
                <div class="meta">
                  <h3>{{ t("htmlWallpaper.newHtml") }}</h3>
                </div>
              </div>
              <!-- 现有 HTML 列表 -->
              <div
                v-for="item in htmlWallpapers"
                :key="item.name"
                :class="[
                  'html-item',
                  workspace == item.title ? 'html-item-active' : '',
                ]"
              >
                <div class="thumb" @click="setHTMLBackground(item)">
                  <img
                    :src="item.thumbnail || defaultCover"
                    class="cover-image"
                  />
                </div>
                <div class="meta">
                  <h3>{{ item.title }}</h3>
                  <div class="actions">
                    <el-button
                      size="small"
                      type="danger"
                      @click="removeHTMLBackground(item)"
                      >{{ t("htmlWallpaper.remove") }}</el-button
                    >
                    <el-button size="small" @click="openDetail(item)">{{
                      t("htmlWallpaper.edit")
                    }}</el-button>
                  </div>
                </div>
              </div>
            </div>
          </el-scrollbar>
        </div>
      </transition>

      <transition name="fade-slide" mode="out-in">
        <div v-if="view === 'detail'" key="detail" class="detail-page">
          <div class="detail-header">
            <div class="left">
              <el-button type="text" @click="goBack">
                <el-icon><ArrowLeft /></el-icon>
              </el-button>
              <span class="detail-title">{{
                currentHTML?.title || t("htmlWallpaper.htmlEditor")
              }}</span>
            </div>

            <div class="button-bar">
              <div class="update-cover-switch">
                <span class="switch-label">{{
                  t("htmlWallpaper.updateCover")
                }}</span>
                <el-switch v-model="updateCover" />
              </div>
              <el-button @click="previewHTML" :loading="previewing">
                {{ t("htmlWallpaper.preview") }}
              </el-button>

              <el-button @click="saveHTML" type="primary">{{
                t("htmlWallpaper.save")
              }}</el-button>
            </div>
          </div>
          <div class="detail">
            <div class="left" :class="{ 'full-width': isFullscreen }">
              <div class="preview-container">
                <div class="fullscreen-btn" @click="toggleFullscreen">
                  <el-icon v-if="!isFullscreen"><FullScreen /></el-icon>
                  <el-icon v-else><Close /></el-icon>
                </div>
                <iframe
                  v-if="previewUrl"
                  ref="iframeRef"
                  :src="previewUrl"
                  class="html-preview"
                  sandbox="allow-scripts allow-same-origin"
                ></iframe>
                <div v-else class="preview-placeholder">
                  <p>{{ t("htmlWallpaper.clickPreviewToView") }}</p>
                </div>
              </div>
            </div>
            <div class="right" v-show="!isFullscreen">
              <div ref="monacoContainer" class="editor-container"></div>
            </div>
          </div>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup>
import {
  ref,
  onMounted,
  computed,
  nextTick,
  onBeforeUnmount,
  onActivated,
} from "vue";
import { useI18n } from "vue-i18n";
import {
  ElButton,
  ElDivider,
  ElInput,
  ElIcon,
  ElScrollbar,
  ElSwitch,
} from "element-plus";
import { ArrowLeft, Plus, FullScreen, Close } from "@element-plus/icons-vue";

import { ElMessageBox } from "element-plus";
import { sleep } from "@/utils/util";
import html2canvas from "html2canvas";

import { HTML, CodemirrorHTMLEditor } from "@/service/html";

const { t } = useI18n();

const htmlWallpapers = ref([]);
const loading = ref(true);
const view = ref("list"); // 'list' | 'detail'
const currentHTML = ref(null);
const monacoContainer = ref(null);
const currentCode = ref("");
const previewUrl = ref("");
const previewing = ref(false);
const updateCover = ref(true);
let monacoEditor = null;

const defaultCover =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="300"><rect width="100%" height="100%" fill="%23111"/><text x="50%" y="50%" fill="%23fff" font-size="20" font-family="Arial" text-anchor="middle" alignment-baseline="middle">No cover</text></svg>';

import { invoke } from "@tauri-apps/api/core";

const iframeRef = ref(null);
const isFullscreen = ref(false);
const config = ref({});

const workspace = computed(() => {
  if (config.value.mode == "html") {
    const htmlPath = config.value.htmlPath; ///Users/juzisang/Library/Application Support/oDesk/wallpaper_html/h_l3mefl/index.html
    return htmlPath.split("wallpaper_html")[1].split("/")[1];
  }
  return "";
});

const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value;
};

// 向 iframe 发送消息
const sendToIframe = (data) => {
  if (iframeRef.value?.contentWindow) {
    iframeRef.value.contentWindow.postMessage(data, "*");
  }
};

// 处理来自 iframe 的调用请求
const handleInvoke = async (id, method, payload) => {
  try {
    switch (method) {
      case "get_system_stats":
      case "open_executable":
      case "read_opencode_model":
        const result = await invoke(method, payload || {});
        // 返回结果给 iframe
        sendToIframe({
          id,
          code: 200,
          data: result,
          msg: "get return from shell",
        });
        break;
      default:
        console.log(`${method}: invalid method request!`);
        sendToIframe({
          id,
          code: 404,
          data: null,
          msg: "invalid method request!",
        });
        break;
    }
  } catch (error) {
    console.log(`${method}: something error in shell`);
    sendToIframe({
      id,
      code: 500,
      data: null,
      msg: "something error in shell",
    });
  }
};

// 监听来自 iframe 的消息
const handleMessage = async (event) => {
  // 验证消息来源
  if (
    !iframeRef.value?.contentWindow ||
    event.source !== iframeRef.value.contentWindow
  ) {
    return;
  }

  const data = event.data;

  // 处理调用请求
  if (data && data.id && data.method) {
    // await handleInvoke(data.id, data.method, data.payload);

    return;
  }
};

// 获取本地 HTML 壁纸列表
const fetchList = async () => {
  htmlWallpapers.value = await HTML.getLocalHTMLList();
  loading.value = false;
};

// 打开详情页
const openDetail = async (item) => {
  currentHTML.value = item;
  currentHTML.value.code = await HTML.getHTMLContent(item.url);
  view.value = "detail";
  nextTick(() => {
    initEditor();
  });
};

// 创建新的 HTML
const createNewHTML = async () => {
  currentHTML.value = await HTML.newDraft();
  view.value = "detail";
  nextTick(() => {
    sleep(100).then(() => {
      initEditor();
    });
  });
};

// 初始化编辑器 (简单 textarea)
const initEditor = async () => {
  // initialize CodeMirror editor
  const container = monacoContainer.value;
  if (container) {
    container.innerHTML = "";
    monacoEditor = new CodemirrorHTMLEditor(
      container,
      currentHTML.value.code,
      (code) => {
        currentHTML.value.code = code;
      },
    );

    await previewHTML();
  }
};

// 预览 HTML
const previewHTML = async () => {
  previewing.value = true;
  try {
    // 将当前代码保存到临时 Blob URL 进行预览
    // const blob = new Blob([currentHTML.value.code], { type: "text/html" });
    // if (previewUrl.value) {
    //   URL.revokeObjectURL(previewUrl.value);
    // }
    // previewUrl.value = URL.createObjectURL(blob);

    const path = await HTML.saveTempHtml(currentHTML.value.code);
    previewUrl.value = path;

    // console.log(iframeRef.value);
    // const doc =
    //   iframeRef.value.contentDocument || iframeRef.value.contentWindow.document;
    // doc.open();
    // // 清空整个文档内容后再写入
    // if (doc.documentElement) {
    //   doc.documentElement.innerHTML = "";
    // }
    // doc.write(currentHTML.value.code);
    // doc.close();
  } catch (e) {
    console.error("Preview failed:", e);
  } finally {
    previewing.value = false;
  }
};

// 保存 HTML
const saveHTML = async () => {
  try {
    let thumbnail = "";

    if (updateCover.value) {
      const res = await HTML.requestMessage(iframeRef.value, "screenshot");
      thumbnail = res.data;
      console.log("png", thumbnail);
    }

    await HTML.saveHTMLBackground(
      currentHTML.value.title,
      currentHTML.value.code,
      thumbnail,
    );

    goBack();
  } catch (e) {
    console.error("Failed to save HTML:", e);
    ElMessageBox.alert(t("htmlWallpaper.saveFailed") + e, "错误", {
      confirmButtonText: t("common.confirm"),
      type: "error",
    });
  }
};

// 生成缩略图
const generateThumbnail = async (folderPath) => {
  // 这里可以添加缩略图生成逻辑
  // 目前使用默认封面
};

// 移除 HTML 壁纸
const removeHTMLBackground = async (item) => {
  ElMessageBox.confirm(
    t("htmlWallpaper.confirmRemoveHtml", { title: item.title }),
    t("htmlWallpaper.confirmRemove"),
    {
      confirmButtonText: t("common.confirm"),
      cancelButtonText: t("common.cancel"),
      type: "warning",
    },
  )
    .then(async () => {
      try {
        await HTML.removeHTMLBackground(item.title);
        // 刷新列表
        fetchList();
      } catch (e) {
        console.error("Failed to remove HTML background:", e);
      }
    })
    .catch(() => {
      // 用户取消了操作
    });
};

// 设置为桌面壁纸
const setHTMLBackground = async (item) => {
  await HTML.setHTMLBackground(item.url);
  readConfig();
};

const goBack = () => {
  if (previewUrl.value) {
    // URL.revokeObjectURL(previewUrl.value);
    previewUrl.value = "";
  }
  view.value = "list";
  fetchList();
};

const readConfig = async () => {
  config.value = await HTML.readConfig();

  console.log(config.value);
};

onMounted(() => {
  fetchList();
  readConfig();
  window.addEventListener("message", handleMessage);
});

onActivated(() => {
  fetchList();
  readConfig();
});

onBeforeUnmount(() => {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value);
  }
  window.removeEventListener("message", handleMessage);
});
</script>

<style lang="less">
.html-wallpaper {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 0;
  color: var(--desk-text, #202738);
  background: var(--desk-bg, #f4f6fa);
  overflow: hidden;

  .view-wrapper {
    position: absolute;
    inset: 0;
    min-height: 0;
  }

  .wallpaper-list {
    height: 100%;

    .loading {
      padding: 64px 24px;
      text-align: center;
      color: var(--desk-muted, #748096);
    }

    .grid {
      max-width: 1440px;
      margin: 0 auto;
      padding: 28px;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr));
      gap: 20px;
    }

    .html-item {
      background: var(--desk-surface, #fff);
      border: 1px solid var(--desk-border, #e4e8f0);
      border-radius: 14px;
      overflow: hidden;
      transition: border-color 180ms ease, box-shadow 180ms ease;

      &:hover {
        border-color: #c5cdef;
        box-shadow: 0 6px 20px rgba(32, 39, 56, 0.07);
      }

      .thumb {
        height: 180px;
        background: #182132;
        cursor: pointer;
      }

      .cover-image {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }

      .meta {
        min-height: 64px;
        padding: 14px 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;

        h3 {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 14px;
          font-weight: 600;
          color: var(--desk-text, #202738);
        }

        .actions {
          display: flex;
          flex-shrink: 0;
          gap: 6px;

          .el-button + .el-button { margin-left: 0; }
        }
      }

      &.add-new {
        min-height: 245px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        border: 1px dashed #c5cdef;
        background: #f8f9ff;
        cursor: pointer;

        .add-icon {
          display: grid;
          place-items: center;
          width: 64px;
          height: 64px;
          border-radius: 18px;
          color: var(--desk-accent, #5264d9);
          background: #ebefff;

          .el-icon { font-size: 30px !important; }
        }

        .meta {
          justify-content: center;
          h3 { color: var(--desk-accent, #5264d9); }
        }

        &:hover { background: #f0f3ff; }
      }
    }

    .html-item-active {
      border-color: var(--desk-accent, #5264d9);
      box-shadow: 0 0 0 2px #e4e8ff;
    }
  }

  .detail-page {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;

    .detail-header {
      display: flex;
      flex-shrink: 0;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
      padding: 16px 24px;
      background: var(--desk-surface, #fff);
      border-bottom: 1px solid var(--desk-border, #e4e8f0);

      .left {
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;

        .el-button {
          width: 34px;
          height: 34px;
          padding: 0;
          border-radius: 10px;
          color: var(--desk-muted, #748096);
          background: var(--desk-bg, #f4f6fa);

          &:hover { color: var(--desk-accent, #5264d9); }
        }

        .detail-title {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 15px;
          font-weight: 600;
        }
      }

      .button-bar {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px;

        .el-button + .el-button { margin-left: 0; }

        .update-cover-switch {
          display: flex;
          align-items: center;
          gap: 8px;
          padding-right: 8px;
          font-size: 13px;
          color: var(--desk-muted, #748096);
        }
      }
    }

    .detail {
      display: flex;
      flex: 1;
      min-height: 0;
      min-width: 0;
      padding: 20px 24px 24px;
      gap: 20px;
      overflow: hidden;

      > .left {
        position: relative;
        flex: 1;
        min-width: 0;
        min-height: 0;
        overflow: hidden;
        background: #182132;
        border: 1px solid var(--desk-border, #e4e8f0);
        border-radius: 12px;

        .babylon-canvas {
          display: block;
          width: 100%;
          height: 100%;
        }
      }

      > .right {
        display: flex;
        flex-direction: column;
        width: 55%;
        min-width: 0;
        min-height: 0;
        overflow: hidden;
        background: var(--desk-surface, #fff);
        border: 1px solid var(--desk-border, #e4e8f0);
        border-radius: 12px;

        &::before {
          content: "HTML";
          flex-shrink: 0;
          display: block;
          padding: 12px 16px;
          font-size: 11px;
          font-weight: 600;
          color: var(--desk-muted, #748096);
          letter-spacing: 0.08em;
          border-bottom: 1px solid var(--desk-border, #e4e8f0);
        }

        .monaco-editor, .editor-container {
          flex: 1;
          min-height: 0;
          overflow: hidden;

          .cm-editor { height: 100%; }
          .cm-scroller { overflow: auto; }
        }
      }
    }
  }


  .preview-container {
    width: 100%;
    height: 100%;
    position: relative;

    .fullscreen-btn {
      position: absolute;
      top: 12px;
      right: 12px;
      z-index: 20;
      display: grid;
      place-items: center;
      width: 34px;
      height: 34px;
      border-radius: 9px;
      background: rgba(24, 33, 50, 0.8);
      color: white;
      cursor: pointer;
      transition: background 180ms ease;

      &:hover { background: var(--desk-accent, #5264d9); }
    }

    .html-preview {
      display: block;
      width: 100%;
      height: 100%;
      border: 0;
      background: #fff;
    }

    .preview-placeholder {
      display: grid;
      place-items: center;
      height: 100%;
      padding: 24px;
      text-align: center;
      color: #bac5d7;
      font-size: 14px;
    }
  }

  .fade-slide-enter-active, .fade-slide-leave-active {
    transition: opacity 180ms ease;
  }
  .fade-slide-enter-from, .fade-slide-leave-to { opacity: 0; }

  @media (max-width: 760px) {
    .wallpaper-list .grid { padding: 16px; gap: 16px; }
    .detail-page {
      .detail-header { padding: 12px 16px; }
      .detail {
        flex-direction: column;
        padding: 16px;
        gap: 12px;

        > .left { flex: 1; }
        > .right { width: 100%; flex: 1; }
      }
    }
  }
}
</style>
