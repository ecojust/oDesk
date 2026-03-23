<template>
  <div class="stage">
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
      <!-- <div class="test-buttons">
        <el-button type="primary" size="small" @click="testCreateWorkspace"
          >{{ $t("stage.testButtons.createWorkspace") }}</el-button
        >
        <el-button type="success" size="small" @click="testExecuteOpenServe"
          >{{ $t("stage.testButtons.executeServe") }}</el-button
        >

        <el-button type="warning" size="small" @click="testKillOpenServe"
          >{{ $t("stage.testButtons.killServe") }}</el-button
        >
      </div> -->
    </div>

    <div class="stage-content">
      <keep-alive>
        <component :is="activeComponent" />
      </keep-alive>
    </div>

    <div class="top-right-controls">
      <LanguageSwitcher />
      <el-icon class="about-button" @click="showAboutDialog"
        ><InfoFilled
      /></el-icon>
    </div>

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
        <div class="usage-section">
          <h3 class="usage-title">{{ $t("stage.about.usage") }}</h3>
          <div class="usage-subsection">
            <h4 class="usage-subtitle">
              {{ $t("stage.about.usageSubtitle1") }}
            </h4>
            <div class="usage-steps">
              <p>{{ $t("stage.about.usageStep1_1") }}</p>
              <p>{{ $t("stage.about.usageStep1_2") }}</p>
            </div>
          </div>
        </div>
        <div class="log-section">
          <el-button type="primary" @click="showLogDialog">
            <el-icon><Document /></el-icon>
            查看日志
          </el-button>
        </div>
      </div>
    </el-dialog>

    <!-- 日志查看对话框 -->
    <el-dialog
      v-model="logDialogVisible"
      width="800px"
      center
      :show-close="true"
      title="系统日志"
    >
      <div class="log-content">
        <div class="log-header">
          <el-select
            v-model="selectedDate"
            placeholder="选择日期"
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
            刷新
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
import { Calendar, Apple, Monitor } from "@element-plus/icons-vue";
import StaticWallpaper from "./wallpaperSettings/StaticWallpaper.vue";
import ShaderWallpaper from "./wallpaperSettings/ShaderWallpaper.vue";
import ThreeDWallpaper from "./wallpaperSettings/ThreeDWallpaper.vue";
import HTMLWallpaper from "./wallpaperSettings/HTMLWallpaper.vue";
import LanguageSwitcher from "../components/LanguageSwitcher.vue";

import SKILL from "./skillapps/index.vue";
import { InfoFilled, Document, Refresh } from "@element-plus/icons-vue";
import Opencode from "@/service/shell/opencode";
import RequestService from "@/utils/request";
import System from "@/service/shell/system";

import { BUILD_INFO } from "../build";

const activeTab = ref("skillapps");

const aboutDialogVisible = ref(false);
const logDialogVisible = ref(false);
const logContent = ref("");
const logDates = ref([]);
const selectedDate = ref("");

const buildTime = ref("2026-03-20 21:21:00");

const showAboutDialog = () => {
  aboutDialogVisible.value = true;
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
    logContent.value = "读取日志失败: " + e;
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
    alert("创建工作区成功");
  } catch (e) {
    alert("创建工作区失败: " + e);
  }
};

const testExecuteOpenServe = async () => {
  try {
    await Opencode.execute_opencode_serve("test-workspace");
    alert("执行服务成功");
  } catch (e) {
    alert("执行服务失败: " + e);
  }
};

const testKillOpenServe = async () => {
  try {
    await Opencode.kill_existing_opencode_processes();
    alert("kill服务成功");
  } catch (e) {
    alert("执行服务失败: " + e);
  }
};
</script>

<style lang="less" scoped>
.stage {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  background: #f5f5f5;
  padding: 20px;
  box-sizing: border-box;

  .test-buttons {
    display: flex;
    gap: 10px;
    padding: 10px 20px;
    border-bottom: 1px solid #e4e7ed;
  }

  .stage-header {
    flex-shrink: 0;
    background: white;
    border-radius: 8px 8px 0 0;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

    :deep(.stage-tabs) {
      .el-tabs__header {
        margin: 0;
      }

      .el-tabs__nav-wrap::after {
        height: 1px;
      }

      .el-tabs__item {
        font-size: 16px;
        padding: 0 20px;
        height: 50px;
        line-height: 50px;

        &.is-active {
          color: #007bff;
          font-weight: 600;
        }
      }

      .el-tabs__active-bar {
        background-color: #007bff;
      }

      .custom-tabs-label {
        display: flex;
        align-items: center;
        gap: 8px;

        .platform-icons {
          display: flex;
          gap: 4px;

          .el-icon {
            font-size: 16px;
          }

          .windows-icon {
            color: #d45800;
            font-weight: 900;
          }

          .mac-icon {
            color: #d45800;
            font-weight: 900;
          }
        }
      }
    }
  }

  .stage-content {
    flex: 1;
    overflow-y: auto;
    background: white;
    border-radius: 0 0 8px 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .top-right-controls {
    position: absolute;
    top: 20px;
    right: 20px;
    z-index: 10;
    display: flex;
    align-items: center;
    gap: 4px;
    .about-button {
      color: rgba(0, 0, 0, 0.6);
      transition: all 0.3s ease;
      margin: 0 4px;
      cursor: pointer;
    }
    .about-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
    }
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
    .log-section {
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px solid #ebeef5;
      text-align: center;
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
