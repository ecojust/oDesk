<template>
  <div class="audio-cut">
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

    <div class="main-container">
      <!-- 左侧配置区 -->
      <div class="config-panel">
        <div class="panel-title">{{ t("audioCut.title") }}</div>

        <el-form label-position="top" class="config-form">
          <!-- 开始时间 -->
          <el-form-item :label="t('audioCut.startTime')">
            <el-input-number
              v-model="config.startTime"
              :min="0"
              :max="audioDuration"
              :step="0.1"
              :precision="2"
              style="width: 100%"
              @change="updateClipRange"
            />
          </el-form-item>

          <!-- 结束时间 -->
          <el-form-item :label="t('audioCut.endTime')">
            <el-input-number
              v-model="config.endTime"
              :min="0"
              :max="audioDuration"
              :step="0.1"
              :precision="2"
              style="width: 100%"
              @change="updateClipRange"
            />
          </el-form-item>

          <!-- 淡入淡出效果 -->
          <div class="fade-effect-card">
            <div class="fade-card-header">
              <svg
                class="fade-card-icon"
                viewBox="0 0 24 24"
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M2 10v4" />
                <path d="M5 8v8" />
                <path d="M8 6v12" />
                <path d="M11 4v16" />
                <path d="M14 7v10" />
                <path d="M17 9v6" />
                <path d="M20 11v2" />
              </svg>
              <span class="fade-card-title">{{
                t("audioCut.fadeEffect") || "淡入淡出"
              }}</span>
            </div>

            <!-- 淡入 -->
            <div class="fade-row">
              <div class="fade-row-info">
                <div class="fade-badge fade-in-badge">
                  <svg
                    viewBox="0 0 24 24"
                    width="12"
                    height="12"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M4 16V8a6 6 0 0 1 6-6h6" />
                    <path d="m16 2 3 3-3 3" />
                  </svg>
                </div>
                <span class="fade-name">{{ t("audioCut.fadeIn") }}</span>
                <span class="fade-time">{{ config.fadeIn.toFixed(1) }}s</span>
              </div>
              <el-slider
                v-model="config.fadeIn"
                :max="5"
                :step="0.1"
                :show-tooltip="false"
              />
              <div class="fade-presets">
                <button
                  v-for="preset in [0, 0.5, 1, 2, 3, 5]"
                  :key="preset"
                  type="button"
                  class="preset-btn"
                  :class="{ active: Math.abs(config.fadeIn - preset) < 0.05 }"
                  @click="config.fadeIn = preset"
                >
                  {{ preset }}s
                </button>
              </div>
            </div>

            <div class="fade-row-divider"></div>

            <!-- 淡出 -->
            <div class="fade-row">
              <div class="fade-row-info">
                <div class="fade-badge fade-out-badge">
                  <svg
                    viewBox="0 0 24 24"
                    width="12"
                    height="12"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M4 8v8a6 6 0 0 0 6 6h6" />
                    <path d="m16 22 3-3-3-3" />
                  </svg>
                </div>
                <span class="fade-name">{{ t("audioCut.fadeOut") }}</span>
                <span class="fade-time">{{ config.fadeOut.toFixed(1) }}s</span>
              </div>
              <el-slider
                v-model="config.fadeOut"
                :max="5"
                :step="0.1"
                :show-tooltip="false"
              />
              <div class="fade-presets">
                <button
                  v-for="preset in [0, 0.5, 1, 2, 3, 5]"
                  :key="preset"
                  type="button"
                  class="preset-btn"
                  :class="{ active: Math.abs(config.fadeOut - preset) < 0.05 }"
                  @click="config.fadeOut = preset"
                >
                  {{ preset }}s
                </button>
              </div>
            </div>
          </div>

          <!-- 输出格式 -->
          <el-form-item :label="t('audioCut.outputFormat')">
            <el-radio-group v-model="config.format">
              <el-radio-button label="wav">WAV</el-radio-button>
              <el-radio-button label="mp3">MP3</el-radio-button>
            </el-radio-group>
          </el-form-item>

          <!-- 输出文件名 -->
          <el-form-item :label="t('audioCut.outputName')">
            <el-input
              v-model="config.outputName"
              :placeholder="t('audioCut.outputNamePlaceholder')"
              clearable
            />
          </el-form-item>

          <el-divider />

          <!-- 音频信息 -->
          <div v-if="audioInfo" class="audio-info">
            <div class="info-item">
              <span class="info-label">{{ t("audioCut.duration") }}:</span>
              <span class="info-value">{{ formatTime(audioDuration) }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">{{ t("audioCut.sampleRate") }}:</span>
              <span class="info-value">{{ audioInfo.sampleRate }} Hz</span>
            </div>
            <div class="info-item">
              <span class="info-label">{{ t("audioCut.channels") }}:</span>
              <span class="info-value">{{ audioInfo.numberOfChannels }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">{{ t("audioCut.clipDuration") }}:</span>
              <span class="info-value">{{
                formatTime(config.endTime - config.startTime)
              }}</span>
            </div>
          </div>

          <el-button
            type="primary"
            size="large"
            class="cut-btn"
            :disabled="!audioBuffer || isProcessing"
            :loading="isProcessing"
            @click="processCut"
          >
            <el-icon v-if="!isProcessing"><Scissor /></el-icon>
            {{
              isProcessing ? t("audioCut.processing") : t("audioCut.cutAudio")
            }}
          </el-button>
        </el-form>
      </div>

      <!-- 右侧区域 -->
      <div class="right-area">
        <!-- 上方：文件选择和波形预览 -->
        <div class="file-section">
          <div class="section-header">
            <h3>{{ t("audioCut.selectFile") }}</h3>
            <el-button type="primary" @click="selectFile">
              <el-icon><FolderOpened /></el-icon>
              {{ t("audioCut.chooseMp3") }}
            </el-button>
          </div>

          <input
            ref="fileInput"
            type="file"
            accept="audio/mp3,audio/wav,audio/*"
            style="display: none"
            @change="handleFileChange"
          />

          <!-- 波形显示区域 -->
          <div v-if="audioBuffer" class="waveform-container">
            <canvas
              ref="waveformCanvas"
              class="waveform-canvas"
              @mousedown="onCanvasMouseDown"
              @mousemove="onCanvasMouseMove"
              @mouseup="onCanvasMouseUp"
              @mouseleave="onCanvasMouseUp"
            />
            <div class="time-markers">
              <span class="time-marker start">{{
                formatTime(config.startTime)
              }}</span>
              <span class="time-marker current" v-if="isPlaying">{{
                formatTime(currentTime)
              }}</span>
              <span class="time-marker end">{{
                formatTime(config.endTime)
              }}</span>
            </div>
          </div>

          <!-- 空状态 -->
          <div v-else class="empty-state" @click="selectFile">
            <el-icon :size="48" color="#c0c4cc"><Headset /></el-icon>
            <p>{{ t("audioCut.clickToSelect") }}</p>
            <p class="hint">{{ t("audioCut.supportFormat") }}</p>
          </div>

          <!-- 播放器控制 -->
          <div v-if="audioBuffer" class="player-controls">
            <el-button circle @click="togglePlay">
              <el-icon :size="20">
                <VideoPlay v-if="!isPlaying" />
                <VideoPause v-else />
              </el-icon>
            </el-button>
            <el-button
              type="success"
              size="small"
              :disabled="!isPlaying"
              @click="setCurrentAsStart"
            >
              {{ t("audioCut.setStart") }}
            </el-button>
            <el-button
              type="danger"
              size="small"
              :disabled="!isPlaying"
              @click="setCurrentAsEnd"
            >
              {{ t("audioCut.setEnd") }}
            </el-button>
            <el-slider
              v-model="playbackProgress"
              :max="100"
              class="progress-slider"
              @change="seekTo"
            />
            <span class="time-display">
              {{ formatTime(currentTime) }} / {{ formatTime(audioDuration) }}
            </span>
          </div>
        </div>

        <!-- 下方：结果预览 -->
        <div class="result-section">
          <div class="section-header">
            <h3>{{ t("audioCut.result") }}</h3>
            <el-button
              v-if="resultUrl"
              type="success"
              size="small"
              @click="downloadResult"
            >
              <el-icon><Download /></el-icon>
              {{ t("audioCut.download") }}
            </el-button>
          </div>

          <div v-if="resultUrl" class="result-player">
            <audio :src="resultUrl" controls class="result-audio" />
            <div class="result-info">
              <span>{{ resultFileName }}</span>
              <span class="result-size">{{ resultSize }}</span>
            </div>
          </div>

          <div v-else class="empty-result">
            <el-icon :size="32" color="#c0c4cc"><Scissor /></el-icon>
            <p>{{ t("audioCut.noResult") }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick, computed } from "vue";
import { useI18n } from "vue-i18n";
import { ElMessage } from "element-plus";
import { useSkillApp } from "@/composables/useSkillApp";
import ServerStatus from "@/components/ServerStatus.vue";
import {
  FolderOpened,
  Headset,
  VideoPlay,
  VideoPause,
  Download,
  Scissor,
} from "@element-plus/icons-vue";

const { t } = useI18n();
const APPID = "oDesk-audio-cut";

const {
  isConnectting,
  skills,
  sessionId,
  isConnected,
  activeWorkspace,
  resetSkills,
  selectSkill,
  openWorkspace,
} = useSkillApp(APPID, ["audio-processor"]);

// 配置
const config = ref({
  startTime: 0,
  endTime: 0,
  fadeIn: 0,
  fadeOut: 0,
  format: "wav",
  outputName: "",
});

// 音频相关
const fileInput = ref(null);
const audioBuffer = ref(null);
const audioInfo = ref(null);
const audioContext = ref(null);
const sourceNode = ref(null);
const gainNode = ref(null);
const isPlaying = ref(false);
const currentTime = ref(0);
const playbackProgress = ref(0);
const playbackStartTime = ref(0);
const animationFrameId = ref(null);
const isProcessing = ref(false);

// 结果相关
const resultUrl = ref("");
const resultBlob = ref(null);

// Canvas 相关
const waveformCanvas = ref(null);
const isDragging = ref(""); // 'start', 'end', ''

// 计算属性
const audioDuration = computed(() => {
  return audioBuffer.value ? audioBuffer.value.duration : 0;
});

const resultFileName = computed(() => {
  const name = config.value.outputName || "audio_cut";
  return `${name}.${config.value.format}`;
});

const resultSize = computed(() => {
  if (!resultBlob.value) return "";
  const bytes = resultBlob.value.size;
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
});

// 选择文件
const selectFile = () => {
  fileInput.value?.click();
};

// 处理文件选择
const handleFileChange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  await loadAudioFile(file);
};

// 加载音频文件
const loadAudioFile = async (file) => {
  try {
    // 停止当前播放并重置状态
    stopPlayback();

    if (!audioContext.value) {
      audioContext.value = new (
        window.AudioContext || window.webkitAudioContext
      )();
    }

    const arrayBuffer = await file.arrayBuffer();
    const decoded = await audioContext.value.decodeAudioData(arrayBuffer);

    audioBuffer.value = decoded;
    audioInfo.value = {
      sampleRate: decoded.sampleRate,
      numberOfChannels: decoded.numberOfChannels,
      length: decoded.length,
      duration: decoded.duration,
    };

    config.value.startTime = 0;
    config.value.endTime = decoded.duration;
    config.value.outputName = file.name.replace(/\.[^/.]+$/, "") + "_cut";

    currentTime.value = 0;
    playbackProgress.value = 0;
    resultUrl.value = "";
    resultBlob.value = null;

    saveConfig();

    await nextTick();
    drawWaveform();
    ElMessage.success(t("audioCut.loadSuccess"));
  } catch (error) {
    console.error("加载音频失败:", error);
    ElMessage.error(t("audioCut.loadFailed"));
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
    showmessage && ElMessage.success(t("skillapps.configSaveSuccess"));
  } catch (error) {
    console.error("保存配置失败:", error);
    // ElMessage.error("配置保存失败: " + error.message);
  } finally {
    configDialogVisible.value = false;
  }
};

// 绘制波形
const drawWaveform = () => {
  const canvas = waveformCanvas.value;
  if (!canvas || !audioBuffer.value) return;

  const parent = canvas.parentElement;
  canvas.width = parent.clientWidth;
  canvas.height = 200;

  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const data = audioBuffer.value.getChannelData(0);
  const step = Math.ceil(data.length / width);
  const amp = height / 2;

  ctx.clearRect(0, 0, width, height);

  // 绘制背景
  ctx.fillStyle = "#f5f7fa";
  ctx.fillRect(0, 0, width, height);

  // 绘制波形
  ctx.beginPath();
  ctx.moveTo(0, amp);

  for (let i = 0; i < width; i++) {
    let min = 1.0;
    let max = -1.0;
    for (let j = 0; j < step; j++) {
      const datum = data[i * step + j];
      if (datum < min) min = datum;
      if (datum > max) max = datum;
    }
    ctx.lineTo(i, (1 + min) * amp);
    ctx.lineTo(i, (1 + max) * amp);
  }

  ctx.strokeStyle = "#409eff";
  ctx.lineWidth = 1;
  ctx.stroke();

  // 绘制中线
  ctx.beginPath();
  ctx.moveTo(0, amp);
  ctx.lineTo(width, amp);
  ctx.strokeStyle = "#dcdfe6";
  ctx.lineWidth = 1;
  ctx.stroke();

  // 绘制剪辑区域
  drawClipRegion(ctx, width, height);
};

// 绘制剪辑区域
const drawClipRegion = (ctx, width, height) => {
  if (!audioBuffer.value) return;

  const startX = (config.value.startTime / audioDuration.value) * width;
  const endX = (config.value.endTime / audioDuration.value) * width;

  // 左侧暗色区域
  ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
  ctx.fillRect(0, 0, startX, height);

  // 右侧暗色区域
  ctx.fillRect(endX, 0, width - endX, height);

  // 开始线
  ctx.beginPath();
  ctx.moveTo(startX, 0);
  ctx.lineTo(startX, height);
  ctx.strokeStyle = "#67c23a";
  ctx.lineWidth = 2;
  ctx.stroke();

  // 开始线手柄
  ctx.fillStyle = "#67c23a";
  ctx.fillRect(startX - 4, height / 2 - 8, 8, 16);

  // 结束线
  ctx.beginPath();
  ctx.moveTo(endX, 0);
  ctx.lineTo(endX, height);
  ctx.strokeStyle = "#f56c6c";
  ctx.lineWidth = 2;
  ctx.stroke();

  // 结束线手柄
  ctx.fillStyle = "#f56c6c";
  ctx.fillRect(endX - 4, height / 2 - 8, 8, 16);

  // 选中区域高亮
  ctx.fillStyle = "rgba(64, 158, 255, 0.1)";
  ctx.fillRect(startX, 0, endX - startX, height);
};

// Canvas 鼠标事件
const onCanvasMouseDown = (e) => {
  const canvas = waveformCanvas.value;
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const width = canvas.width;

  const startX = (config.value.startTime / audioDuration.value) * width;
  const endX = (config.value.endTime / audioDuration.value) * width;

  if (Math.abs(x - startX) < 10) {
    isDragging.value = "start";
  } else if (Math.abs(x - endX) < 10) {
    isDragging.value = "end";
  }
};

const onCanvasMouseMove = (e) => {
  if (!isDragging.value) return;

  const canvas = waveformCanvas.value;
  const rect = canvas.getBoundingClientRect();
  const x = Math.max(0, Math.min(e.clientX - rect.left, canvas.width));
  const time = (x / canvas.width) * audioDuration.value;

  if (isDragging.value === "start") {
    config.value.startTime = Math.min(time, config.value.endTime - 0.1);
  } else if (isDragging.value === "end") {
    config.value.endTime = Math.max(time, config.value.startTime + 0.1);
  }

  drawWaveform();
};

const onCanvasMouseUp = () => {
  isDragging.value = "";
};

// 更新剪辑范围
const updateClipRange = () => {
  if (config.value.startTime < 0) config.value.startTime = 0;
  if (config.value.endTime > audioDuration.value)
    config.value.endTime = audioDuration.value;
  if (config.value.startTime >= config.value.endTime) {
    config.value.startTime = config.value.endTime - 0.1;
  }
  drawWaveform();
};

// 播放控制
const togglePlay = () => {
  if (isPlaying.value) {
    stopPlayback();
  } else {
    startPlayback();
  }
};

const startPlayback = () => {
  if (!audioContext.value || !audioBuffer.value) return;

  // 从剪辑区域开始播放
  const startTime = Math.max(currentTime.value, config.value.startTime);
  if (startTime >= config.value.endTime) {
    currentTime.value = config.value.startTime;
  }

  sourceNode.value = audioContext.value.createBufferSource();
  sourceNode.value.buffer = audioBuffer.value;

  gainNode.value = audioContext.value.createGain();

  sourceNode.value.connect(gainNode.value);
  gainNode.value.connect(audioContext.value.destination);

  const offset = currentTime.value || config.value.startTime;
  const duration = config.value.endTime - offset;

  sourceNode.value.start(0, offset, duration);
  playbackStartTime.value = audioContext.value.currentTime - offset;
  isPlaying.value = true;

  sourceNode.value.onended = () => {
    isPlaying.value = false;
    if (currentTime.value >= config.value.endTime - 0.1) {
      currentTime.value = config.value.startTime;
      playbackProgress.value =
        (config.value.startTime / audioDuration.value) * 100;
    }
  };

  updatePlaybackProgress();
};

const stopPlayback = () => {
  if (sourceNode.value) {
    try {
      sourceNode.value.stop();
    } catch (e) {}
    sourceNode.value = null;
  }
  isPlaying.value = false;
  if (animationFrameId.value) {
    cancelAnimationFrame(animationFrameId.value);
    animationFrameId.value = null;
  }
};

const updatePlaybackProgress = () => {
  if (!isPlaying.value || !audioContext.value) return;

  const elapsed = audioContext.value.currentTime - playbackStartTime.value;
  currentTime.value = elapsed;
  playbackProgress.value = (elapsed / audioDuration.value) * 100;

  if (elapsed >= config.value.endTime) {
    stopPlayback();
    currentTime.value = config.value.startTime;
    playbackProgress.value =
      (config.value.startTime / audioDuration.value) * 100;
    return;
  }

  animationFrameId.value = requestAnimationFrame(updatePlaybackProgress);
};

const seekTo = (val) => {
  stopPlayback();
  currentTime.value = (val / 100) * audioDuration.value;
  if (currentTime.value < config.value.startTime) {
    currentTime.value = config.value.startTime;
    playbackProgress.value =
      (config.value.startTime / audioDuration.value) * 100;
  }
  if (currentTime.value > config.value.endTime) {
    currentTime.value = config.value.endTime;
    playbackProgress.value = (config.value.endTime / audioDuration.value) * 100;
  }
};

// 设置当前播放位置为开始时间
const setCurrentAsStart = () => {
  if (!audioBuffer.value) return;
  config.value.startTime = Math.min(
    currentTime.value,
    config.value.endTime - 0.1,
  );
  drawWaveform();
  ElMessage.success(
    t("audioCut.setStartSuccess", { time: formatTime(config.value.startTime) }),
  );
};

// 设置当前播放位置为结束时间
const setCurrentAsEnd = () => {
  if (!audioBuffer.value) return;
  config.value.endTime = Math.max(
    currentTime.value,
    config.value.startTime + 0.1,
  );
  drawWaveform();
  ElMessage.success(
    t("audioCut.setEndSuccess", { time: formatTime(config.value.endTime) }),
  );
};

// 处理剪辑
const processCut = async () => {
  if (!audioBuffer.value) return;

  isProcessing.value = true;
  try {
    const startSample = Math.floor(
      config.value.startTime * audioBuffer.value.sampleRate,
    );
    const endSample = Math.floor(
      config.value.endTime * audioBuffer.value.sampleRate,
    );
    const length = endSample - startSample;

    // 创建新的 AudioBuffer
    const newBuffer = new AudioBuffer({
      numberOfChannels: audioBuffer.value.numberOfChannels,
      length,
      sampleRate: audioBuffer.value.sampleRate,
    });

    // 复制数据
    for (
      let channel = 0;
      channel < audioBuffer.value.numberOfChannels;
      channel++
    ) {
      const oldData = audioBuffer.value.getChannelData(channel);
      const newData = newBuffer.getChannelData(channel);

      for (let i = 0; i < length; i++) {
        let sample = oldData[startSample + i];

        // 应用淡入
        const fadeInSamples =
          config.value.fadeIn * audioBuffer.value.sampleRate;
        if (i < fadeInSamples && config.value.fadeIn > 0) {
          sample *= i / fadeInSamples;
        }

        // 应用淡出
        const fadeOutSamples =
          config.value.fadeOut * audioBuffer.value.sampleRate;
        if (i > length - fadeOutSamples && config.value.fadeOut > 0) {
          sample *= (length - i) / fadeOutSamples;
        }

        newData[i] = sample;
      }
    }

    // 导出为 WAV
    const wavBlob = audioBufferToWav(newBuffer);
    resultBlob.value = wavBlob;
    resultUrl.value = URL.createObjectURL(wavBlob);

    ElMessage.success(t("audioCut.cutSuccess"));
  } catch (error) {
    console.error("剪辑失败:", error);
    ElMessage.error(t("audioCut.cutFailed"));
  } finally {
    isProcessing.value = false;
  }
};

// AudioBuffer 转 WAV
const audioBufferToWav = (buffer) => {
  const numberOfChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  const bytesPerSample = bitDepth / 8;
  const blockAlign = numberOfChannels * bytesPerSample;

  const dataLength = buffer.length * blockAlign;
  const bufferLength = 44 + dataLength;
  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);

  // 写入 WAV header
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numberOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataLength, true);

  // 写入音频数据
  const offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const sample = Math.max(
        -1,
        Math.min(1, buffer.getChannelData(channel)[i]),
      );
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(
        offset + i * blockAlign + channel * bytesPerSample,
        intSample,
        true,
      );
    }
  }

  return new Blob([arrayBuffer], { type: "audio/wav" });
};

const writeString = (view, offset, string) => {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
};

// 下载结果
const downloadResult = () => {
  if (!resultUrl.value) return;

  const link = document.createElement("a");
  link.href = resultUrl.value;
  link.download = resultFileName.value;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  ElMessage.success(t("audioCut.downloadSuccess"));
};

// 格式化时间
const formatTime = (seconds) => {
  if (isNaN(seconds)) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
};

// 窗口大小变化时重绘
const handleResize = () => {
  if (audioBuffer.value) {
    drawWaveform();
  }
};

onMounted(() => {
  window.addEventListener("resize", handleResize);
});

onBeforeUnmount(() => {
  stopPlayback();
  window.removeEventListener("resize", handleResize);
  if (resultUrl.value) {
    URL.revokeObjectURL(resultUrl.value);
  }
  if (audioContext.value) {
    audioContext.value.close();
  }
});
</script>

<style lang="less" scoped>
.audio-cut {
  position: relative;
  height: 100%;
  box-sizing: border-box;

  .main-container {
    display: flex;
    gap: 16px;
    padding: 16px;
    height: calc(100% - 0px);
    box-sizing: border-box;
    padding-top: 50px;
    max-width: 1400px;
    margin: 0 auto;
    width: 100%;
  }

  .config-panel {
    width: 280px;
    flex-shrink: 0;
    background: #fafbfc;
    border-radius: 16px;
    padding: 20px;
    box-sizing: border-box;
    overflow-y: auto;
    border: 1px solid #e8e8e8;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);

    .panel-title {
      font-size: 15px;
      font-weight: 600;
      margin-bottom: 20px;
      color: #1a1a1a;
      text-align: left;
      padding-bottom: 12px;
      border-bottom: 1px solid #e8e8e8;
      display: flex;
      align-items: center;
      gap: 8px;

      &::before {
        content: "";
        display: block;
        width: 4px;
        height: 16px;
        background: #409eff;
        border-radius: 2px;
      }
    }

    .config-form {
      :deep(.el-form-item) {
        margin-bottom: 16px;
      }
      :deep(.el-form-item__label) {
        font-size: 12px;
        line-height: 20px;
        padding-bottom: 4px;
        color: #606266;
        font-weight: 500;
      }
      :deep(.el-input-number) {
        .el-input__inner {
          height: 32px;
          border-radius: 8px;
        }
      }
      :deep(.el-slider) {
        .el-slider__runway.show-input {
          margin-right: 72px;
        }
        .el-slider__input {
          width: 64px;
          .el-input__inner {
            height: 24px;
            border-radius: 6px;
          }
        }
      }
      :deep(.el-radio-button__inner) {
        padding: 6px 16px;
        font-size: 12px;
        border-radius: 8px;
      }
      :deep(.el-input__wrapper) {
        border-radius: 8px;
      }
    }

    // 淡入淡出效果卡片
    .fade-effect-card {
      background: white;
      border-radius: 12px;
      padding: 14px;
      margin-bottom: 16px;
      border: 1px solid #eef0f4;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);

      .fade-card-header {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-bottom: 12px;
        padding-bottom: 10px;
        border-bottom: 1px solid #f0f2f5;

        .fade-card-icon {
          color: #8c9eff;
        }

        .fade-card-title {
          font-size: 12px;
          font-weight: 600;
          color: #303133;
        }
      }

      .fade-row {
        .fade-row-info {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 6px;

          .fade-badge {
            width: 22px;
            height: 22px;
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;

            &.fade-in-badge {
              background: #e8f5e9;
              color: #4caf50;
            }

            &.fade-out-badge {
              background: #ffebee;
              color: #f44336;
            }
          }

          .fade-name {
            font-size: 12px;
            color: #606266;
            font-weight: 500;
            flex: 1;
          }

          .fade-time {
            font-size: 12px;
            color: #303133;
            font-weight: 600;
            font-family: "SF Mono", Monaco, monospace;
            background: #f5f7fa;
            padding: 2px 8px;
            border-radius: 6px;
          }
        }

        :deep(.el-slider) {
          margin: 4px 0 8px;

          .el-slider__runway {
            height: 4px;
            border-radius: 2px;
          }

          .el-slider__bar {
            border-radius: 2px;
          }

          .el-slider__button-wrapper {
            .el-slider__button {
              width: 12px;
              height: 12px;
              border-width: 2px;
            }
          }
        }

        .fade-presets {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;

          .preset-btn {
            border: none;
            background: #f5f7fa;
            color: #909399;
            font-size: 11px;
            padding: 3px 8px;
            border-radius: 5px;
            cursor: pointer;
            transition: all 0.2s ease;
            font-family: "SF Mono", Monaco, monospace;

            &:hover {
              background: #e4e7ed;
              color: #606266;
            }

            &.active {
              background: #409eff;
              color: white;
              font-weight: 500;
            }
          }
        }
      }

      .fade-row-divider {
        height: 1px;
        background: #f0f2f5;
        margin: 12px 0;
      }
    }

    .audio-info {
      margin-bottom: 16px;
      padding: 12px;
      background: white;
      border-radius: 10px;
      border: 1px solid #eef0f4;

      .info-item {
        display: flex;
        justify-content: space-between;
        margin-bottom: 6px;
        font-size: 12px;

        &:last-child {
          margin-bottom: 0;
        }

        .info-label {
          color: #909399;
        }

        .info-value {
          color: #303133;
          font-weight: 600;
          font-family: "SF Mono", Monaco, monospace;
        }
      }
    }

    .cut-btn {
      width: 100%;
      margin-top: 8px;
      height: 40px;
      border-radius: 10px;
      font-weight: 500;
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: all 0.2s ease;

      &:not(:disabled):hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
      }

      .el-icon {
        font-size: 15px;
      }
    }
  }

  .right-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-height: 0;

    .file-section,
    .result-section {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-sizing: border-box;
    }

    .file-section {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 0;

      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;

        h3 {
          margin: 0;
          font-size: 16px;
          color: #303133;
        }
      }

      .waveform-container {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-height: 0;

        .waveform-canvas {
          width: 100%;
          height: 200px;
          border-radius: 8px;
          cursor: pointer;
          border: 1px solid #e4e7ed;
        }

        .time-markers {
          display: flex;
          justify-content: space-between;
          margin-top: 8px;
          font-size: 12px;
          color: #606266;

          .time-marker {
            &.start {
              color: #67c23a;
              font-weight: 500;
            }

            &.end {
              color: #f56c6c;
              font-weight: 500;
            }

            &.current {
              color: #409eff;
              font-weight: 600;
            }
          }
        }
      }

      .empty-state {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        border: 2px dashed #dcdfe6;
        border-radius: 8px;
        transition: all 0.3s;

        &:hover {
          border-color: #409eff;
          background: #f5f7fa;
        }

        p {
          margin: 8px 0 0;
          color: #606266;
          font-size: 14px;
        }

        .hint {
          font-size: 12px;
          color: #909399;
          margin-top: 4px;
        }
      }

      .player-controls {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px solid #ebeef5;

        .progress-slider {
          flex: 1;
        }

        .time-display {
          font-size: 13px;
          color: #606266;
          white-space: nowrap;
          font-variant-numeric: tabular-nums;
        }
      }
    }

    .result-section {
      flex-shrink: 0;
      min-height: 120px;

      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;

        h3 {
          margin: 0;
          font-size: 16px;
          color: #303133;
        }
      }

      .result-player {
        .result-audio {
          width: 100%;
          height: 40px;
          margin-bottom: 8px;
        }

        .result-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
          color: #606266;

          .result-size {
            color: #909399;
          }
        }
      }

      .empty-result {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 16px 0;

        p {
          margin: 8px 0 0;
          color: #909399;
          font-size: 13px;
        }
      }
    }
  }
}
</style>
