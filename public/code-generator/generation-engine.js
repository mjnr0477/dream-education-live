/*
 * DREAM EDUCATION — ANY CODE GENERATOR
 * Generation Engine
 *
 * This file is intentionally isolated from server.js.
 * It defines the contract for real arbitrary-code generation.
 *
 * The actual model/provider will be connected later.
 */

(function () {
  "use strict";

  const SUPPORTED_LANGUAGES = [
    "auto",
    "html",
    "css",
    "javascript",
    "typescript",
    "python",
    "java",
    "c",
    "cpp",
    "csharp",
    "php",
    "go",
    "rust",
    "kotlin",
    "swift",
    "sql",
    "bash",
    "json",
    "other"
  ];

  const MODES = ["pure-code", "code-explanation"];

  function buildGenerationRequest({
    request,
    language = "auto",
    mode = "pure-code"
  }) {
    if (!request || !request.trim()) {
      throw new Error("A code-generation request is required.");
    }

    if (!SUPPORTED_LANGUAGES.includes(language)) {
      throw new Error("Unsupported programming language.");
    }

    if (!MODES.includes(mode)) {
      throw new Error("Unsupported generation mode.");
    }

    return {
      type: "code_generation_request",

      request: request.trim(),

      language,

      mode,

      requirements: {
        generate_real_code: true,
        follow_user_request: true,
        do_not_replace_request_with_template: true,
        do_not_return_fake_code: true,

        ...(mode === "pure-code"
          ? {
              output_only_code: true,
              no_explanation: true,
              no_markdown_fences: true,
              no_intro_text: true,
              no_closing_text: true
            }
          : {
              output_code: true,
              explanation_allowed: true
            })
      },

      future_capabilities: {
        arbitrary_code: true,
        multi_file_projects: true,
        project_structure: true,
        dependency_handling: true,
        debugging: true,
        code_modification: true
      },

      validation: {
        reject_empty_output: true,
        reject_placeholder_output: true,
        reject_known_fake_output: true
      }
    };
  }

  function validateGeneratedCode(output, mode) {
    if (!output || !output.trim()) {
      return {
        valid: false,
        reason: "The generator returned no code."
      };
    }

    const code = output.trim();

    const forbiddenPlaceholderMarkers = [
      "CODE GENERATOR CONNECTION POINT",
      "REAL GENERATION ENGINE WILL BE CONNECTED",
      "PLACEHOLDER OUTPUT",
      "THIS IS PLACEHOLDER"
    ];

    const hasPlaceholder = forbiddenPlaceholderMarkers.some(marker =>
      code.toUpperCase().includes(marker)
    );

    if (hasPlaceholder) {
      return {
        valid: false,
        reason: "Placeholder output was detected."
      };
    }

    if (mode === "pure-code") {
      const forbiddenWrappers = [
        "Here is the code:",
        "Here’s the code:",
        "Sure, here is",
        "Explanation:",
        "Here is an explanation:"
      ];

      const hasWrapper = forbiddenWrappers.some(text =>
        code.toLowerCase().startsWith(text.toLowerCase())
      );

      if (hasWrapper) {
        return {
          valid: false,
          reason: "Pure Code mode received explanatory text."
        };
      }
    }

    return {
      valid: true,
      code
    };
  }

  window.DreamCodeGenerationEngine = {
    SUPPORTED_LANGUAGES,
    MODES,
    buildGenerationRequest,
    validateGeneratedCode
  };
})();
