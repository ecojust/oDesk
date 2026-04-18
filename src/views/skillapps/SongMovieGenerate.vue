<template>
  <div class="Song-Movie-Generate">
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

    <!-- 中间内容区域 -->
    <div class="content-section">
      <!-- 左侧配置面板 -->
      <div class="config-panel">
        <div class="panel-title">视频配置</div>

        <!-- 歌曲名称 -->
        <div class="form-item">
          <label class="form-label">歌曲名称</label>
          <input
            type="text"
            v-model="config.name"
            class="form-input"
            placeholder="请输入歌曲名称"
            @change="saveConfig"
          />
        </div>

        <!-- MP3文件选择 -->
        <div class="form-item">
          <label class="form-label">选择MP3文件</label>
          <el-select
            v-model="config.music_file"
            class="form-select"
            placeholder="请选择音频文件"
            @change="saveConfig"
            clearable
          >
            <el-option
              v-for="item in mp3list"
              :key="item.path"
              :label="item.title"
              :value="item.title"
            />
          </el-select>
        </div>

        <!-- 时间偏移 -->
        <div class="form-item">
          <label class="form-label">歌词偏移 (秒)</label>
          <input
            type="number"
            v-model.number="config.offset"
            step="0.1"
            class="form-input"
            placeholder="0.0"
            @change="saveConfig"
          />
        </div>

        <!-- 歌词编辑区域 -->
        <div class="form-item lyric-section">
          <label class="form-label">歌词编辑</label>
          <textarea
            v-model="lyric"
            class="lyric-editor"
            placeholder="请输入歌词内容，每行一句&#10;支持带时间轴格式：[00:00.00] 歌词内容"
            @change="saveLyric"
            rows="12"
          ></textarea>
        </div>

        <!-- 操作按钮 -->
        <div class="action-group">
          <button class="primary-btn" @click="generateVideo">生成视频</button>
        </div>
      </div>

      <!-- 右侧预览区域 -->
      <div class="preview-panel">
        <div class="panel-title">视频预览</div>

        <!-- 已生成视频列表 -->
        <div class="video-list-section" v-if="mp4list.length > 0">
          <div class="list-title">已生成视频 ({{ mp4list.length }})</div>
          <div class="video-list">
            <div class="video-item" v-for="item in mp4list" :key="item.path">
              <div class="video-icon" @click="playVideo(item)">🎬</div>
              <div class="video-info" @click="playVideo(item)">
                <div class="video-name">{{ item.title }}</div>
                <div class="video-size">
                  {{ new Date(item.time).toLocaleString() }}
                </div>
              </div>
              <button
                class="download-btn"
                @click.stop="downloadVideo(item)"
                title="下载视频"
              >
                ⬇️ 下载
              </button>
            </div>
          </div>
        </div>

        <div class="preview-area" v-else>
          <div class="preview-placeholder">
            <div class="preview-icon">🎵</div>
            <div class="preview-text">视频预览区域</div>
            <div class="preview-desc">配置完成后点击预览查看效果</div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 进度显示弹窗 -->
  <el-dialog
    v-model="showProgressDialog"
    title="正在生成视频"
    width="600px"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :destroy-on-close="false"
    center
  >
    <div class="progress-container">
      <div class="progress-steps">
        <div
          v-for="(step, index) in [...(config.steps || [])].reverse()"
          :key="index"
          class="step-item"
        >
          <div class="step-icon">✅</div>
          <div class="step-content">
            <div class="step-name">{{ step.step }}</div>
            <div class="step-detail">
              条目: {{ step.entries }} | 开始时间: {{ step.first_start }}s |
              总时长: {{ step.music_dur }}s
            </div>
          </div>
        </div>
      </div>
      <div
        class="progress-loading"
        v-if="!config.steps || config.steps.length === 0"
      >
        <div class="loading-text">正在初始化，请稍候...</div>
      </div>
    </div>
  </el-dialog>

  <!-- 视频播放弹窗 -->
  <el-dialog
    v-model="showVideoDialog"
    :title="currentVideo?.title || '视频播放'"
    width="80%"
    :close-on-click-modal="false"
    destroy-on-close
    center
  >
    <div class="video-player-container">
      <video
        ref="videoPlayer"
        controls
        autoplay
        :src="currentVideoPath"
        class="video-player"
        preload="metadata"
      >
        您的浏览器不支持视频播放
      </video>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, onMounted, nextTick, onBeforeUnmount } from "vue";
import { useI18n } from "vue-i18n";
import Opencode, { songMovieGeneratorconfig } from "@/service/shell/opencode";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { ElMessage } from "element-plus";
import { useSkillApp } from "@/composables/useSkillApp";
import ServerStatus from "@/components/ServerStatus.vue";
const { t } = useI18n();

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
} = useSkillApp(APPID, ["song-movie-generater"]);
const APPID = "oDesk-song-movie-generater";

const lyric = ref("");
const mp3list = ref([]);
const mp4list = ref([]);
const config = ref({
  name: "",
  // lyric_file: "lyric.txt",
  music_file: "",
  offset: 0.0,
  thumb: "thumb2.png",
});

const isGenerating = ref(false);
const showVideoDialog = ref(false);
const showProgressDialog = ref(false);
const currentVideo = ref(null);
const currentVideoPath = ref("");
const videoPlayer = ref(null);
let progressInterval = null;

const readConfig = async () => {
  try {
    const res = await Opencode.read_workspace_file_content(
      APPID,
      "config.json",
    );
    config.value = JSON.parse(res);
    config.value.name = config.value.name || "";
  } catch (error) {
    config.value = songMovieGeneratorconfig;
    await Opencode.write_workspace_file_content(
      APPID,
      "config.json",
      JSON.stringify(songMovieGeneratorconfig),
    );
    console.log("config", error);
  }
};

const saveConfig = async (showmessage = true) => {
  console.log("config.value", config.value);
  try {
    await Opencode.write_workspace_file_content(
      APPID,
      "config.json",
      JSON.stringify(config.value, null, 2),
    );
    showmessage && ElMessage.success("配置保存成功");
  } catch (error) {
    console.error("保存配置失败:", error);
    ElMessage.error("配置保存失败");
  }
};

const readlyric = async () => {
  try {
    const res = await Opencode.read_workspace_file_content(APPID, "lyric.txt");
    lyric.value = res;
  } catch (error) {
    lyric.value = "";
    await Opencode.write_workspace_file_content(APPID, "lyric.txt", "");
    console.log("lyric", error);
  }
};

const getmp3list = async () => {
  try {
    const list = await Opencode.scan_worksapce_file(APPID, {
      path: "",
      postfix: "mp3",
    });
    mp3list.value = list;
    console.log("mp3list", mp3list.value);
  } catch (error) {
    console.error("获取mp3list失败:", error);
  }
};

const getmp4list = async () => {
  try {
    const list = await Opencode.scan_worksapce_file(APPID, {
      path: "list/no_pip",
      postfix: "mp4",
    });
    mp4list.value = list;
    console.log("getmp4list", list);
  } catch (error) {
    console.error("获取mp4 list失败:", error);
  }
};

// 保存歌词
const saveLyric = async () => {
  try {
    await Opencode.write_workspace_file_content(
      APPID,
      "lyric.txt",
      lyric.value,
    );
    ElMessage.success("歌词保存成功");
  } catch (error) {
    ElMessage.error("保存失败");
  }
};

// 清空歌词
const clearLyric = () => {
  lyric.value = "";
  saveLyric();
};

// 生成视频
const generateVideo = async () => {
  if (!config.value.name || !config.value.music_file) {
    ElMessage.warning("请填写歌曲名称并选择音频文件");
    return;
  }
  isGenerating.value = true;
  showProgressDialog.value = true;

  // 清空之前的步骤
  config.value.steps = [];

  // 启动定时器轮询更新进度
  progressInterval = setInterval(async () => {
    try {
      await readConfig();
    } catch (e) {
      console.log("读取进度失败", e);
    }
  }, 1000);

  try {
    console.log("Starting video generation...");
    const answer = await Opencode.send_message(
      "请使用song-movie-generater这个skill生成歌曲视频",
    );
    getmp4list();

    console.log("AI Response:", answer);
    ElMessage.success("视频生成完成");
  } catch (error) {
    console.error("生成失败:", error);
    ElMessage.error(t("audioBookCreator.generateFailed"));
  } finally {
    isGenerating.value = false;
    showProgressDialog.value = false;

    // 清理定时器
    if (progressInterval) {
      clearInterval(progressInterval);
      progressInterval = null;
    }
  }
};

// 播放已生成视频
const playVideo = (item) => {
  currentVideo.value = item;
  // 构建视频文件路径，根据项目实际路径调整
  currentVideoPath.value = item.url;
  showVideoDialog.value = true;

  nextTick(() => {
    if (videoPlayer.value) {
      videoPlayer.value.play().catch((err) => {
        console.log("自动播放被阻止，需要用户手动播放", err);
      });
    }
  });
};

// 下载视频
const downloadVideo = async (item) => {
  // // 创建a标签实现下载
  // const link = document.createElement("a");
  // link.href = item.url;
  // link.download = item.title;
  // link.target = "_blank";
  // document.body.appendChild(link);
  // link.click();
  // document.body.removeChild(link);
  // ElMessage.success(`正在下载: ${item.title}`);

  if (item.path) {
    await Opencode.export_workspace_file_with_alias(APPID, {
      filePath: item.path,
      alias: item.title,
    });
    ElMessage.success(t("audioBookCreator.downloadSuccess"));

    // const link = document.createElement("a");
    // link.href = videoUrl.value;
    // link.download = `有声书-${config.value.title || "生成结果"}.mp4`;
    // document.body.appendChild(link);
    // link.click();
    // document.body.removeChild(link);
    // ElMessage.success("视频开始下载");
  }
};

// 初始化
onMounted(async () => {
  await activeWorkspace();
  readConfig();
  readlyric();
  getmp3list();
  getmp4list();
});

onBeforeUnmount(async () => {});
</script>

<style lang="less" scoped>
.Song-Movie-Generate {
  position: relative;
  height: 100%;
  box-sizing: border-box;
  padding: 0;
  background: #f5f7fa;

  // 内容区域样式
  .content-section {
    flex: 1;
    display: flex;
    gap: 16px;
    max-width: 1400px;
    margin: 0px auto 16px;
    height: calc(100% - 0px);
    box-sizing: border-box;
    padding: 60px 16px 16px;
  }

  // 通用面板样式
  .config-panel,
  .preview-panel {
    background: white;
    border-radius: 12px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
    padding: 24px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
  }

  .config-panel {
    width: 420px;
    flex-shrink: 0;
    overflow-y: auto;
  }

  .preview-panel {
    flex: 1;
  }

  .panel-title {
    font-size: 18px;
    font-weight: 600;
    color: #303133;
    margin-bottom: 24px;
    padding-bottom: 12px;
    border-bottom: 1px solid #ebeef5;
  }

  .form-item {
    margin-bottom: 20px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .form-label {
    font-size: 14px;
    font-weight: 500;
    color: #606266;
  }

  .form-input {
    height: 42px;
    padding: 0 14px;
    border: 1px solid #dcdfe6;
    border-radius: 8px;
    font-size: 14px;
    transition: all 0.2s;

    &:focus {
      outline: none;
      border-color: #409eff;
      box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
    }
  }

  .form-select {
    width: 100%;

    :deep(.el-select__wrapper) {
      height: 42px;
      border-radius: 8px;
    }
  }

  .file-selector {
    display: flex;
    gap: 8px;
  }

  .file-input {
    flex: 1;
  }

  .select-btn {
    height: 42px;
    padding: 0 16px;
    background: #409eff;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s;
    white-space: nowrap;

    &:hover {
      background: #66b1ff;
    }
  }

  .lyric-section {
    flex: 1;
    min-height: 200px;
    margin-bottom: 16px;
  }

  .lyric-editor {
    flex: 1;
    min-height: 200px;
    padding: 12px 14px;
    border: 1px solid #dcdfe6;
    border-radius: 8px;
    font-size: 13px;
    line-height: 1.6;
    resize: none;
    font-family: "Monaco", "Menlo", monospace;
    transition: all 0.2s;

    &:focus {
      outline: none;
      border-color: #409eff;
      box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
    }
  }

  .lyric-actions {
    display: flex;
    gap: 8px;
    margin-top: 8px;
  }

  .action-btn {
    height: 32px;
    padding: 0 12px;
    background: #e6f7ff;
    color: #409eff;
    border: 1px solid #91d5ff;
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
    transition: all 0.2s;

    &:hover {
      background: #409eff;
      color: white;
    }

    &.secondary {
      background: #f5f7fa;
      color: #909399;
      border-color: #dcdfe6;

      &:hover {
        background: #909399;
        color: white;
      }
    }
  }

  .action-group {
    display: flex;
    gap: 12px;
    margin-top: 8px;
  }

  .primary-btn,
  .secondary-btn {
    flex: 1;
    height: 44px;
    border-radius: 8px;
    font-size: 15px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
  }

  .primary-btn {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;

    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }
  }

  .secondary-btn {
    background: #f5f7fa;
    color: #606266;
    border: 1px solid #dcdfe6;

    &:hover {
      background: #ebeef5;
    }
  }

  .preview-area {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f5f7fa;
    border-radius: 8px;
    min-height: 300px;
  }

  .preview-placeholder {
    text-align: center;
    color: #909399;

    .preview-icon {
      font-size: 64px;
      margin-bottom: 16px;
    }

    .preview-text {
      font-size: 18px;
      font-weight: 500;
      margin-bottom: 8px;
    }

    .preview-desc {
      font-size: 14px;
      color: #c0c4cc;
    }
  }

  // 视频列表样式
  .video-list-section {
    margin-bottom: 16px;

    .list-title {
      font-size: 14px;
      font-weight: 600;
      color: #303133;
      margin-bottom: 12px;
    }

    .video-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-height: 320px;
      overflow-y: auto;
      padding-right: 4px;
    }

    .video-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background: #f5f7fa;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;

      &:hover {
        background: #ecf5ff;
        transform: translateY(-1px);
      }

      .video-icon {
        font-size: 24px;
        cursor: pointer;
      }

      .video-info {
        flex: 1;
        cursor: pointer;

        .video-name {
          font-size: 14px;
          font-weight: 500;
          color: #303133;
          margin-bottom: 2px;
        }

        .video-size {
          font-size: 12px;
          color: #909399;
        }
      }

      .download-btn {
        padding: 6px 12px;
        background: #409eff;
        color: white;
        border: none;
        border-radius: 6px;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s;
        flex-shrink: 0;

        &:hover {
          background: #66b1ff;
        }
      }
    }
  }
}

/* 视频播放器样式 */
.video-player-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 10px 0;
}

.video-player {
  max-width: 100%;
  max-height: 70vh;
  border-radius: 8px;
  background: #000;
}

/* 进度对话框样式 */
.progress-container {
  .progress-steps {
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-height: 400px;
    overflow-y: auto;
    padding-right: 4px;
  }

  .step-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 12px;
    background: #f5f7fa;
    border-radius: 8px;
  }

  .step-icon {
    font-size: 20px;
    flex-shrink: 0;
  }

  .step-content {
    flex: 1;

    .step-name {
      font-size: 14px;
      font-weight: 500;
      color: #303133;
      margin-bottom: 4px;
    }

    .step-detail {
      font-size: 12px;
      color: #909399;
    }
  }

  .progress-loading {
    text-align: center;
    padding: 40px 0;

    .loading-text {
      font-size: 14px;
      color: #909399;
    }
  }
}
</style>
