(function () {
  "use strict";

  const STORAGE_PASSWORD = "dream_code_generator_owner_password";
  const STORAGE_HISTORY = "dream_code_generator_history";
  const SESSION_UNLOCKED = "dream_code_generator_unlocked";

  const lockScreen = document.getElementById("lock-screen");
  const generatorScreen = document.getElementById("generator-screen");

  const unlockForm = document.getElementById("unlock-form");
  const passwordInput = document.getElementById("password-input");
  const lockMessage = document.getElementById("lock-message");

  const requestInput = document.getElementById("request-input");
  const languageSelect = document.getElementById("language-select");
  const outputMode = document.getElementById("output-mode");
  const projectType = document.getElementById("project-type");

  const generateButton = document.getElementById("generate-button");
  const clearButton = document.getElementById("clear-button");
  const lockButton = document.getElementById("lock-button");

  const copyButton = document.getElementById("copy-button");
  const downloadButton = document.getElementById("download-button");

  const codeOutput = document.getElementById("code-output");
  const status = document.getElementById("status");

  const historyList = document.getElementById("history-list");
  const clearHistoryButton = document.getElementById("clear-history-button");


  /* =========================
     SECURITY / OWNER LOCK
     ========================= */

  function hasOwnerPassword() {
    return Boolean(localStorage.getItem(STORAGE_PASSWORD));
  }

  function setMessage(message) {
    lockMessage.textContent = message || "";
  }

  function showGenerator() {
    lockScreen.classList.add("hidden");
    generatorScreen.classList.remove("hidden");
    renderHistory();
    requestInput.focus();
  }

  function showLockScreen() {
    generatorScreen.classList.add("hidden");
    lockScreen.classList.remove("hidden");
    passwordInput.value = "";
    setMessage("");
    passwordInput.focus();
  }

  function unlock(password) {
    const storedPassword = localStorage.getItem(STORAGE_PASSWORD);

    if (!storedPassword) {
      if (!password || password.length < 8) {
        setMessage("Create a password with at least 8 characters.");
        return false;
      }

      localStorage.setItem(STORAGE_PASSWORD, password);
      sessionStorage.setItem(SESSION_UNLOCKED, "true");
      showGenerator();
      return true;
    }

    if (password !== storedPassword) {
      setMessage("Incorrect owner password.");
      return false;
    }

    sessionStorage.setItem(SESSION_UNLOCKED, "true");
    showGenerator();
    return true;
  }


  unlockForm.addEventListener("submit", function (event) {
    event.preventDefault();
    unlock(passwordInput.value);
  });


  lockButton.addEventListener("click", function () {
    sessionStorage.removeItem(SESSION_UNLOCKED);
    showLockScreen();
  });


  /* =========================
     GENERATION ENGINE SHELL
     ========================= */

  function getLanguageExtension(language) {
    const extensions = {
      html: "html",
      css: "css",
      javascript: "js",
      typescript: "ts",
      python: "py",
      java: "java",
      c: "c",
      cpp: "cpp",
      csharp: "cs",
      php: "php",
      go: "go",
      rust: "rs",
      kotlin: "kt",
      swift: "swift",
      sql: "sql",
      bash: "sh",
      json: "json",
      other: "txt"
    };

    return extensions[language] || "txt";
  }


  function setOutput(code) {
    codeOutput.textContent = code || "";
  }


  /* =========================
     REAL GENERATION PIPELINE
     ========================= */

  async function generate() {
    const request = requestInput.value.trim();

    if (!request) {
      status.textContent = "Enter a request first.";
      requestInput.focus();
      return;
    }

    generateButton.disabled = true;
    generateButton.textContent = "Generating...";
    status.textContent = "Building generation request...";

    try {
      const generationRequest =
        window.DreamCodeGenerationEngine.buildGenerationRequest({
          request: request,
          language: languageSelect.value,
          mode: outputMode.value === "pure"
            ? "pure-code"
            : "code-explanation"
        });

      const projectRequest =
        window.DreamCodeProjectEngine.createProjectRequest(
          generationRequest,
          projectType.value
        );

      if (!window.DreamCodeProvider) {
        throw new Error("Code-generation provider is not loaded.");
      }

      status.textContent = "Sending request to generation provider...";

      const result =
        await window.DreamCodeProvider.generate(projectRequest);

      /*
       * Validate the provider response before normalization.
       * This prevents malformed or fake provider responses from
       * entering the project pipeline.
       */

      const providerValidation =
        window.DreamCodeProvider.validateResponse(result);

      if (!providerValidation.valid) {
        throw new Error(providerValidation.reason);
      }

      /*
       * A real provider returns a structured project.
       * Normalize it so single-file and multi-file projects
       * follow the same internal contract.
       */

      const project =
        window.DreamCodeProjectEngine.normalizeProject(result);

      /*
       * Make sure the provider actually returned usable files.
       */

      const projectValidation =
        window.DreamCodeProjectEngine.validateProject(project);

      if (!projectValidation.valid) {
        throw new Error(projectValidation.reason);
      }

      /*
       * Also run the provider-level validation against every file.
       */

      for (const file of project.files) {
        const validation =
          window.DreamCodeProvider.validate(file.content);

        if (!validation.valid) {
          throw new Error(
            file.path + ": " + validation.reason
          );
        }
      }

      /*
       * Render the real generated files in the existing output area.
       * No fake preview or template is inserted here.
       */

      const renderedFiles = project.files.map((file, index) => {
        return [
          "==================================================",
          "FILE " + (index + 1) + ": " + file.path,
          "LANGUAGE: " + file.language,
          "==================================================",
          file.content
        ].join("\n");
      }).join("\n\n");

      setOutput(renderedFiles);

      status.textContent =
        project.files.length === 1
          ? "Code generated successfully."
          : project.files.length + " files generated successfully.";

      saveHistory(request, languageSelect.value);

    } catch (error) {
      console.error("Code generation error:", error);
      status.textContent = error.message || "Generation failed.";
      setOutput("");
    } finally {
      generateButton.disabled = false;
      generateButton.textContent = "⚡ Generate Code";
    }
  }

  generateButton.addEventListener("click", generate);


  requestInput.addEventListener("keydown", function (event) {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      generate();
    }
  });


  /* =========================
     COPY
     ========================= */

  copyButton.addEventListener("click", async function () {
    const code = codeOutput.textContent;

    if (!code || code === "// Your generated code will appear here.") {
      status.textContent = "Nothing to copy.";
      return;
    }

    try {
      await navigator.clipboard.writeText(code);
      status.textContent = "Code copied.";
    } catch (error) {
      status.textContent = "Copy failed. Select and copy manually.";
    }
  });


  /* =========================
     DOWNLOAD
     ========================= */

  downloadButton.addEventListener("click", function () {
    const code = codeOutput.textContent;

    if (!code || code === "// Your generated code will appear here.") {
      status.textContent = "Nothing to download.";
      return;
    }

    const language =
      languageSelect.value === "auto"
        ? "txt"
        : getLanguageExtension(languageSelect.value);

    const blob = new Blob([code], {
      type: "text/plain;charset=utf-8"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "dream-generated-code." + language;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);

    status.textContent = "Code downloaded.";
  });


  /* =========================
     CLEAR WORKSPACE
     ========================= */

  clearButton.addEventListener("click", function () {
    requestInput.value = "";
    setOutput("// Your generated code will appear here.");
    status.textContent = "Ready";
    requestInput.focus();
  });


  /* =========================
     HISTORY
     ========================= */

  function readHistory() {
    try {
      return JSON.parse(
        localStorage.getItem(STORAGE_HISTORY) || "[]"
      );
    } catch (error) {
      return [];
    }
  }


  function saveHistory(request, language) {
    const history = readHistory();

    history.unshift({
      request: request,
      language: language,
      createdAt: new Date().toISOString()
    });

    localStorage.setItem(
      STORAGE_HISTORY,
      JSON.stringify(history.slice(0, 20))
    );

    renderHistory();
  }


  function renderHistory() {
    const history = readHistory();

    if (!history.length) {
      historyList.innerHTML =
        '<p class="empty-history">No generations yet.</p>';
      return;
    }

    historyList.innerHTML = "";

    history.forEach(function (item) {
      const wrapper = document.createElement("div");
      wrapper.className = "history-item";

      const title = document.createElement("strong");
      title.textContent =
        item.request.length > 100
          ? item.request.slice(0, 100) + "..."
          : item.request;

      const meta = document.createElement("span");
      meta.textContent =
        (item.language || "auto") +
        " • " +
        new Date(item.createdAt).toLocaleString();

      wrapper.appendChild(title);
      wrapper.appendChild(meta);

      historyList.appendChild(wrapper);
    });
  }


  clearHistoryButton.addEventListener("click", function () {
    localStorage.removeItem(STORAGE_HISTORY);
    renderHistory();
    status.textContent = "History cleared.";
  });


  /* =========================
     STARTUP
     ========================= */

  if (
    sessionStorage.getItem(SESSION_UNLOCKED) === "true" &&
    hasOwnerPassword()
  ) {
    showGenerator();
  } else {
    showLockScreen();
  }

})();
