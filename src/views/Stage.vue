<template>
  <div class="stage">
    <div class="stage-header">
      <el-tabs v-model="activeTab" class="stage-tabs">
        <el-tab-pane label="静态壁纸" name="static" />
        <el-tab-pane label="着色器壁纸" name="shader" />
        <!-- <el-tab-pane label="三维壁纸" name="3d" /> -->
        <el-tab-pane label="网页壁纸" name="html" />
      </el-tabs>
      <div class="test-buttons">
        <el-button type="primary" size="small" @click="testCreateWorkspace"
          >测试创建工作区</el-button
        >
        <el-button type="success" size="small" @click="testExecuteOpenServe"
          >测试执行服务</el-button
        >

        <el-button type="warning" size="small" @click="testKillOpenServe"
          >测试销毁服务</el-button
        >
      </div>
    </div>

    <div class="stage-content">
      <keep-alive>
        <component :is="activeComponent" />
      </keep-alive>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import StaticWallpaper from "./wallpaperSettings/StaticWallpaper.vue";
import ShaderWallpaper from "./wallpaperSettings/ShaderWallpaper.vue";
import ThreeDWallpaper from "./wallpaperSettings/ThreeDWallpaper.vue";
import HTMLWallpaper from "./wallpaperSettings/HTMLWallpaper.vue";
import Opencode from "@/service/shell/opencode";

const activeTab = ref("static");

const components = {
  static: StaticWallpaper,
  shader: ShaderWallpaper,
  "3d": ThreeDWallpaper,
  html: HTMLWallpaper,
};

const activeComponent = computed(() => components[activeTab.value] || null);

onMounted(() => {});

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
    }
  }

  .stage-content {
    flex: 1;
    overflow-y: auto;
    background: white;
    border-radius: 0 0 8px 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
}
</style>
