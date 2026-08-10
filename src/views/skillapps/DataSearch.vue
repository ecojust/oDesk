<template>
  <div class="data-search">
    <ServerStatus
      :isConnected="isConnected"
      :isConnectting="isConnectting"
      :sessionId="sessionId"
      :skills="skills"
      @reconnect="activeWorkspace"
      @resetSkills="resetSkills"
      @selectSkill="selectSkill"
      @openWorkspace="openWorkspace"
    />

    <!-- 搜索Loading状态 -->
    <div class="loading-overlay" v-if="isSearching">
      <div class="loading-card">
        <div class="loading-icon">🔍</div>
        <h3>{{ t("dataSearch.generating") }}</h3>
        <p>{{ t("dataSearch.generatingDescription") }}</p>
        <div class="progress-bar">
          <div class="progress-fill"></div>
        </div>
      </div>
    </div>

    <!-- 中间内容区域 -->
    <div class="content-section">
      <!-- 搜索和结果面板 -->
      <div class="search-panel">
        <div class="panel-content">
          <!-- 搜索容器 -->
          <div class="search-container">
            <div class="input-group">
              <input
                type="text"
                :placeholder="t('dataSearch.searchPlaceholder')"
                class="search-input"
                v-model="searchQuery"
                @keyup.enter="searchData"
              />
              <button
                class="search-btn"
                @click="searchData"
                :disabled="isSearching"
              >
                <i class="icon" :class="{ loading: isSearching }">🔍</i>
                <span v-if="isSearching" class="loading-text">{{
                  t("dataSearch.generatingStatus")
                }}</span>
                <span v-else>{{ t("dataSearch.generate") }}</span>
              </button>
            </div>
          </div>

          <!-- 搜索失败或数据解析失败 -->
          <div class="empty-state" v-if="dataError">
            <div class="empty-icon">⚠️</div>
            <h3>{{ t("dataSearch.parseFailed") }}</h3>
            <pre class="error-content">{{ dataError }}</pre>
          </div>

          <!-- 结果表格 -->
          <div class="results-area" v-else-if="tableData.length > 0">
            <div class="results-header">
              <span class="result-title">{{ resultMeta.description }}</span>
              <span class="result-count"
                >{{ t("dataSearch.total") }}: {{ tableData.length }}</span
              >
            </div>
            <div class="result-wrapper">
              <el-table
                :data="tableData"
                stripe
                bordered
                empty-text="-"
                size="small"
              >
                <el-table-column
                  v-for="(col, colIndex) in columns"
                  :key="colIndex"
                  :prop="String(colIndex)"
                  :label="col"
                  min-width="120"
                  show-overflow-tooltip
                  sortable
                />
              </el-table>
            </div>
          </div>

          <!-- 搜索后无结果 -->
          <div class="initial-state" v-else-if="hasSearched">
            <div class="empty-icon">📭</div>
            <h3>{{ t("dataSearch.noResults") }}</h3>
            <p>{{ t("dataSearch.tryAnother") }}</p>
          </div>

          <!-- 初始状态 -->
          <div class="initial-state" v-else>
            <div class="initial-icon">🗂️</div>
            <h3>{{ t("dataSearch.initialHint") }}</h3>
            <p>{{ t("dataSearch.supportDescription") }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";
import { useI18n } from "vue-i18n";
import Opencode from "@/service/shell/opencode";
import { ElMessage } from "element-plus";
import { useSkillApp } from "@/composables/useSkillApp";
import ServerStatus from "@/components/ServerStatus.vue";

const { t } = useI18n();
const APPID = "oDesk-data-search";

// 使用公共技能应用组合式函数
const {
  isConnectting,
  skills,
  sessionId,
  isConnected,
  activeWorkspace,
  resetSkills,
  selectSkill,
  openWorkspace,
} = useSkillApp(APPID, []);

// 响应式数据
const searchQuery = ref("");
const columns = ref([]);
const tableData = ref([]);
const resultMeta = ref({});
const dataError = ref("");
const isSearching = ref(false);
const hasSearched = ref(false);

const buildPrompt = (query) => `
用户有一个数据搜索需求：${query}

请根据需求搜索并收集相关数据，然后将数据以 JSON 格式保存到工作区文件 list.json。

list.json 的格式必须为：
{
  "description": "数据的简要描述",
  "fields": ["列1名称", "列2名称", "列3名称"],
  "rows": [["第1行第1列", "第1行第2列", "第1行第3列"]]
}

要求：
1. fields 数组存放每一列的名称；
2. rows 数组的每个元素是一个数组，顺序与 fields 一一对应；
3. 严格输出上述 JSON 结构，数据量通常提供 5-20 行；
4. 如数据包含数值、日期等，请保持其原始类型（数值不要加引号）；
5. 只把 JSON 写入 list.json，不要做其他事，不要输出额外内容。
`;

// 搜索数据
const searchData = async () => {
  if (!searchQuery.value.trim()) {
    return;
  }
  isSearching.value = true;
  hasSearched.value = true;

  try {
    const searchContent = buildPrompt(searchQuery.value.trim());
    const answer = await Opencode.send_message(searchContent);
    console.log("AI Response:", answer);
    await loadResult();
  } catch (error) {
    console.error("Error generating data:", error);
    ElMessage.error(t("dataSearch.generateFailed") + error.message);
  } finally {
    isSearching.value = false;
  }
};

// 读取 agent 生成的 JSON 数据
const loadResult = async () => {
  dataError.value = "";
  try {
    const content = await Opencode.read_workspace_file_content(
      APPID,
      "list.json",
    );
    const data = JSON.parse(content);
    const fields = data.fields || [];
    const rows = data.rows || [];

    if (!fields.length || !rows.length) {
      dataError.value = t("dataSearch.emptyData");
      return;
    }

    columns.value = fields;
    resultMeta.value = { description: data.description || "" };
    tableData.value = rows.map((row) => {
      const obj = {};
      fields.forEach((field, i) => {
        obj[String(i)] = row[i] ?? "";
      });
      return obj;
    });
  } catch (error) {
    // 初始化时 list.json 可能还不存在，静默忽略；
    // 搜索完成后读取失败则提示用户
    if (hasSearched.value) {
      dataError.value = t("dataSearch.generateFailed") + (error.message || "");
    }
  }
};

// 初始化
onMounted(async () => {
  await activeWorkspace();
  await loadResult();
});

onBeforeUnmount(async () => {});
</script>

<style lang="less" scoped>
.data-search {
  position: relative;
  height: 100%;
  box-sizing: border-box;

  // 搜索Loading遮罩
  .loading-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(8px);

    .loading-card {
      background: white;
      border-radius: 20px;
      padding: 32px 48px;
      text-align: center;
      box-shadow: 0 12px 40px rgba(46, 134, 171, 0.25);
      border: 1px solid rgba(46, 134, 171, 0.2);
      min-width: 320px;
      max-width: 400px;

      .loading-icon {
        font-size: 48px;
        margin-bottom: 16px;
        animation: pulse 1.5s infinite;
      }

      h3 {
        margin: 0 0 8px 0;
        font-size: 20px;
        color: #333;
        font-weight: 700;
      }

      p {
        margin: 0 0 20px 0;
        color: #666;
        font-size: 14px;
      }

      .progress-bar {
        height: 6px;
        background: #e9ecef;
        border-radius: 3px;
        overflow: hidden;

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #2e86ab, #4db8d4);
          animation: shimmer 2s infinite;
        }
      }
    }
  }

  // 内容区域样式
  .content-section {
    flex: 1;
    display: flex;
    max-width: 1200px;
    margin: 0px auto 16px;
    height: calc(100% - 0px);
    box-sizing: border-box;
    padding-top: 50px;

    // 搜索面板
    .search-panel {
      flex: 1;
      box-sizing: border-box;
      background: white;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      min-width: 0;

      .panel-content {
        padding: 20px;
        height: 100%;
        overflow-y: auto;
        display: flex;
        flex-direction: column;

        // 搜索容器样式
        .search-container {
          margin-bottom: 20px;

          .input-group {
            display: flex;
            align-items: center;
            gap: 12px;

            .search-input {
              flex: 1;
              padding: 12px 16px;
              border: 2px solid #a9d6e5;
              border-radius: 12px;
              outline: none;
              font-size: 14px;
              transition: all 0.3s ease;

              &:focus {
                border-color: #2e86aa;
                box-shadow: 0 0 0 3px rgba(46, 134, 171, 0.1);
              }
            }

            .search-btn {
              padding: 12px 20px;
              background: linear-gradient(135deg, #2e86aa, #4db3d4);
              color: white;
              border: none;
              border-radius: 12px;
              cursor: pointer;
              font-size: 14px;
              font-weight: 600;
              transition: all 0.3s ease;
              box-shadow: 0 2px 8px rgba(46, 134, 171, 0.3);
              display: inline-flex;
              align-items: center;
              gap: 6px;
              white-space: nowrap;

              &:hover:not(:disabled) {
                background: linear-gradient(135deg, #4db3d4, #2e86aa);
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(46, 134, 171, 0.4);
              }

              &:disabled {
                opacity: 0.7;
                cursor: not-allowed;
              }
            }
          }
        }

        // 结果区域
        .results-area {
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;

          .results-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
            padding-bottom: 12px;
            border-bottom: 1px dashed #e9ecef;

            .result-title {
              font-size: 15px;
              font-weight: 600;
              color: #2e86aa;
            }

            .result-count {
              font-size: 12px;
              color: #999;
              background: rgba(46, 134, 171, 0.1);
              padding: 3px 10px;
              border-radius: 12px;
            }
          }

          .result-wrapper {
            flex: 1;
            min-height: 0;
            overflow: auto;
            border: 1px solid #e9ecef;
            border-radius: 12px;

            :deep(.el-table) {
              --el-table-border-color: #e9ecef;
              --el-table-header-bg-color: #f5f9fb;
              --el-table-header-text-color: #2e86aa;
              --el-table-row-hover-bg-color: #f0f8fb;

              .el-table__header th {
                font-weight: 600;
              }
            }
          }
        }

        // 空状态和初始状态
        .empty-state,
        .initial-state {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          text-align: center;

          .empty-icon,
          .initial-icon {
            font-size: 64px;
            margin-bottom: 16px;
            opacity: 0.8;
          }

          h3 {
            margin: 0 0 8px 0;
            font-size: 18px;
            color: #2e86aa;
            font-weight: 600;
          }

          p {
            margin: 0;
            font-size: 14px;
            color: #999;
          }

          .error-content {
            margin-top: 12px;
            max-width: 640px;
            max-height: 240px;
            overflow: auto;
            text-align: left;
            font-size: 12px;
            color: #c0392b;
            background: #fdf2f2;
            border: 1px solid #f5c6c6;
            border-radius: 8px;
            padding: 10px 12px;
            white-space: pre-wrap;
            word-break: break-all;
          }
        }
      }
    }
  }

  .loading {
    animation: loading-pulse 1.5s ease-in-out infinite;
  }

  .loading-text {
    font-size: 12px;
    margin-left: 4px;
    color: #666;
  }

  @keyframes loading-pulse {
    0% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.6;
      transform: scale(1.1);
    }
    100% {
      opacity: 1;
      transform: scale(1);
    }
  }

  @keyframes pulse {
    0% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.1);
    }
    100% {
      transform: scale(1);
    }
  }

  @keyframes shimmer {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }

  @media (max-width: 768px) {
    .content-section {
      flex-direction: column;
      padding: 16px;
    }

    .search-panel {
      margin: 0;
      margin-bottom: 16px;
    }
  }
}
</style>
