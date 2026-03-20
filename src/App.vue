<template>
  <div id="app">
    <div class="app-container">
      <router-view />
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

<script setup lang="ts">
import { ref } from "vue";
import { InfoFilled } from "@element-plus/icons-vue";
import LanguageSwitcher from "./components/LanguageSwitcher.vue";

const aboutDialogVisible = ref(false);
const buildTime = ref("2026-03-20 21:21:00");

const showAboutDialog = () => {
  aboutDialogVisible.value = true;
};

// 路由应用的主入口
</script>

<style lang="less">
:root {
  font-family: Inter, Avenir, Helvetica, Arial, sans-serif;
  font-size: 16px;
  line-height: 24px;
  font-weight: 400;

  background: linear-gradient(
    135deg,
    #1e3c72 0%,
    #2a5298 25%,
    #667eea 75%,
    #764ba2 100%
  );
  background-attachment: fixed;

  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  -webkit-text-size-adjust: 100%;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

#app {
  width: 100vw;
  height: 100vh;
  background: inherit;
  position: relative;
}

.app-container {
  width: 100%;
  height: 100%;
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
}

.about-content .app-logo {
  width: 64px;
  height: 64px;
  margin-bottom: 16px;
}

.about-content .app-name {
  margin: 0 0 8px 0;
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}

.about-content .version {
  color: #909399;
  margin: 0 0 4px 0;
  font-size: 14px;
}

.about-content .build-time {
  color: #c0c4cc;
  margin: 0;
  font-size: 12px;
}

@media (prefers-color-scheme: dark) {
  :root {
    color: #f6f6f6;
    background: linear-gradient(
      135deg,
      #0f1419 0%,
      #1a2332 25%,
      #2d3748 75%,
      #4a5568 100%
    );
    background-attachment: fixed;
  }

  .about-content .app-name {
    color: #e4e7ed;
  }

  .about-content .version {
    color: #a0aec0;
  }

  .about-content .build-time {
    color: #718096;
  }
}
</style>
