import { createI18n } from "vue-i18n";

// 导入语言文件
import en from "./locales/en.json";
import zh from "./locales/zh.json";

const i18n = createI18n({
  locale: "zh", // 默认语言
  fallbackLocale: "zh", // 回退语言
  messages: {
    en,
    zh,
  },
  legacy: false, // 使用 Composition API 模式
});

export default i18n;
