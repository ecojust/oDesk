<template>
  <div class="music-download"></div>
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
const APPID = "oDesk-music-download";

// 响应式数据
const question = ref("");
const isLoading = ref(false);
const searchResults = ref([]);
const downloadQueue = ref([]);
const isDownloading = ref(false);
const musicFolders = ref([]);
const currentPlaying = ref(null);

const sessionId = ref("");
const activeWorkspace = async () => {
  console.log("activeWorkspace---");
  await Opencode.create_workspace(APPID);
  await sleep(1000);
  const result = await Opencode.execute_opencode_serve(APPID);
  await sleep(3000);
  await Opencode.new_session();

  sessionId.value = Opencode.sessionId;
  await Opencode.open_workspace(APPID);
};

// 方法定义
const handleQuestion = async () => {
  if (!question.value.trim()) return;
  isLoading.value = true;
  const answer = await Opencode.send_message(question.value);
  console.log(answer);
  // searchResults.value = [];

  // // 模拟搜索延迟
  // await new Promise((resolve) => setTimeout(resolve, 1000));

  // // 简单的搜索逻辑
  // const query = question.value.toLowerCase();
  // const results = mockTracks.filter(
  //   (track) =>
  //     track.title.toLowerCase().includes(query) ||
  //     track.artist.toLowerCase().includes(query),
  // );

  // searchResults.value = results.length > 0 ? results : mockTracks.slice(0, 5);
  isLoading.value = false;
};

// 初始化音乐文件夹
onMounted(() => {
  console.log("onMounted");
  activeWorkspace();
});

onBeforeUnmount(() => {
  console.log("onBeforeUnmount");
  // 组件停用时的逻辑
});
</script>

<style lang="less" scoped>
.music-download {
  padding: 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  color: #333;

  .session-info {
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(10px);
    border-radius: 12px;
    padding: 12px 16px;
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    gap: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.3);

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
      background: #f8f9fa;
      padding: 6px 12px;
      border-radius: 8px;
      border: 1px solid #e9ecef;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.5);
    }
  }

  .question-area {
    background: white;
    border-radius: 16px;
    padding: 24px;
    margin-bottom: 24px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);

    .question-header {
      margin-bottom: 16px;

      h2 {
        margin: 0 0 8px 0;
        color: #333;
        font-size: 24px;
      }

      p {
        margin: 0;
        color: #666;
        font-size: 14px;
      }
    }

    .input-container {
      display: flex;
      gap: 12px;
      margin-bottom: 16px;

      .question-input {
        flex: 1;
        padding: 12px 16px;
        border: 2px solid #e9ecef;
        border-radius: 12px;
        font-size: 16px;
        outline: none;
        transition: border-color 0.2s ease;

        &:focus {
          border-color: #667eea;
        }

        &::placeholder {
          color: #999;
        }
      }

      .ask-btn {
        padding: 12px 24px;
        background: #667eea;
        color: white;
        border: none;
        border-radius: 12px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        min-width: 120px;

        &:hover:not(:disabled) {
          background: #5a6fd8;
          transform: translateY(-1px);
        }

        &:active:not(:disabled) {
          transform: translateY(0);
        }

        &:disabled {
          background: #ccc;
          cursor: not-allowed;
          transform: none;
        }
      }
    }

    .results-preview {
      background: #f8f9fa;
      border-radius: 12px;
      padding: 16px;
      border: 1px solid #e9ecef;

      h3 {
        margin: 0 0 12px 0;
        font-size: 16px;
        color: #333;
      }

      .preview-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .preview-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 12px;
        background: white;
        border-radius: 8px;
        border: 1px solid #e9ecef;

        .track-info {
          display: flex;
          flex-direction: column;
          gap: 4px;

          .track-title {
            font-weight: 600;
            font-size: 14px;
          }

          .track-artist {
            font-size: 12px;
            color: #666;
          }
        }

        .add-btn {
          padding: 6px 12px;
          background: #28a745;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 12px;
          cursor: pointer;
          transition: background 0.2s ease;

          &:hover {
            background: #218838;
          }
        }
      }

      .more-count {
        padding: 8px 12px;
        color: #666;
        font-size: 12px;
        font-style: italic;
      }
    }
  }

  .main-content {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;

    @media (max-width: 768px) {
      grid-template-columns: 1fr;
    }
  }

  .player-section,
  .folder-section {
    background: white;
    border-radius: 16px;
    padding: 20px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    min-height: 400px;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 2px solid #f0f0f0;

    h3 {
      margin: 0;
      color: #333;
      font-size: 18px;
    }

    .controls,
    .folder-controls {
      display: flex;
      gap: 8px;

      button {
        padding: 8px 16px;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s ease;

        &.download-all-btn {
          background: #28a745;
          color: white;

          &:hover:not(:disabled) {
            background: #218838;
          }

          &:disabled {
            background: #ccc;
            cursor: not-allowed;
          }
        }

        &.clear-btn,
        &.refresh-btn,
        &.open-folder-btn {
          background: #6c757d;
          color: white;

          &:hover {
            background: #5a6268;
          }
        }
      }
    }
  }

  .queue-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-height: 400px;
    overflow-y: auto;

    .queue-item {
      background: #f8f9fa;
      border: 1px solid #e9ecef;
      border-radius: 12px;
      padding: 12px;

      &.downloading {
        border-color: #ffc107;
        background: #fff8e1;
      }

      &.completed {
        border-color: #28a745;
        background: #f0fff0;
      }

      .track-details {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;

        .track-main {
          display: flex;
          align-items: center;
          gap: 12px;

          .track-number {
            background: #e9ecef;
            color: #666;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: 600;
          }

          .track-info {
            display: flex;
            flex-direction: column;
            gap: 4px;

            .track-title {
              font-weight: 600;
              font-size: 14px;
            }

            .track-artist {
              font-size: 12px;
              color: #666;
            }
          }
        }

        .track-actions {
          display: flex;
          align-items: center;
          gap: 8px;

          .remove-btn,
          .download-btn {
            padding: 6px 12px;
            border: none;
            border-radius: 6px;
            font-size: 12px;
            cursor: pointer;

            &.remove-btn {
              background: #dc3545;
              color: white;

              &:hover {
                background: #c82333;
              }
            }

            &.download-btn {
              background: #007bff;
              color: white;

              &:hover {
                background: #0056b3;
              }
            }
          }

          .status-text {
            font-size: 12px;
            font-weight: 600;

            &.completed {
              color: #28a745;
            }
          }
        }
      }

      .progress-bar {
        height: 4px;
        background: #e9ecef;
        border-radius: 2px;
        overflow: hidden;

        .progress-fill {
          height: 100%;
          background: #007bff;
          width: 0%;
          transition: width 0.3s ease;
        }
      }
    }

    .empty-queue {
      text-align: center;
      color: #666;
      padding: 40px 20px;

      p {
        margin: 0 0 8px 0;
        font-size: 16px;

        &.hint {
          font-size: 14px;
          color: #999;
        }
      }
    }
  }

  .folder-tree {
    .tree-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 8px;
      margin-bottom: 12px;

      .folder-icon {
        font-size: 18px;
      }

      .folder-name {
        font-weight: 600;
        font-size: 16px;
      }
    }

    .tree-content {
      .tree-item {
        margin-bottom: 8px;

        &.expanded .tree-node {
          background: #e9ecef;
        }

        .tree-node {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px;
          border-radius: 8px;
          cursor: pointer;
          transition: background-color 0.2s ease;
          margin-bottom: 4px;

          &:hover {
            background: #f0f0f0;
          }

          .folder-icon {
            font-size: 16px;
          }

          .folder-name {
            flex: 1;
            font-weight: 600;
            font-size: 14px;
          }

          .file-count {
            font-size: 12px;
            color: #666;
          }
        }

        .tree-children {
          margin-left: 24px;
          border-left: 2px solid #e9ecef;
          padding-left: 16px;

          .file-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 8px;
            border-radius: 6px;
            margin-bottom: 4px;
            transition: background-color 0.2s ease;

            &:hover {
              background: #f8f9fa;
            }

            .file-icon {
              font-size: 14px;
              margin-right: 8px;
            }

            .file-name {
              flex: 1;
              font-size: 14px;
            }

            .file-size {
              font-size: 12px;
              color: #666;
              margin: 0 12px;
            }

            .file-actions {
              display: flex;
              gap: 8px;

              button {
                padding: 4px 8px;
                border: none;
                border-radius: 4px;
                font-size: 12px;
                cursor: pointer;

                &.play-btn {
                  background: #28a745;
                  color: white;
                }

                &.delete-btn {
                  background: #dc3545;
                  color: white;
                }
              }
            }
          }
        }
      }
    }
  }

  .player-controls {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: rgba(255, 255, 255, 0.95);
    border-top: 1px solid #e9ecef;
    padding: 12px 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    backdrop-filter: blur(10px);

    .current-track {
      display: flex;
      flex-direction: column;
      gap: 4px;

      .current-title {
        font-weight: 600;
        font-size: 14px;
      }

      .current-artist {
        font-size: 12px;
        color: #666;
      }
    }

    .player-buttons {
      button {
        padding: 8px 16px;
        background: #dc3545;
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        cursor: pointer;

        &:hover {
          background: #c82333;
        }
      }
    }
  }
}
</style>
