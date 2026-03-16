export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * 获取文件名（跨平台兼容）
 * @param filePath 文件路径
 * @returns 文件名
 */
export const getFileName = (filePath: string): string => {
  if (!filePath) return "";

  // 使用正则表达式匹配路径分隔符（支持 / 和 \）
  const pathSeparator = /[\/\\]/;
  const parts = filePath.split(pathSeparator);
  return parts[parts.length - 1] || "";
};
