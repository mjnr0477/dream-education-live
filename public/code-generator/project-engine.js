/*
 * DREAM EDUCATION — ANY CODE GENERATOR
 * Project Engine
 *
 * Handles the structure of generated single-file and multi-file projects.
 * This module does not call server.js or any external AI provider.
 */

(function () {
  "use strict";

  const PROJECT_TYPES = [
    "single-file",
    "multi-file"
  ];

  function createProjectRequest(generationRequest, projectType = "single-file") {
    if (!generationRequest) {
      throw new Error("Generation request is required.");
    }

    if (!PROJECT_TYPES.includes(projectType)) {
      throw new Error("Unsupported project type.");
    }

    return {
      type: "code_project_request",

      generation: generationRequest,

      project_type: projectType,

      project_requirements: {
        create_real_files: true,
        preserve_requested_language: true,
        follow_requested_functionality: true,
        no_fake_code: true,
        no_placeholder_files: true,

        ...(projectType === "multi-file"
          ? {
              allow_multiple_files: true,
              allow_directories: true,
              include_entry_point: true,
              include_dependencies: true,
              include_project_structure: true
            }
          : {
              allow_multiple_files: false
            })
      },

      output_schema: {
        project_name: "string",
        project_type: projectType,
        files: [
          {
            path: "string",
            language: "string",
            content: "string"
          }
        ],
        entry_point: "string",
        dependencies: [],
        instructions: "string"
      },

      validation: {
        require_files: true,
        require_non_empty_file_content: true,
        reject_placeholder_content: true,
        reject_missing_entry_point_for_multi_file: true
      }
    };
  }

  function validateProject(project) {
    if (!project || typeof project !== "object") {
      return {
        valid: false,
        reason: "No project was returned."
      };
    }

    if (!Array.isArray(project.files) || project.files.length === 0) {
      return {
        valid: false,
        reason: "The project contains no files."
      };
    }

    for (const file of project.files) {
      if (!file || typeof file.path !== "string" || !file.path.trim()) {
        return {
          valid: false,
          reason: "A generated file has no valid path."
        };
      }

      if (file.path.includes("\0")) {
        return {
          valid: false,
          reason: "A generated file contains an invalid path."
        };
      }

      if (typeof file.content !== "string" || !file.content.trim()) {
        return {
          valid: false,
          reason: "A generated file has no content."
        };
      }

      const upperContent = file.content.toUpperCase();

      const blockedMarkers = [
        "CODE GENERATOR CONNECTION POINT",
        "PLACEHOLDER OUTPUT",
        "REAL GENERATION ENGINE WILL BE CONNECTED",
        "TODO: IMPLEMENT",
        "YOUR CODE HERE",
        "INSERT CODE HERE",
        "FAKE CODE"
      ];

      for (const marker of blockedMarkers) {
        if (upperContent.includes(marker)) {
          return {
            valid: false,
            reason: "Placeholder content was detected."
          };
        }
      }
    }

    if (
      project.project_type === "multi-file" &&
      (!project.entry_point ||
        typeof project.entry_point !== "string" ||
        !project.entry_point.trim())
    ) {
      return {
        valid: false,
        reason: "Multi-file project is missing an entry point."
      };
    }

    return {
      valid: true,
      project
    };
  }

  function normalizeProject(project) {
    if (!project || typeof project !== "object") {
      throw new Error("Invalid project.");
    }

    const projectType =
      PROJECT_TYPES.includes(project.project_type)
        ? project.project_type
        : "single-file";

    return {
      project_name:
        typeof project.project_name === "string" &&
        project.project_name.trim()
          ? project.project_name.trim()
          : "dream-generated-project",

      project_type: projectType,

      files: Array.isArray(project.files)
        ? project.files.map(file => ({
            path: String(file.path || "").trim(),
            language: String(file.language || "other").trim(),
            content: String(file.content || "")
          }))
        : [],

      entry_point:
        typeof project.entry_point === "string"
          ? project.entry_point.trim()
          : "",

      dependencies: Array.isArray(project.dependencies)
        ? project.dependencies
        : [],

      instructions:
        typeof project.instructions === "string"
          ? project.instructions
          : ""
    };
  }

  window.DreamCodeProjectEngine = {
    PROJECT_TYPES,
    createProjectRequest,
    validateProject,
    normalizeProject
  };
})();
