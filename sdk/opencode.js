const createSession = async (baseUrl = "http://127.0.0.1:4096") => {
  try {
    const response = await fetch(`${baseUrl}/session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 10000,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to create session:", error);
    throw error;
  }
};

const defaultModel = {
  providerID: "opencode",
  modelID: "big-pickle",
};

const readOpencodeModel = async () => {
  if (typeof invoke !== "function") {
    return defaultModel;
  }

  try {
    const response = await invoke("read_opencode_model");
    const modelConfig = JSON.parse(response?.data || response || "{}");
    const model =
      modelConfig.favorite?.[0] || modelConfig.recent?.[0] || defaultModel;

    return {
      providerID: model.providerID || defaultModel.providerID,
      modelID: model.modelID || defaultModel.modelID,
    };
  } catch (error) {
    console.warn("Failed to read opencode model config:", error);
    return defaultModel;
  }
};

const sessionMessage = async (
  sessionId,
  message,
  options = {},
) => {
  try {
    const normalizedOptions =
      typeof options === "string" ? { baseUrl: options } : options;
    const baseUrl = normalizedOptions.baseUrl || "http://127.0.0.1:4096";
    const resolvedModel = normalizedOptions.model || (await readOpencodeModel());

    const response = await fetch(`${baseUrl}/session/${sessionId}/message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        agent: "build",
        model: {
          modelID: resolvedModel.modelID,
          providerID: resolvedModel.providerID,
        },
        parts: [
          {
            type: "text",
            text: message,
          },
        ],
      }),
      timeout: 10000,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to send session message:", error);
    throw error;
  }
};
