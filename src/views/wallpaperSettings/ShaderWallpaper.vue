<template>
  <div class="shader-wallpaper">
    <div class="view-wrapper">
      <transition name="fade-slide" mode="out-in">
        <div v-if="view === 'list'" key="list" class="wallpaper-list">
          <el-scrollbar>
            <div v-if="loading" class="loading">{{ t('shaderWallpaper.loading') }}</div>
            <div v-else class="grid">
              <!-- 新增 Shader 按钮 -->
              <div class="shader-item add-new" @click="createNewShader">
                <div class="add-icon">
                  <el-icon size="48"><Plus /></el-icon>
                </div>
                <div class="meta">
                  <h3>{{ t('shaderWallpaper.newShader') }}</h3>
                </div>
              </div>
              <!-- 现有 Shader 列表 -->
              <div v-for="item in shaders" :key="item.name" class="shader-item">
                <div class="thumb" @click="setShaderBackground(item)">
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
                      @click="removeShaderBackground(item)"
                      >{{ t('shaderWallpaper.remove') }}</el-button
                    >
                    <el-button size="small" @click="openDetail(item)"
                      >{{ t('shaderWallpaper.edit') }}</el-button
                    >
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
                currentShader?.title || t('shaderWallpaper.shaderEditor')
              }}</span>
            </div>

            <div class="button-bar">
              <el-button @click="recompileShader" :loading="recompiling">
                {{ t('shaderWallpaper.recompile') }}
              </el-button>
              <el-button @click="saveShader" type="primary">{{ t('shaderWallpaper.save') }}</el-button>
            </div>
          </div>
          <div class="detail">
            <div class="left">
              <canvas id="babylon-canvas" class="babylon-canvas"></canvas>
            </div>
            <div class="right">
              <!-- <el-divider /> -->
              <div ref="monacoContainer" class="monaco-editor" />
            </div>
          </div>
        </div>
      </transition>
      <!-- hidden singleton mount for Monaco editor (keeps editor DOM alive) -->
      <div ref="monacoRoot" style="display: none"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, onBeforeUnmount, onActivated } from "vue";
import { useI18n } from "vue-i18n";
import {
  ElButton,
  ElDivider,
  ElInput,
  ElIcon,
  ElScrollbar,
} from "element-plus";
import { ArrowLeft, Plus } from "@element-plus/icons-vue";

import { initBabylon, CodemirrorShaderEditor, Shader } from "@/service/shader";
import { ElMessageBox } from "element-plus";
import { sleep } from "@/utils/util";

const { t } = useI18n();

const shaders = ref([]);
const loading = ref(true);
const view = ref("list"); // 'list' | 'detail'
const currentShader = ref(null);
const monacoContainer = ref(null);
const currentCode = ref("");
const config = ref({});
const recompiling = ref(false);

let babylonHandle = null;
let monacoEditor = null;

const defaultCover =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="300"><rect width="100%" height="100%" fill="%23111"/><text x="50%25" y="50%25" fill="%23fff" font-size="20" font-family="Arial" text-anchor="middle" alignment-baseline="middle">No cover</text></svg>';

const fetchList = async () => {
  try {
    const localShaders = await Shader.getLocalShaderList(); // for debug

    shaders.value = localShaders;
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
    // covers are static images; no thumbnail init required
  }
};

const openDetail = async (item) => {
  currentShader.value = item;
  // load code
  // const code = await fetch(item.url).then((r) => r.text());
  const code = await Shader.getGlslContent(item.url);
  console.log("Loaded shader code:", code);
  currentShader.value.code = code;
  view.value = "detail";
  nextTick(() => {
    initEditor();
  });
};

// 创建新的 Shader（从模板）
const createNewShader = async () => {
  try {
    const draft = await Shader.newDraft();
    currentShader.value = {
      title: draft.title,
      code: draft.code,
    };
    view.value = "detail";
    nextTick(() => {
      sleep(100).then(() => {
        initEditor();
      });
    });
  } catch (e) {
    console.error("Failed to create new shader:", e);
  }
};

// 初始化编辑器（Babylon + Monaco）
const initEditor = () => {
  // initialize CodeMirror editor
  const container = monacoContainer.value;
  if (container) {
    container.innerHTML = "";
    monacoEditor = new CodemirrorShaderEditor(
      container,
      currentShader.value.code,
      (code) => {
        currentShader.value.code = code;
      },
    );
  }

  const canvas = document.getElementById("babylon-canvas");
  if (canvas) {
    try {
      babylonHandle = initBabylon(canvas, () => currentShader.value.code);
    } catch (e) {
      console.error("init babylon failed", e);
    }
  }
};

const recompileShader = async () => {
  if (!babylonHandle || !babylonHandle.updateCode) {
    console.warn("No babylon handle or updateCode function available");
    return;
  }
  recompiling.value = true;
  try {
    // Update the shader code in Babylon
    babylonHandle.updateCode(currentShader.value.code);
  } catch (e) {
    console.error("Failed to recompile shader:", e);
  } finally {
    recompiling.value = false;
  }
};

const saveShader = async () => {
  const base64Data = await babylonHandle.sceneShot();
  console.log("saveShader", base64Data);
  await Shader.saveShaderBackground(
    currentShader.value.title,
    currentShader.value.code,
    base64Data,
  );
  goBack();
};

const removeShaderBackground = async (item) => {
  ElMessageBox.confirm(
    t('shaderWallpaper.confirmRemoveShader', { title: item.title }),
    t('shaderWallpaper.confirmRemove'),
    {
      confirmButtonText: t('common.confirm'),
      cancelButtonText: t('common.cancel'),
      type: "warning",
    },
  )
    .then(async () => {
      try {
        await Shader.removeShaderBackground(item.title);
        // 刷新列表
        fetchList();
      } catch (e) {
        console.error("Failed to remove shader background:", e);
      }
    })
    .catch(() => {
      // 用户取消了操作
    });
};

const setShaderBackground = (item) => {
  Shader.setShaderBackground(item.url);
  console.log("Set shader background:", item);
};

const goBack = () => {
  try {
    babylonHandle && babylonHandle.dispose && babylonHandle.dispose();
  } catch (e) {}
  babylonHandle = null;

  try {
    monacoEditor && monacoEditor.dispose && monacoEditor.dispose();
  } catch (e) {}
  monacoEditor = null;

  view.value = "list";
  fetchList();
};

// read config
const readConfig = async () => {
  try {
    config.value = await Shader.readConfig();
    console.log("read_config:", config.value);
  } catch (e) {
    console.error("read_config:", e);
  }
};

onMounted(() => {
  fetchList();
  readConfig();
});

onActivated(() => {
  // 每次进入页面都刷新列表，确保数据是最新的
  fetchList();
  readConfig();
});

onBeforeUnmount(() => {
  try {
    babylonHandle && babylonHandle.dispose && babylonHandle.dispose();
  } catch (e) {}
});
</script>

<style lang="less">
.shader-wallpaper {
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

    .shader-item {
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

    .shader-item-active {
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
          content: "GLSL";
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
