import { invoke } from "@tauri-apps/api/core";

export const MODEL_SETTINGS_STORAGE_KEY = "model-settings";

export interface ModelSettings {
  providerID: string;
  modelID: string;
  apiKey: string;
}

export interface ModelOption {
  providerID: string;
  modelID: string;
  source: "favorite" | "recent";
}

type OpencodeAuth = Record<string, { type?: string; key?: string }>;
type OpencodeModel = {
  recent?: Array<Partial<Pick<ModelOption, "providerID" | "modelID">>>;
  favorite?: Array<Partial<Pick<ModelOption, "providerID" | "modelID">>>;
};

export const DEFAULT_MODEL_SETTINGS: ModelSettings = {
  providerID: "opencode",
  modelID: "big-pickle",
  apiKey: "",
};

export const loadModelSettings = (): ModelSettings => {
  try {
    const savedSettings = localStorage.getItem(MODEL_SETTINGS_STORAGE_KEY);
    if (!savedSettings) {
      return { ...DEFAULT_MODEL_SETTINGS };
    }

    const parsedSettings = JSON.parse(savedSettings) as Partial<ModelSettings>;

    return {
      providerID:
        parsedSettings.providerID || DEFAULT_MODEL_SETTINGS.providerID,
      modelID: parsedSettings.modelID || DEFAULT_MODEL_SETTINGS.modelID,
      apiKey: "",
    };
  } catch (e) {
    console.error("Failed to load model settings:", e);
    return { ...DEFAULT_MODEL_SETTINGS };
  }
};

export const loadOpencodeAuth = async (): Promise<OpencodeAuth> => {
  const authContent = await invoke<string>("read_opencode_auth");
  return JSON.parse(authContent || "{}") as OpencodeAuth;
};

const toModelOptions = (
  models: OpencodeModel,
  source: "favorite" | "recent",
) => {
  return (models[source] || [])
    .filter((model) => model.providerID && model.modelID)
    .map((model) => ({
      providerID: model.providerID as string,
      modelID: model.modelID as string,
      source,
    }));
};

export const getModelOptionKey = (
  model: Pick<ModelOption, "providerID" | "modelID">,
) => {
  return `${model.providerID}/${model.modelID}`;
};

export const parseModelOptionKey = (
  key: string,
): Pick<ModelOption, "providerID" | "modelID"> => {
  const separatorIndex = key.indexOf("/");

  if (separatorIndex === -1) {
    return {
      providerID: DEFAULT_MODEL_SETTINGS.providerID,
      modelID: DEFAULT_MODEL_SETTINGS.modelID,
    };
  }

  return {
    providerID: key.slice(0, separatorIndex),
    modelID: key.slice(separatorIndex + 1),
  };
};

export const loadModelOptions = async (): Promise<ModelOption[]> => {
  const modelContent = await invoke<string>("read_opencode_model");
  const models = JSON.parse(modelContent || "{}") as OpencodeModel;
  const orderedModels = [
    ...toModelOptions(models, "favorite"),
    ...toModelOptions(models, "recent"),
  ];
  const modelOptions = new Map<string, ModelOption>();

  orderedModels.forEach((model) => {
    const key = getModelOptionKey(model);
    if (!modelOptions.has(key)) {
      modelOptions.set(key, model);
    }
  });

  return Array.from(modelOptions.values());
};

export const loadModelSettingsWithAuth = async (): Promise<ModelSettings> => {
  const [auth, modelOptions] = await Promise.all([
    loadOpencodeAuth(),
    loadModelOptions(),
  ]);
  const savedSettings = localStorage.getItem(MODEL_SETTINGS_STORAGE_KEY);
  const firstModelOption = modelOptions[0];
  const settings = savedSettings
    ? loadModelSettings()
    : {
        ...DEFAULT_MODEL_SETTINGS,
        providerID:
          firstModelOption?.providerID ||
          Object.keys(auth)[0] ||
          DEFAULT_MODEL_SETTINGS.providerID,
        modelID: firstModelOption?.modelID || DEFAULT_MODEL_SETTINGS.modelID,
      };

  return {
    ...settings,
    apiKey: auth[settings.providerID]?.key || "",
  };
};

export const resolveModelSettings = async () => {
  const savedSettings = localStorage.getItem(MODEL_SETTINGS_STORAGE_KEY);
  if (savedSettings) {
    const settings = loadModelSettings();
    return {
      providerID: settings.providerID,
      modelID: settings.modelID,
    };
  }

  let firstModelOption: ModelOption | undefined;
  try {
    const modelOptions = await loadModelOptions();
    firstModelOption = modelOptions[0];
  } catch (e) {
    console.error("Failed to resolve opencode model settings:", e);
  }

  return {
    providerID:
      firstModelOption?.providerID || DEFAULT_MODEL_SETTINGS.providerID,
    modelID: firstModelOption?.modelID || DEFAULT_MODEL_SETTINGS.modelID,
  };
};

export const saveModelSettings = async (settings: ModelSettings) => {
  const normalizedSettings = {
    providerID: settings.providerID,
    modelID: settings.modelID,
  };

  localStorage.setItem(
    MODEL_SETTINGS_STORAGE_KEY,
    JSON.stringify(normalizedSettings),
  );

  if (settings.apiKey) {
    await invoke("set_opencode_auth_provider", {
      providerId: settings.providerID,
      key: settings.apiKey,
    });
  }
};
