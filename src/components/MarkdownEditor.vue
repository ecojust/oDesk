<template>
  <div class="markdown-editor">
    <div class="editor-header">
      <div class="editor-title">Markdown Editor</div>
      <div class="editor-actions">
        <!-- <button class="action-btn" @click="togglePreview">
          {{ previewMode ? "Edit" : "Preview" }}
        </button>
        <button class="action-btn" @click="toggleFullscreen">
          {{ fullscreen ? "Exit Fullscreen" : "Fullscreen" }}
        </button> -->
      </div>
    </div>
    <div class="editor-content" :class="{ fullscreen: fullscreen }">
      <div
        v-if="!previewMode"
        ref="monacoContainer"
        class="editor-container"
      ></div>
      <div v-else class="preview-container" v-html="renderedHTML"></div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, watch } from "vue";
import { useI18n } from "vue-i18n";
import { CodemirrorMarkdownEditor } from "@/service/markdown";

const { locale } = useI18n();

const currentLocale = computed(() => locale.value);
const monacoContainer = ref(null);
const currentCode = ref("");
const previewMode = ref(false);
const fullscreen = ref(false);
const renderedHTML = ref("");

let monacoEditor = null;

// 初始化编辑器
const initEditor = async () => {
  const container = monacoContainer.value;
  if (container) {
    container.innerHTML = "";
    monacoEditor = new CodemirrorMarkdownEditor(
      container,
      currentCode.value,
      (code) => {
        currentCode.value = code;
        if (previewMode.value) {
          renderMarkdown();
        }
      },
    );

    await previewHTML();
  }
};

// 切换预览模式
const togglePreview = () => {
  previewMode.value = !previewMode.value;
  if (previewMode.value) {
    renderMarkdown();
  }
};

// 切换全屏模式
const toggleFullscreen = () => {
  fullscreen.value = !fullscreen.value;
};

// 渲染 Markdown
const renderMarkdown = () => {
  // 这里需要实现 Markdown 到 HTML 的转换
  // 可以使用 marked.js 或其他 Markdown 解析库
  renderedHTML.value = currentCode.value; // 临时实现
};

// 监听代码变化
watch(currentCode, (newCode) => {
  if (previewMode.value) {
    renderMarkdown();
  }
});

onMounted(() => {
  initEditor();
});
</script>

<style scoped>
.markdown-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
}

.editor-title {
  font-size: 14px;
  font-weight: 600;
  color: #495057;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.editor-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 500;
  color: #495057;
  background: #ffffff;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.action-btn:hover {
  background: #e9ecef;
  border-color: #ced4da;
  transform: translateY(-1px);
}

.action-btn:active {
  transform: translateY(0);
}

.editor-content {
  flex: 1;
  position: relative;
  transition: all 0.3s ease;
}

.editor-container {
  height: 100%;
  width: 100%;
  background: #ffffff;
}

.preview-container {
  height: 100%;
  width: 100%;
  padding: 20px;
  overflow-y: auto;
  background: #ffffff;
  border-top: 1px solid #e9ecef;
}

.preview-container h1,
.preview-container h2,
.preview-container h3,
.preview-container h4,
.preview-container h5,
.preview-container h6 {
  color: #212529;
  margin-top: 24px;
  margin-bottom: 16px;
  border-bottom: 2px solid #dee2e6;
  padding-bottom: 8px;
}

.preview-container p {
  color: #495057;
  line-height: 1.6;
  margin-bottom: 16px;
}

.preview-container code {
  background: #f8f9fa;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: "Courier New", monospace;
  border: 1px solid #e9ecef;
}

.preview-container pre {
  background: #f8f9fa;
  padding: 16px;
  border-radius: 6px;
  border: 1px solid #e9ecef;
  overflow-x: auto;
  margin: 16px 0;
}

.preview-container blockquote {
  border-left: 4px solid #007bff;
  padding-left: 16px;
  color: #6c757d;
  margin: 16px 0;
}

.preview-container ul,
.preview-container ol {
  color: #495057;
  margin-left: 20px;
  margin-bottom: 16px;
}

.preview-container a {
  color: #007bff;
  text-decoration: none;
}

.preview-container a:hover {
  text-decoration: underline;
}

.preview-container table {
  width: 100%;
  border-collapse: collapse;
  margin: 16px 0;
  border: 1px solid #dee2e6;
}

.preview-container th,
.preview-container td {
  border: 1px solid #dee2e6;
  padding: 8px 12px;
  text-align: left;
}

.preview-container th {
  background: #f8f9fa;
  font-weight: 600;
}

.fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  border-radius: 0;
  box-shadow: none;
}

/* 滚动条样式 */
.preview-container::-webkit-scrollbar {
  width: 8px;
}

.preview-container::-webkit-scrollbar-track {
  background: #f8f9fa;
}

.preview-container::-webkit-scrollbar-thumb {
  background: #dee2e6;
  border-radius: 4px;
}

.preview-container::-webkit-scrollbar-thumb:hover {
  background: #ced4da;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .editor-header {
    flex-direction: column;
    gap: 8px;
    align-items: stretch;
  }

  .editor-actions {
    justify-content: center;
  }

  .preview-container {
    padding: 16px;
  }
}
</style>
