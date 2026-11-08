<template>
  <main class="app-container">
    <router-view />
  </main>
</template>

<style lang="less">
@import "./styles/theme.less";
:root {
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  line-height: 1.6;
  font-weight: 400;
  color: var(--desk-text);
  background: var(--desk-bg);
  color-scheme: light;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  -webkit-text-size-adjust: 100%;
}

* { box-sizing: border-box; }
body { margin: 0; }
#app, .app-container { width: 100%; height: 100vh; height: 100dvh; }
button, input, textarea, select { font: inherit; }
button { touch-action: manipulation; }
button:focus-visible, [role="button"]:focus-visible, a:focus-visible {
  outline: 3px solid var(--desk-accent);
  outline-offset: 3px;
}
::selection { background: #dfe4ff; color: #202738; }
</style>
