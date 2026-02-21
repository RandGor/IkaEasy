// anti-captcha.js

class AntiCaptcha {
  constructor() { }

  /**
 * Solves an image captcha using Anti‑Captcha API.
 * @param {string} base64Image - Base64‑encoded image (without prefix, or with data:image/... prefix)
 * @param {string} clientKey - Your Anti‑Captcha client key
 * @param {Object} options - Additional task parameters (optional)
 * @returns {Promise<string>} - The solved captcha text
 */
  async solveCaptcha(base64Image, clientKey, options = {}) {
    // Remove data URL prefix if present (e.g., "data:image/png;base64,")
    const base64Body = base64Image.replace(/^data:image\/[a-z]+;base64,/, '');

    const task = {
      type: 'ImageToTextTask',
      body: base64Body,
      phrase: false,
      case: false,
      numeric: 0,
      math: false,
      minLength: 6,
      maxLength: 8,
      websiteURL: "IkaLogs",
      languagePool: 'en',
      ...options, // allow overriding defaults
    };

    // 1. Create task
    const createPayload = {
      clientKey,
      task,
      softId: 0, // optional, set if you have a softId
    };

    const createResponse = await fetch('https://api.anti-captcha.com/createTask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createPayload),
    });

    const createResult = await createResponse.json();

    if (createResult.errorId) {
      throw new Error(`Anti‑Captcha error (${createResult.errorCode}): ${createResult.errorDescription}`);
    }

    const taskId = createResult.taskId;

    // 2. Poll for result
    const pollPayload = {
      clientKey,
      taskId,
    };

    const maxAttempts = 5;
    const pollInterval = 5000; // 5 seconds

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));

      const pollResponse = await fetch('https://api.anti-captcha.com/getTaskResult', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pollPayload),
      });

      const pollResult = await pollResponse.json();

      if (pollResult.errorId) {
        throw new Error(`Polling error (${pollResult.errorCode}): ${pollResult.errorDescription}`);
      }

      if (pollResult.status === 'ready') {
        return pollResult.solution.text; // assuming text solution
      }
      // Otherwise status is 'processing' – continue polling
    }

    throw new Error('Timeout waiting for captcha solution');
  }

}

  // Export for use in modules (if using ES modules)
  export default new AntiCaptcha();