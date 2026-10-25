(function () {
  "use strict";

  /*
   * DREAM EDUCATION — ANY CODE GENERATOR
   *
   * Provider adapter.
   *
   * This module defines the contract between the generator and
   * the future real generation service.
   *
   * IMPORTANT:
   * - No API key belongs in this browser file.
   * - No fake/template generation is performed here.
   * - The real provider will be connected through a protected backend.
   */

  const DreamCodeProvider = {
    VERSION: "2.0.0",

    endpoint: "/api/code-generator",

    async generate(request) {
      validateRequest(request);

      let auth;
      try {
        auth = JSON.parse(localStorage.getItem("dream_education_auth") || "null");
      } catch (error) {
        auth = null;
      }

      const token = auth && auth.success === true && auth.session
        ? String(auth.session.access_token || "").trim()
        : "";

      if (!token) {
        throw new Error("Dream Education sign-in is missing or expired. Return to Dream Education, sign in to the owner account again, then reopen Code Generator.");
      }

      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + token
        },
        body: JSON.stringify(request)
      });

      let data;

      try {
        data = await response.json();
      } catch (error) {
        throw new Error(
          "The code-generation service returned an invalid response."
        );
      }

      if (!response.ok || !data || data.success !== true) {
        const message = data && data.message
          ? data.message
          : "The code-generation service failed.";
        // The backend diagnostic is returned only by this authenticated,
        // owner-only endpoint. Surface it instead of hiding the root cause.
        const diagnostic = data && typeof data.debug === "string"
          ? data.debug.trim().slice(0, 500)
          : "";
        throw new Error(
          diagnostic && !message.includes(diagnostic)
            ? message + " Details: " + diagnostic
            : message
        );
      }

      return {
        project_name: data.project_name,
        project_type: data.project_type,
        files: data.files,
        entry_point: data.entry_point,
        dependencies: data.dependencies,
        instructions: data.instructions
      };
    },

    validate(code) {
      if (typeof code !== "string" || !code.trim()) {
        return {
          valid: false,
          reason: "Generated output is empty."
        };
      }

      const blockedMarkers = [
        "CODE GENERATOR CONNECTION POINT",
        "PLACEHOLDER OUTPUT",
        "REAL GENERATION ENGINE WILL BE CONNECTED",
        "TODO: IMPLEMENT",
        "YOUR CODE HERE",
        "INSERT CODE HERE",
        "FAKE CODE"
      ];

      const upper = code.toUpperCase();

      for (const marker of blockedMarkers) {
        if (upper.includes(marker)) {
          return {
            valid: false,
            reason: "Generated output contains placeholder code."
          };
        }
      }

      return {
        valid: true,
        reason: null
      };
    },

    validateResponse(response) {
      if (!response || typeof response !== "object") {
        return {
          valid: false,
          reason: "Provider returned an invalid response."
        };
      }

      if (
        response.project_type !== "single-file" &&
        response.project_type !== "multi-file"
      ) {
        return {
          valid: false,
          reason: "Provider returned an unsupported project type."
        };
      }

      if (!Array.isArray(response.files) || response.files.length === 0) {
        return {
          valid: false,
          reason: "Provider returned no generated files."
        };
      }

      for (const file of response.files) {
        if (!file || typeof file !== "object") {
          return {
            valid: false,
            reason: "Provider returned an invalid file."
          };
        }

        if (
          typeof file.path !== "string" ||
          !file.path.trim()
        ) {
          return {
            valid: false,
            reason: "Provider returned a file without a path."
          };
        }

        if (
          typeof file.language !== "string" ||
          !file.language.trim()
        ) {
          return {
            valid: false,
            reason: "Provider returned a file without a language."
          };
        }

        if (
          typeof file.content !== "string" ||
          !file.content.trim()
        ) {
          return {
            valid: false,
            reason: "Provider returned an empty file."
          };
        }

        const validation = this.validate(file.content);

        if (!validation.valid) {
          return {
            valid: false,
            reason: file.path + ": " + validation.reason
          };
        }
      }

      if (
        response.project_type === "multi-file" &&
        (
          typeof response.entry_point !== "string" ||
          !response.entry_point.trim()
        )
      ) {
        return {
          valid: false,
          reason: "Multi-file response is missing an entry point."
        };
      }

      if (
        response.dependencies !== undefined &&
        !Array.isArray(response.dependencies)
      ) {
        return {
          valid: false,
          reason: "Provider returned invalid dependencies."
        };
      }

      if (
        response.instructions !== undefined &&
        typeof response.instructions !== "string"
      ) {
        return {
          valid: false,
          reason: "Provider returned invalid instructions."
        };
      }

      return {
        valid: true,
        response
      };
    }
  };

  function validateRequest(request) {
    if (!request || typeof request !== "object") {
      throw new Error("Invalid code-generation request.");
    }

    if (request.type !== "code_project_request") {
      throw new Error("Invalid project request type.");
    }

    if (
      !request.generation ||
      typeof request.generation !== "object"
    ) {
      throw new Error("Generation details are missing.");
    }

    if (
      typeof request.generation.request !== "string" ||
      !request.generation.request.trim()
    ) {
      throw new Error("The user's code request is empty.");
    }

    if (
      request.project_type !== "single-file" &&
      request.project_type !== "multi-file"
    ) {
      throw new Error("Invalid project type.");
    }
  }

  window.DreamCodeProvider = DreamCodeProvider;
})();
