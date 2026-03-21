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
      width="380px"
      center
      :show-close="true"
    >
      <div class="about-content">
        <img src="/logo.png" alt="oDesk Logo" class="app-logo" />
        <h2 class="app-name">oDesk</h2>
        <p class="version">{{ $t("stage.about.version") }}: 1.0.0</p>
        <p class="build-time">
          {{ $t("stage.about.buildTime") }}: {{ buildTime }}
        </p>
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
import { InfoFilled } from "@element-plus/icons-vue";
import Opencode from "@/service/shell/opencode";
import RequestService from "@/utils/request";

const activeTab = ref("skillapps");

const aboutDialogVisible = ref(false);

const buildTime = ref("2026-03-20 21:21:00");

const showAboutDialog = () => {
  aboutDialogVisible.value = true;
};

const components = {
  static: StaticWallpaper,
  shader: ShaderWallpaper,
  "3d": ThreeDWallpaper,
  html: HTMLWallpaper,
  skillapps: SKILL,
};

const activeComponent = computed(() => components[activeTab.value] || null);

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
      width: 64px;
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
  }
}
</style>
