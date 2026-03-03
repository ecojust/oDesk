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

const sessionMessage = async (
  sessionId,
  message,
  baseUrl = "http://127.0.0.1:4096",
) => {
  try {
    const response = await fetch(`${baseUrl}/session/${sessionId}/message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        agent: "build",
        model: {
          modelID: "big-pickle",
          providerID: "opencode",
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
