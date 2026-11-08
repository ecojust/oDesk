<template>
  <div class="stage">
    <header class="workspace-header">
      <div class="brand">
        <span class="brand-mark" aria-hidden="true"><el-icon><Monitor /></el-icon></span>
        <div><strong>oDesk</strong><span>{{ t('stage.workspace') }}</span></div>
      </div>
      <div class="top-right-controls">
        <LanguageSwitcher />
        <span class="controls-divider" aria-hidden="true"></span>
        <button class="control-button" :title="t('stage.modelSettings.title')" :aria-label="t('stage.modelSettings.title')" @click="showModelSettingsDialog">
          <el-icon><Setting /></el-icon>
        </button>
        <button class="control-button" :title="t('stage.about.button')" :aria-label="t('stage.about.button')" @click="showAboutDialog">
          <el-icon><InfoFilled /></el-icon>
        </button>
      </div>
    </header>
    <div class="stage-header">
      <el-tabs v-model="activeTab" class="stage-tabs">
        <el-tab-pane name="skillapps">
          <template #label>
            <span class="custom-tabs-label">
              <span>{{ $t("stage.tabs.skillapps") }}</span>
              <span class="platform-icons">
                <i class="oDesk oDesk-windows"></i>
                <i class="oDesk oDesk-mac"></i>
              </span>
            </span>
          </template>
        </el-tab-pane>
        <el-tab-pane name="static">
          <template #label>
            <span class="custom-tabs-label">
              <span>{{ $t("stage.tabs.static") }}</span>
              <span class="platform-icons">
                <i class="oDesk oDesk-windows"></i>
                <i class="oDesk oDesk-mac"></i>
              </span>
            </span>
          </template>
        </el-tab-pane>
        <el-tab-pane name="shader">
          <template #label>
            <span class="custom-tabs-label">
              <span>{{ $t("stage.tabs.shader") }}</span>
              <span class="platform-icons">
                <i class="oDesk oDesk-mac"></i>
              </span>
            </span>
          </template>
        </el-tab-pane>
        <el-tab-pane name="html">
          <template #label>
            <span class="custom-tabs-label">
              <span>{{ $t("stage.tabs.html") }}</span>
              <span class="platform-icons">
                <i class="oDesk oDesk-mac"></i>
              </span>
            </span>
          </template>
        </el-tab-pane>
      </el-tabs>
    </div>

    <div class="stage-content">
      <keep-alive>
        <component :is="activeComponent" />
      </keep-alive>
    </div>

    <!-- 模型设置对话框 -->
    <el-dialog
      v-model="modelSettingsDialogVisible"
      width="460px"
      center
      :show-close="true"
      :title="t('stage.modelSettings.title')"
    >
      <OpenCodeVersion />
      <el-form
        class="model-settings-form"
        :model="modelSettings"
        label-position="top"
      >
        <el-form-item :label="t('stage.modelSettings.model')">
          <el-select
            v-model="selectedModelKey"
            :placeholder="t('stage.modelSettings.modelPlaceholder')"
            filterable
            :empty-text="t('stage.modelSettings.noModels')"
            @change="handleModelChange"
          >
            <el-option
              v-for="model in modelOptions"
              :key="getModelOptionKey(model)"
              :label="`${model.providerID}/${model.modelID}`"
              :value="getModelOptionKey(model)"
            >
              <span>{{ model.providerID }}/{{ model.modelID }}</span>
              <span class="model-option-source">
                {{ t(`stage.modelSettings.${model.source}`) }}
              </span>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item :label="t('stage.modelSettings.apiKey')">
          <el-input
            v-model="modelSettings.apiKey"
            :placeholder="t('stage.modelSettings.apiKeyPlaceholder')"
            type="text"
            :disabled="apiKeyLocked"
            :clearable="!apiKeyLocked"
          >
            <template #suffix>
              <el-icon
                class="api-key-lock"
                :title="
                  apiKeyLocked
                    ? t('stage.modelSettings.unlockApiKey')
                    : t('stage.modelSettings.lockApiKey')
                "
                @click.stop="toggleApiKeyLock"
              >
                <Lock v-if="apiKeyLocked" />
                <Unlock v-else />
              </el-icon>
            </template>
          </el-input>
        </el-form-item>
        <!-- <p class="model-settings-current">
          {{ modelSettings.providerID }}/{{ modelSettings.modelID }}
        </p> -->
        <!-- <p class="model-settings-path">
          {{ t("stage.modelSettings.modelPath") }}
        </p> -->
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <!-- <el-button @click="resetModelSettings">
            {{ t("common.reset") }}
          </el-button>
          <el-button @click="modelSettingsDialogVisible = false">
            {{ t("common.cancel") }}
          </el-button> -->
          <el-button type="primary" @click="saveModelSettingsForm">
            {{ t("common.save") }}
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 关于对话框 -->
    <el-dialog
      v-model="aboutDialogVisible"
      width="460px"
      center
      :show-close="true"
    >
      <div class="about-content">
        <img src="/logo.png" alt="oDesk Logo" class="app-logo" />
        <!-- <h2 class="app-name">oDesk</h2> -->
        <p class="version">
          {{ $t("stage.about.version") }}: {{ build_info.version }}
        </p>
        <p class="build-time">
          {{ $t("stage.about.buildTime") }}: {{ build_info.buildTime }}
        </p>

        <p class="build-number">
          {{ $t("stage.about.buildNumber") }}: {{ build_info.buildNumber }}
        </p>

        <OpenCodeVersion />

        <div class="runtime-section">
          <h3 class="runtime-title">
            {{ $t("stage.about.runtimeDependencies") }}
          </h3>
          <div
            v-if="isRuntimeDependencyChecking"
            class="runtime-status runtime-muted"
          >
            {{ $t("stage.about.runtimeChecking") }}
          </div>
          <div
            v-else-if="runtimeDependencyCheckFailed"
            class="runtime-status runtime-error"
          >
            {{ $t("stage.about.runtimeCheckFailed") }}
          </div>
          <div v-else class="runtime-list">
            <div
              v-for="item in runtimeDependencyRows"
              :key="item.key"
              class="runtime-item"
            >
              <div class="runtime-name">{{ item.name }}</div>
              <div class="runtime-meta">
                <el-tag
                  :type="item.installed ? 'success' : 'danger'"
                  effect="plain"
                  size="small"
                >
                  {{
                    item.installed
                      ? $t("stage.about.runtimeInstalled")
                      : $t("stage.about.runtimeMissing")
                  }}
                </el-tag>
                <span class="runtime-version">
                  {{
                    item.installed
                      ? item.version || $t("stage.about.runtimeVersionUnknown")
                      : "-"
                  }}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div class="log-section">
          <el-button type="primary" @click="showLogDialog">
            <el-icon><Document /></el-icon>
            {{ t("stage.viewLogs") }}
          </el-button>
          <p class="github-tip">github: https://github.com/ecojust/oDesk</p>
        </div>
      </div>
    </el-dialog>

    <!-- 日志查看对话框 -->
    <el-dialog
      v-model="logDialogVisible"
      width="800px"
      center
      :show-close="true"
      :title="t('stage.systemLogs')"
    >
      <div class="log-content">
        <div class="log-header">
          <el-select
            v-model="selectedDate"
            :placeholder="t('stage.selectDate')"
            @change="loadLogs"
            style="width: 200px"
          >
            <el-option
              v-for="date in logDates"
              :key="date"
              :label="date"
              :value="date"
            />
          </el-select>
          <el-button @click="refreshLogs" type="primary" size="small">
            <el-icon><Refresh /></el-icon>
            {{ t("stage.refresh") }}
          </el-button>
        </div>
        <div class="log-viewer">
          <pre class="log-text">{{ logContent }}</pre>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { Calendar, Apple, Monitor } from "@element-plus/icons-vue";
import StaticWallpaper from "./wallpaperSettings/StaticWallpaper.vue";
import ShaderWallpaper from "./wallpaperSettings/ShaderWallpaper.vue";
import ThreeDWallpaper from "./wallpaperSettings/ThreeDWallpaper.vue";
import HTMLWallpaper from "./wallpaperSettings/HTMLWallpaper.vue";
import LanguageSwitcher from "../components/LanguageSwitcher.vue";
import OpenCodeVersion from "../components/OpenCodeVersion.vue";

import SKILL from "./skillapps/index.vue";
import {
  Setting,
  InfoFilled,
  Document,
  Refresh,
  Lock,
  Unlock,
} from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";
import Opencode from "@/service/shell/opencode";
import RequestService from "@/utils/request";
import { checkRuntimeDependencies } from "@/utils/util";
import System from "@/service/shell/system";
import {
  DEFAULT_MODEL_SETTINGS,
  getModelOptionKey,
  loadModelOptions,
  loadModelSettings,
  loadModelSettingsWithAuth,
  loadOpencodeAuth,
  parseModelOptionKey,
  saveModelSettings,
} from "@/service/modelSettings";

import { BUILD_INFO } from "../build";

const { t } = useI18n();

const activeTab = ref("skillapps");

const aboutDialogVisible = ref(false);
const modelSettingsDialogVisible = ref(false);
const logDialogVisible = ref(false);
const logContent = ref("");
const logDates = ref([]);
const selectedDate = ref("");
const isRuntimeDependencyChecking = ref(false);
const runtimeDependencyCheckFailed = ref(false);
const runtimeDependencyRows = ref([]);
const modelSettings = ref(loadModelSettings());
const modelOptions = ref([]);
const selectedModelKey = ref(getModelOptionKey(modelSettings.value));
const apiKeyLocked = ref(true);

const buildTime = ref("2026-03-20 21:21:00");

const getRuntimeDependencyRows = (dependencies = {}) => [
  {
    key: "node",
    name: "Node.js",
    installed: Boolean(dependencies.node?.installed),
    version: dependencies.node?.version || "",
  },
  {
    key: "python",
    name: "Python",
    installed: Boolean(dependencies.python?.installed),
    version: dependencies.python?.version || "",
  },
];

const loadRuntimeDependencies = async () => {
  isRuntimeDependencyChecking.value = true;
  runtimeDependencyCheckFailed.value = false;

  const result = await checkRuntimeDependencies();

  if (result.error) {
    runtimeDependencyRows.value = getRuntimeDependencyRows();
    runtimeDependencyCheckFailed.value = true;
  } else {
    runtimeDependencyRows.value = getRuntimeDependencyRows(result.dependencies);
  }

  isRuntimeDependencyChecking.value = false;
};

const showAboutDialog = () => {
  aboutDialogVisible.value = true;
  loadRuntimeDependencies();
  Opencode.fetch_opencode_version();
};

const showModelSettingsDialog = async () => {
  Opencode.fetch_opencode_version();
  try {
    const [settings, options] = await Promise.all([
      loadModelSettingsWithAuth(),
      loadModelOptions(),
    ]);

    modelSettings.value = settings;
    modelOptions.value = options;
    selectedModelKey.value = getModelOptionKey(settings);
    apiKeyLocked.value = true;
  } catch (e) {
    console.error("加载模型认证失败:", e);
    modelSettings.value = loadModelSettings();
    ElMessage.error(t("stage.modelSettings.loadAuthFailed"));
  }
  modelSettingsDialogVisible.value = true;
};

const resetModelSettings = () => {
  const defaultModel = modelOptions.value[0] || DEFAULT_MODEL_SETTINGS;

  modelSettings.value = {
    ...DEFAULT_MODEL_SETTINGS,
    providerID: defaultModel.providerID,
    modelID: defaultModel.modelID,
  };
  selectedModelKey.value = getModelOptionKey(modelSettings.value);
  apiKeyLocked.value = true;
};

const toggleApiKeyLock = () => {
  apiKeyLocked.value = !apiKeyLocked.value;
};

const handleModelChange = async (modelKey) => {
  const selectedModel = parseModelOptionKey(modelKey);
  modelSettings.value = {
    ...modelSettings.value,
    providerID: selectedModel.providerID,
    modelID: selectedModel.modelID,
  };

  try {
    const auth = await loadOpencodeAuth();
    modelSettings.value.apiKey = auth[selectedModel.providerID]?.key || "";
    apiKeyLocked.value = true;
  } catch (e) {
    console.error("加载模型认证失败:", e);
    modelSettings.value.apiKey = "";
  }
};

const saveModelSettingsForm = async () => {
  try {
    await saveModelSettings({
      providerID:
        modelSettings.value.providerID.trim() ||
        DEFAULT_MODEL_SETTINGS.providerID,
      modelID:
        modelSettings.value.modelID.trim() || DEFAULT_MODEL_SETTINGS.modelID,
      apiKey: apiKeyLocked.value ? "" : modelSettings.value.apiKey.trim(),
    });
    modelSettingsDialogVisible.value = false;
    ElMessage.success(t("stage.modelSettings.saveSuccess"));
  } catch (e) {
    console.error("保存模型设置失败:", e);
    ElMessage.error(t("stage.modelSettings.saveFailed"));
  }
};

const showLogDialog = async () => {
  aboutDialogVisible.value = false;
  logDialogVisible.value = true;
  await loadLogDates();
  await loadLogs();
};

const loadLogDates = async () => {
  try {
    const dates = await System.get_log_dates();
    logDates.value = dates;
    if (dates.length > 0 && !selectedDate.value) {
      selectedDate.value = dates[0]; // 选择最新的日期
    }
  } catch (e) {
    console.error("加载日志日期失败:", e);
  }
};

const loadLogs = async () => {
  try {
    const logs = await System.read_logs(selectedDate.value);
    logContent.value = logs;
  } catch (e) {
    logContent.value = t("stage.loadLogsFailed") + e;
  }
};

const refreshLogs = async () => {
  await loadLogDates();
  await loadLogs();
};

const components = {
  static: StaticWallpaper,
  shader: ShaderWallpaper,
  "3d": ThreeDWallpaper,
  html: HTMLWallpaper,
  skillapps: SKILL,
};

const activeComponent = computed(() => components[activeTab.value] || null);
const build_info = computed(() => BUILD_INFO);

onMounted(async () => {
  // const res = await RequestService.postBody({
  //   url: "http://127.0.0.1:4096/session",
  // });
  // console.log(res);
});

const testCreateWorkspace = async () => {
  try {
    await Opencode.create_workspace("test-workspace");
    alert(t("skillapps.createWorkspaceSuccess"));
  } catch (e) {
    alert(t("skillapps.createWorkspaceFailed") + e);
  }
};

const testExecuteOpenServe = async () => {
  try {
    await Opencode.execute_opencode_serve("test-workspace");
    alert(t("skillapps.executeServeSuccess"));
  } catch (e) {
    alert(t("skillapps.executeServeFailed") + e);
  }
};

const testKillOpenServe = async () => {
  try {
    await Opencode.kill_existing_opencode_processes();
    alert(t("skillapps.killServeSuccess"));
  } catch (e) {
    alert(t("skillapps.killServeFailed") + e);
  }
};
</script>

<style lang="less" scoped>
.stage {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  height: 100dvh;
  background: var(--desk-bg);
  color: var(--desk-text);
  padding: 0 32px 24px;
  overflow: hidden;

  .workspace-header {
    min-height: 86px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    flex-shrink: 0;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 12px;
    .brand-mark {
      display: grid;
      place-items: center;
      width: 42px;
      height: 42px;
      border-radius: 13px;
      background: var(--desk-accent);
      color: white;
      font-size: 23px;
    }
    strong { display: block; font-size: 22px; line-height: 1.2; letter-spacing: -.7px; }
    div > span { font-size: 12px; color: var(--desk-muted); }
  }
  .stage-header {
    flex-shrink: 0;
    border-bottom: 1px solid var(--desk-border);
    :deep(.stage-tabs) {
      .el-tabs__header { margin: 0; }
      .el-tabs__content { display: none; }
      .el-tabs__nav-wrap::after { display: none; }
      .el-tabs__item {
        font-size: 14px;
        padding: 0 22px;
        height: 54px;
        color: var(--desk-muted);
        &.is-active { color: var(--desk-accent); font-weight: 600; }
      }
      .el-tabs__active-bar { height: 3px; border-radius: 3px; background: var(--desk-accent); }
      .custom-tabs-label { display: flex; align-items: center; gap: 10px; }
      .platform-icons { display: flex; gap: 4px; font-size: 12px; opacity: .65; }
    }
  }
  .stage-content { flex: 1; min-height: 0; overflow: auto; }
  .top-right-controls {
    display: flex;
    align-items: center;
    gap: 8px;
    .controls-divider { width: 1px; height: 22px; background: var(--desk-border); margin: 0 8px; }
    .control-button {
      display: grid;
      place-items: center;
      width: 36px;
      height: 36px;
      background: var(--desk-surface);
      border: 1px solid var(--desk-border);
      border-radius: 10px;
      color: var(--desk-muted);
      font-size: 18px;
      cursor: pointer;
      transition: color .15s, border-color .15s;
      &:hover { color: var(--desk-accent); border-color: var(--desk-accent); }
    }
  }
  @media (max-width: 700px) {
    padding: 0 16px 16px;
    .workspace-header { min-height: 76px; }
    .brand { gap: 8px; }
    .brand div > span { display: none; }
    .top-right-controls { gap: 4px; .controls-divider { margin: 0 2px; } }
    .stage-header :deep(.stage-tabs .el-tabs__item) { padding: 0 14px; font-size: 13px; }
    .platform-icons { display: none !important; }
  }

  .model-settings-form {
    padding: 8px 0;

    :deep(.el-select) {
      width: 100%;
    }
  }

  .model-option-source {
    float: right;
    margin-left: 12px;
    color: #909399;
    font-size: 12px;
  }

  .api-key-lock {
    cursor: pointer;
    color: #606266;
  }

  .api-key-lock:hover {
    color: #409eff;
  }

  .model-settings-current,
  .model-settings-path {
    margin: 4px 0 0;
    color: #909399;
    font-size: 12px;
    line-height: 1.5;
  }

  .dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }

  .about-content {
    text-align: center;
    padding: 10px 0;
    .app-logo {
      // width: 64px;
      height: 64px;
      margin-bottom: 16px;
    }
    .app-name {
      margin: 0 0 8px 0;
      font-size: 20px;
      font-weight: 600;
      color: #303133;
    }
    .version {
      color: #909399;
      margin: 0 0 4px 0;
      font-size: 14px;
    }
    .build-time {
      color: #c0c4cc;
      margin: 0;
      font-size: 12px;
    }
    .build-number {
      color: #c0c4cc;
      margin: 0;
      font-size: 12px;
    }
    .usage-section {
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px solid #ebeef5;
      text-align: left;
      .usage-title {
        font-size: 16px;
        font-weight: 600;
        color: #303133;
        margin: 0 0 12px 0;
      }
      .usage-subsection {
        margin-bottom: 16px;
        &:last-child {
          margin-bottom: 0;
        }
        .usage-subtitle {
          font-size: 14px;
          font-weight: 600;
          color: #409eff;
          margin: 0 0 8px 0;
        }
        .usage-steps {
          margin: 0;
          padding-left: 12px;
          p {
            color: #606266;
            font-size: 13px;
            line-height: 1.8;
            margin-bottom: 6px;
            &:last-child {
              margin-bottom: 0;
            }
          }
        }
      }
    }
    .runtime-section {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid #ebeef5;
      text-align: left;
      .runtime-title {
        font-size: 16px;
        font-weight: 600;
        color: #303133;
        margin: 0 0 12px 0;
      }
      .runtime-status {
        font-size: 13px;
        line-height: 1.8;
      }
      .runtime-muted {
        color: #909399;
      }
      .runtime-error {
        color: #f56c6c;
      }
      .runtime-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .runtime-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 8px 10px;
        border: 1px solid #ebeef5;
        border-radius: 6px;
        background: #fafafa;
      }
      .runtime-name {
        color: #303133;
        font-size: 13px;
        font-weight: 600;
      }
      .runtime-meta {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .runtime-version {
        min-width: 72px;
        color: #606266;
        font-size: 12px;
        text-align: right;
      }
    }
    .log-section {
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px solid #ebeef5;
      text-align: center;
      .github-tip {
        margin-top: 12px;
        color: #909399;
        font-size: 13px;
        font-weight: 900;
      }
    }
  }
}

.log-content {
  .log-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    padding-bottom: 16px;
    border-bottom: 1px solid #ebeef5;
  }

  .log-viewer {
    height: 400px;
    overflow-y: auto;
    background: #f8f9fa;
    border-radius: 8px;
    padding: 16px;

    .log-text {
      font-family: "Consolas", "Monaco", "Courier New", monospace;
      font-size: 12px;
      line-height: 1.6;
      color: #333;
      white-space: pre-wrap;
      word-wrap: break-word;
      margin: 0;
    }
  }
}
</style>
