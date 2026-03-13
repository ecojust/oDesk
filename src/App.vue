<template>
  <div id="app">
    <div class="app-container">
      <router-view />
    </div>
    <div class="language-switcher-container">
      <LanguageSwitcher />
    </div>
  </div>
</template>

<script setup lang="ts">
import LanguageSwitcher from "./components/LanguageSwitcher.vue";

// 路由应用的主入口
</script>

<style>
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

.language-switcher-container {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 10;
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
}
</style>
