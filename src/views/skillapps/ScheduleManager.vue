<template>
  <div class="schedule-manager">
    <div class="header-section">
      <div class="header-content">
        <div class="title-section">
          <h1 class="main-title">Schedule Manager</h1>
          <p class="subtitle">智能排班管理系统</p>
        </div>
        <div class="session-info">
          <span class="session-label">会话ID:</span>
          <span class="session-id">{{ sessionId || "未连接" }}</span>
        </div>
      </div>
    </div>

    <div class="main-container">
      <div class="input-section">
        <div class="input-card">
          <div class="input-header">
            <h3>排班需求输入</h3>
            <p>请输入排班需求，系统将为您生成最优排班表</p>
          </div>

          <div class="input-container">
            <div class="textarea-wrapper">
              <textarea
                v-model="question"
                @keyup.enter="handleQuestion"
                placeholder="示例：&#10;员工数量：25&#10;月份：4月&#10;班次：7点班，10点班，14点班，16点班&#10;请生成排班表"
                class="question-input"
                rows="6"
              ></textarea>
            </div>

            <div class="input-actions">
              <button
                @click="handleQuestion"
                :disabled="isLoading"
                class="ask-btn"
              >
                <span v-if="!isLoading">
                  <i class="icon">📊</i>
                  生成排班表
                </span>
                <span v-else>
                  <i class="icon">⏳</i>
                  生成中...
                </span>
              </button>

              <button @click="clearInput" class="clear-btn">
                <i class="icon">🗑️</i>
                清空
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="results-section" v-if="searchResults.length > 0">
        <div class="results-card">
          <div class="results-header">
            <h3>排班结果</h3>
            <div class="results-meta">
              <span class="result-count"
                >{{ searchResults.length }} 个结果</span
              >
              <span class="result-status">已生成</span>
            </div>
          </div>

          <div class="results-content">
            <div class="schedule-grid">
              <div
                v-for="(result, index) in searchResults"
                :key="index"
                class="schedule-item"
              >
                <div class="schedule-header">
                  <h4>{{ result.title || "排班表" }}</h4>
                  <span class="schedule-date">{{
                    result.date || "2024年4月"
                  }}</span>
                </div>

                <div class="schedule-details">
                  <div class="detail-row">
                    <span class="label">员工数量:</span>
                    <span class="value">{{
                      result.employeeCount || "25"
                    }}</span>
                  </div>
                  <div class="detail-row">
                    <span class="label">班次安排:</span>
                    <span class="value">{{
                      result.shifts || "7点班, 10点班, 14点班, 16点班"
                    }}</span>
                  </div>
                  <div class="detail-row">
                    <span class="label">生成时间:</span>
                    <span class="value">{{
                      result.generatedAt || new Date().toLocaleString()
                    }}</span>
                  </div>
                </div>

                <div class="schedule-actions">
                  <button class="action-btn view-btn">
                    <i class="icon">👁️</i>
                    查看详情
                  </button>
                  <button class="action-btn export-btn">
                    <i class="icon">📤</i>
                    导出Excel
                  </button>
                  <button class="action-btn print-btn">
                    <i class="icon">🖨️</i>
                    打印
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="loading-section" v-if="isLoading">
        <div class="loading-card">
          <div class="loading-icon">⏳</div>
          <h3>正在生成排班表...</h3>
          <p>系统正在分析您的需求并生成最优排班方案</p>
          <div class="progress-bar">
            <div class="progress-fill"></div>
          </div>
        </div>
      </div>

      <div
        class="empty-section"
        v-if="!isLoading && searchResults.length === 0 && question.trim()"
      >
        <div class="empty-card">
          <div class="empty-icon">📋</div>
          <h3>暂无排班结果</h3>
          <p>请调整您的排班需求或检查输入格式</p>
          <div class="empty-actions">
            <button @click="showExamples" class="example-btn">
              <i class="icon">💡</i>
              查看示例
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import {
  ref,
  reactive,
  onMounted,
  onActivated,
  onDeactivated,
  onBeforeUnmount,
  computed,
} from "vue";
import Opencode from "@/service/shell/opencode";
import { sleep } from "@/utils/util";
const APPID = "oDesk-schedule-manager";

// 响应式数据
const question = ref(`

现在用户的输入数据为：
员工数量：25；
月份：4月；
班次：7点班，10点班，14点班，16点班
请生成排班表

`);
const isLoading = ref(false);
const searchResults = ref([]);
const downloadQueue = ref([]);
const isDownloading = ref(false);
const musicFolders = ref([]);
const currentPlaying = ref(null);

const sessionId = ref("");

// 方法定义
const handleQuestion = async () => {
  if (!question.value.trim()) return;
  isLoading.value = true;
  searchResults.value = [];

  try {
    const answer = await Opencode.send_message(question.value);
    console.log("AI Response:", answer);

    // 模拟生成排班结果
    const mockResults = [
      {
        title: "4月第一周排班表",
        date: "2024年4月1日 - 4月7日",
        employeeCount: "25",
        shifts: "7点班, 10点班, 14点班, 16点班",
        generatedAt: new Date().toLocaleString(),
      },
      {
        title: "4月第二周排班表",
        date: "2024年4月8日 - 4月14日",
        employeeCount: "25",
        shifts: "7点班, 10点班, 14点班, 16点班",
        generatedAt: new Date().toLocaleString(),
      },
    ];

    // 模拟延迟
    await new Promise((resolve) => setTimeout(resolve, 1500));

    searchResults.value = mockResults;
  } catch (error) {
    console.error("Error generating schedule:", error);
    // 即使出错也显示一些示例数据
    searchResults.value = [
      {
        title: "排班表生成失败",
        date: "请检查输入格式",
        employeeCount: "25",
        shifts: "7点班, 10点班, 14点班, 16点班",
        generatedAt: new Date().toLocaleString(),
      },
    ];
  } finally {
    isLoading.value = false;
  }
};

const clearInput = () => {
  question.value = "";
};

const showExamples = () => {
  question.value = `
员工数量：20
月份：5月
班次：早班(8:00-16:00)，中班(16:00-00:00)，晚班(00:00-08:00)
请生成排班表
  `;
};

const activeWorkspace = async () => {
  console.log("activeWorkspace---");
  try {
    await Opencode.create_workspace(APPID);
    await sleep(1000);
    const result = await Opencode.execute_opencode_serve(APPID);
    await sleep(3000);
    await Opencode.new_session();

    sessionId.value = Opencode.sessionId;
    await Opencode.open_workspace(APPID);
  } catch (error) {
    console.error("Workspace activation failed:", error);
  }
};

// 初始化
onMounted(() => {
  console.log("ScheduleManager mounted");
  activeWorkspace();
});

onBeforeUnmount(() => {
  console.log("ScheduleManager unmounting");
});
</script>

<style lang="less" scoped>
.schedule-manager {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 24px;

  .header-section {
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    border-radius: 20px;
    padding: 24px;
    margin-bottom: 24px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.3);

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 24px;

      @media (max-width: 768px) {
        flex-direction: column;
        align-items: flex-start;
      }

      .title-section {
        flex: 1;

        .main-title {
          margin: 0 0 8px 0;
          font-size: 32px;
          font-weight: 800;
          background: linear-gradient(135deg, #667eea, #764ba2);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          letter-spacing: -1px;
        }

        .subtitle {
          margin: 0;
          font-size: 16px;
          color: #666;
          font-weight: 500;
        }
      }

      .session-info {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        background: #f8f9fa;
        border-radius: 12px;
        border: 1px solid #e9ecef;

        .session-label {
          font-size: 12px;
          font-weight: 600;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .session-id {
          font-family: "Courier New", monospace;
          font-size: 14px;
          font-weight: 700;
          color: #333;
          background: white;
          padding: 6px 12px;
          border-radius: 8px;
          border: 1px solid #e9ecef;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.5);
        }
      }
    }
  }

  .main-container {
    display: grid;
    grid-template-columns: 1fr;
    gap: 24px;

    .input-section {
      .input-card {
        background: white;
        border-radius: 20px;
        padding: 24px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.3);

        .input-header {
          margin-bottom: 20px;

          h3 {
            margin: 0 0 8px 0;
            font-size: 20px;
            color: #333;
            font-weight: 700;
          }

          p {
            margin: 0;
            color: #666;
            font-size: 14px;
          }
        }

        .input-container {
          display: flex;
          flex-direction: column;
          gap: 16px;

          .textarea-wrapper {
            position: relative;

            textarea.question-input {
              width: 100%;
              padding: 16px 20px;
              border: 2px solid #e9ecef;
              border-radius: 16px;
              font-size: 16px;
              font-family: inherit;
              outline: none;
              transition: all 0.3s ease;
              resize: vertical;
              min-height: 120px;
              line-height: 1.5;

              &:focus {
                border-color: #667eea;
                box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
                transform: translateY(-1px);
              }

              &::placeholder {
                color: #999;
                opacity: 1;
              }
            }
          }

          .input-actions {
            display: flex;
            gap: 12px;
            flex-wrap: wrap;

            .ask-btn {
              flex: 1;
              min-width: 200px;
              padding: 14px 24px;
              background: linear-gradient(135deg, #667eea, #764ba2);
              color: white;
              border: none;
              border-radius: 16px;
              font-size: 16px;
              font-weight: 700;
              cursor: pointer;
              transition: all 0.3s ease;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 10px;

              &:hover:not(:disabled) {
                transform: translateY(-2px);
                box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
              }

              &:active:not(:disabled) {
                transform: translateY(0);
              }

              &:disabled {
                background: #ccc;
                cursor: not-allowed;
                transform: none;
                box-shadow: none;
              }

              .icon {
                font-size: 18px;
              }
            }

            .clear-btn {
              padding: 14px 20px;
              background: #f8f9fa;
              color: #666;
              border: 2px solid #e9ecef;
              border-radius: 16px;
              font-size: 16px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.3s ease;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 8px;

              &:hover {
                background: #e9ecef;
                border-color: #dee2e6;
                color: #333;
                transform: translateY(-1px);
              }

              &:active {
                transform: translateY(0);
              }

              .icon {
                font-size: 16px;
              }
            }
          }
        }
      }
    }

    .results-section {
      .results-card {
        background: white;
        border-radius: 20px;
        padding: 24px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.3);

        .results-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 2px solid #f0f0f0;

          h3 {
            margin: 0;
            font-size: 20px;
            color: #333;
            font-weight: 700;
          }

          .results-meta {
            display: flex;
            align-items: center;
            gap: 12px;

            .result-count {
              background: #e3f2fd;
              color: #1976d2;
              padding: 6px 12px;
              border-radius: 20px;
              font-size: 12px;
              font-weight: 700;
              border: 1px solid #bbdefb;
            }

            .result-status {
              background: #e8f5e9;
              color: #2e7d32;
              padding: 6px 12px;
              border-radius: 20px;
              font-size: 12px;
              font-weight: 700;
              border: 1px solid #c8e6c9;
            }
          }
        }

        .results-content {
          .schedule-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 16px;

            .schedule-item {
              background: #f8f9fa;
              border: 1px solid #e9ecef;
              border-radius: 16px;
              padding: 20px;
              transition: all 0.3s ease;
              position: relative;
              overflow: hidden;

              &:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
                border-color: #dee2e6;

                &::before {
                  width: 100%;
                }
              }

              &::before {
                content: "";
                position: absolute;
                top: 0;
                left: 0;
                width: 0%;
                height: 4px;
                background: linear-gradient(135deg, #667eea, #764ba2);
                transition: width 0.3s ease;
              }

              .schedule-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 16px;

                h4 {
                  margin: 0 0 4px 0;
                  font-size: 18px;
                  color: #333;
                  font-weight: 700;
                }

                .schedule-date {
                  background: white;
                  padding: 6px 12px;
                  border-radius: 20px;
                  font-size: 12px;
                  color: #666;
                  border: 1px solid #e9ecef;
                  font-weight: 600;
                }
              }

              .schedule-details {
                .detail-row {
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  padding: 10px 0;
                  border-bottom: 1px solid #e9ecef;

                  &:last-child {
                    border-bottom: none;
                  }

                  .label {
                    font-size: 14px;
                    color: #666;
                    font-weight: 600;
                  }

                  .value {
                    font-size: 14px;
                    color: #333;
                    font-weight: 600;
                    background: white;
                    padding: 6px 12px;
                    border-radius: 8px;
                    border: 1px solid #e9ecef;
                  }
                }
              }

              .schedule-actions {
                display: flex;
                gap: 8px;
                margin-top: 16px;
                flex-wrap: wrap;

                .action-btn {
                  flex: 1;
                  min-width: 120px;
                  padding: 10px 16px;
                  border: none;
                  border-radius: 12px;
                  font-size: 14px;
                  font-weight: 600;
                  cursor: pointer;
                  transition: all 0.3s ease;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  gap: 8px;

                  &.view-btn {
                    background: #e3f2fd;
                    color: #1976d2;
                    border: 1px solid #bbdefb;

                    &:hover {
                      background: #bbdefb;
                      transform: translateY(-1px);
                    }
                  }

                  &.export-btn {
                    background: #fff3e0;
                    color: #f57c00;
                    border: 1px solid #ffcc02;

                    &:hover {
                      background: #ffcc02;
                      color: white;
                      transform: translateY(-1px);
                    }
                  }

                  &.print-btn {
                    background: #f3e5f5;
                    color: #7b1fa2;
                    border: 1px solid #e1bee7;

                    &:hover {
                      background: #e1bee7;
                      transform: translateY(-1px);
                    }
                  }

                  .icon {
                    font-size: 16px;
                  }
                }
              }
            }
          }
        }
      }
    }

    .loading-section {
      .loading-card {
        background: white;
        border-radius: 20px;
        padding: 32px;
        text-align: center;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.3);

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
          margin: 0 0 24px 0;
          color: #666;
          font-size: 14px;
        }

        .progress-bar {
          height: 8px;
          background: #e9ecef;
          border-radius: 4px;
          overflow: hidden;

          .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #667eea, #764ba2);
            width: 0%;
            transition: width 0.5s ease;
            animation: shimmer 2s infinite;
          }
        }
      }
    }

    .empty-section {
      .empty-card {
        background: white;
        border-radius: 20px;
        padding: 32px;
        text-align: center;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.3);

        .empty-icon {
          font-size: 48px;
          margin-bottom: 16px;
          opacity: 0.6;
        }

        h3 {
          margin: 0 0 8px 0;
          font-size: 20px;
          color: #333;
          font-weight: 700;
        }

        p {
          margin: 0 0 24px 0;
          color: #666;
          font-size: 14px;
        }

        .empty-actions {
          .example-btn {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 16px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            display: inline-flex;
            align-items: center;
            gap: 8px;

            &:hover {
              transform: translateY(-2px);
              box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
            }

            .icon {
              font-size: 16px;
            }
          }
        }
      }
    }
  }

  @keyframes pulse {
    0% {
      transform: scale(1);
      opacity: 1;
    }
    50% {
      transform: scale(1.1);
      opacity: 0.8;
    }
    100% {
      transform: scale(1);
      opacity: 1;
    }
  }

  @keyframes shimmer {
    0% {
      background-position: -200px 0;
    }
    100% {
      background-position: 200px 0;
    }
  }

  @media (max-width: 768px) {
    padding: 16px;

    .header-section {
      padding: 16px;

      .header-content {
        .title-section {
          .main-title {
            font-size: 24px;
          }
        }
      }
    }

    .main-container {
      .input-section {
        .input-card {
          padding: 16px;
        }
      }

      .results-section {
        .results-card {
          padding: 16px;
        }
      }
    }
  }
}
</style>
