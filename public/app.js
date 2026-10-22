/* Shared HTML escaping helper for top-level UI functions. */
function escapeHTML(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

(function () {
  "use strict";

  const panel = document.getElementById("experience-panel");
  const backdrop = document.querySelector(".panel-backdrop");
  const panelKicker = document.getElementById("panel-kicker");
  const panelTitle = document.getElementById("panel-title");
  const panelDescription = document.getElementById("panel-description");
  const panelBody = document.getElementById("panel-body");
  const mobileDrawer = document.getElementById("mobile-drawer");
  const mobileMenu = document.querySelector(".mobile-menu");
  const year = document.getElementById("year");

  const AUTH_KEY = "dream_education_auth";

  if (year) {
    year.textContent = new Date().getFullYear();
  }

  const experiences = {
    books: {
      kicker: "BOOKS & READING",
      title: "Discover your next read.",
      description: "Explore books by Mathias Simiyu, then discover trusted sources for more books and free learning resources.",
      cards: [],
      primary: "Explore books",
      secondary: "Close"
    },
    learn: {
      kicker: "LEARNING SPACE",
      title: "Start learning.",
      description:
        "Ask, explore, practise and build real understanding in one focused learning space.",
      cards: [
        {
          title: "Ask anything",
          text: "Start with a question, concept, problem or topic you want to understand."
        },
        {
          title: "Choose how you learn",
          text: "Select the learning approach that works best for the way you want to be taught."
        },
        {
          title: "Build mastery",
          text: "Learning can adapt as your understanding changes."
        }
      ],
      primary: "Enter learning",
      secondary: "Close"
    },

    teach: {
      kicker: "EDUCATOR SPACE",
      title: "Teach with purpose.",
      description:
        "A focused space for educators to guide learners, follow progress and support understanding.",
      cards: [
        {
          title: "Guide learners",
          text: "Work with learner information and learning activity from one place."
        },
        {
          title: "Track progress",
          text: "Follow results, learning states and areas that need attention."
        },
        {
          title: "Support understanding",
          text: "Use teaching tools designed around actual learning needs."
        }
      ],
      primary: "Enter teacher space",
      secondary: "Close"
    },

    connect: {
      kicker: "CONNECTED EDUCATION",
      title: "Stay connected.",
      description:
        "Bring the people around learning into one connected experience.",
      cards: [
        {
          title: "Learners",
          text: "Keep learning relationships connected to the learner's education journey."
        },
        {
          title: "Teachers",
          text: "Support communication between learners and educators."
        },
        {
          title: "Parents & schools",
          text: "Keep the wider learning community connected."
        },
        {
          title: "Parent Space",
          text: "Follow children's learning, progress and assessment results from one connected space.",
          action: "parent-space"
        },
        {
          title: "Meetings",
          text: "Meet with people connected to your learning and teaching.",
          action: "meetings"
        },
        {
          title: "Chat",
          text: "Have private conversations with people connected to your learning.",
          action: "chat"
        },
        {
          title: "General Connections",
          text: "Find and connect with learners, teachers, parents and schools across Dream Education.",
          action: "general-connections",
        },
        {
          title: "Universal Connector",
          text: "Connect an authorized platform, choose the exact recipient, and send from one place.",
          action: "universal-connector"
        },
        {
          title: "Authorized Search",
          text: "Owner-only search across connected public sources and legitimately authorized information, with owner overrides taking precedence.",
          action: "authorized-search",
          ownerOnly: true
        }
      ],
      primary: "Explore connections",
      secondary: "Close"
    },

    tools: {
      kicker: "DREAM AI LAB",
      title: "Powerful tools.",
      description:
        "Explore intelligent tools built to help people learn, solve problems and create.",
      cards: [
        {
          title: "Problem solving",
          text: "Open the learner workspace to work through mathematical, scientific, technical and real-world problems.",
          action: "ai-problem-solving"
        },
        {
          title: "Knowledge discovery",
          text: "Jump to Dream Search to retrieve and organize source-backed knowledge for learning.",
          action: "ai-knowledge-discovery"
        },
        {
          title: "Code creation",
          text: "Create software and code projects from a natural-language request.",
          action: "coding-lab"
        },
        {
          title: "Learn coding your way",
          text: "Choose a coding-learning method, then get free text, video, image, course and practice resources.",
          action: "coding-learning"
        },
        {
          title: "Media Studio",
          text: "Generate images, turn text into speech, translate text and ask Free.ai from one place.",
          action: "media-studio"
        }
      ],
      primary: "Explore AI Lab",
      secondary: "Close"
    },

    school: {
      kicker: "SCHOOL SPACE",
      title: "Education, together.",
      description:
        "A connected environment designed to bring learners, teachers, parents and school leadership together.",
      cards: [
        {
          title: "School overview",
          text: "Bring important learning information into one institutional space."
        },
        {
          title: "Teacher support",
          text: "Give educators tools for managing and supporting learning."
        },
        {
          title: "Learner progress",
          text: "Keep progress and learning activity connected."
        }
      ],
      primary: "Enter school space",
      action: "school-dashboard",
      secondary: "Close"
    },

    signin: {
      kicker: "WELCOME BACK",
      title: "Sign in.",
      description:
        "Enter your Dream Education account and continue from where you left off.",
      form: "login",
      primary: "Sign in"
    },

    join: {
      kicker: "BEGIN YOUR JOURNEY",
      title: "Get started.",
      description:
        "Create your place in Dream Education and begin your journey.",
      form: "register",
      primary: "Create account"
    },

    explore: {
      kicker: "EXPLORE",
      title: "More than learning.",
      description:
        "Dream Education brings learning, teaching, connection and intelligent tools into one experience.",
      cards: [
        {
          title: "Learn",
          text: "Understand concepts and develop mastery."
        },
        {
          title: "Teach",
          text: "Support learners with focused educational tools."
        },
        {
          title: "Connect",
          text: "Keep the learning community connected."
        },
        {
          title: "AI Lab",
          text: "Use intelligent tools for solving and creating."
        },
        {
          title: "Optional Features",
          text: "Choose which optional tools appear in your account.",
          action: "optional-features"
        }
      ],
      primary: "Get started",
      secondary: "Close"
    },

    about: {
      kicker: "THE IDEA",
      title: "Why Dream?",
      description:
        "Dream Education is being built around the idea that education should adapt to people.",
      cards: [
        {
          title: "Learner first",
          text: "The learner's question, context and learning needs stay at the centre."
        },
        {
          title: "One connected space",
          text: "Learning should not require a collection of disconnected experiences."
        },
        {
          title: "Built for growth",
          text: "The platform is designed to grow from individual learning to connected education communities."
        }
      ],
      primary: "Start exploring",
      secondary: "Close"
    }
  };

  async function fetchWithTimeout(input, options, timeoutMs) {
    const controller = new AbortController();
    const timeout = setTimeout(function () {
      controller.abort();
    }, Number(timeoutMs) || 8000);

    const requestOptions = Object.assign({}, options || {}, {
      signal: controller.signal
    });

    try {
      return await fetch(input, requestOptions);
    } finally {
      clearTimeout(timeout);
    }
  }

  function escapeHTML(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function isOwnerAccount(auth) {
    const account = auth?.account || {};
    return account.owner_account === true ||
      String(account.email || auth?.email || "").trim().toLowerCase() === "mathiassimiyu52@gmail.com";
  }

  function getAuth() {
    try {
      const raw = localStorage.getItem(AUTH_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }

  function saveAuth(data) {
    try {
      localStorage.setItem(AUTH_KEY, JSON.stringify(data));
      window.dispatchEvent(new CustomEvent("dream-education-auth-changed"));
    } catch (error) {
      console.error("Could not save authentication state:", error);
    }
  }

  function clearAuth() {
    try {
      localStorage.removeItem(AUTH_KEY);
      window.dispatchEvent(new CustomEvent("dream-education-auth-changed"));
    } catch (error) {
      console.error("Could not clear authentication state:", error);
    }
  }

  function renderCards(cards) {
    return (cards || [])
      .filter(function (card) {
        return !card.ownerOnly || isOwnerAccount(getAuth());
      })
      .map(function (card) {
        const isCodeCreation = card.title === "Code creation";
        const isMeetings = card.action === "meetings";
        const isParentSpace = card.action === "parent-space";
        const isChat = card.action === "chat";
        const isGeneralConnections = card.action === "general-connections";
        const isUniversalMessenger = card.action === "universal-connector";
        const isCodingLab = card.action === "coding-lab";
        const isCodingLearning = card.action === "coding-learning";
        const isMediaStudio = card.action === "media-studio";
        const isAIProblemSolving = card.action === "ai-problem-solving";
        const isAIKnowledgeDiscovery = card.action === "ai-knowledge-discovery";
        const isAuthorizedSearch = card.action === "authorized-search" &&
          isOwnerAccount(getAuth());
        const isOptionalFeatures = card.action === "optional-features";
        const cardAction = isCodeCreation
          ? 'data-panel-action="code-generator" role="button" tabindex="0"'
          : isMeetings
            ? 'data-panel-action="meetings" role="button" tabindex="0"'
            : isParentSpace
              ? 'data-panel-action="parent-space" role="button" tabindex="0"'
              : isChat
                ? 'data-panel-action="chat" role="button" tabindex="0"'
                : isGeneralConnections
                  ? 'data-panel-action="general-connections" role="button" tabindex="0"'
                  : isUniversalMessenger
                    ? 'data-panel-action="universal-connector" role="button" tabindex="0"'
                  : isCodingLab
                    ? 'data-panel-action="coding-lab" role="button" tabindex="0"'
                    : isCodingLearning
                      ? 'data-panel-action="coding-learning" role="button" tabindex="0"'
                      : isMediaStudio
                        ? 'data-panel-action="media-studio" role="button" tabindex="0"'
                        : isAIProblemSolving
                          ? 'data-panel-action="ai-problem-solving" role="button" tabindex="0"'
                          : isAIKnowledgeDiscovery
                            ? 'data-panel-action="ai-knowledge-discovery" role="button" tabindex="0"'
                            : isAuthorizedSearch
                              ? 'data-panel-action="authorized-search" role="button" tabindex="0"'
                              : isOptionalFeatures
                                ? 'data-panel-action="optional-features" role="button" tabindex="0"'
                : "";
        const cardButton = isCodeCreation
          ? '<button class="panel-action" type="button" data-panel-action="code-generator">Open Code Generator</button>'
          : isMeetings
            ? '<button class="panel-action" type="button" data-panel-action="meetings">Open Meetings</button>'
            : isParentSpace
              ? '<button class="panel-action" type="button" data-panel-action="parent-space">Open Parent Space</button>'
              : isChat
                ? '<button class="panel-action" type="button" data-panel-action="chat">Open Chat</button>'
              : isGeneralConnections
                ? '<button class="panel-action" type="button" data-panel-action="general-connections">Open General Connections</button>'
                : isUniversalMessenger
                  ? '<button class="panel-action" type="button" data-panel-action="universal-connector">Open Universal Connector</button>'
                : isCodingLab
                  ? '<button class="panel-action" type="button" data-panel-action="coding-lab">Open Coding Studio</button>'
                  : isCodingLearning
                    ? '<button class="panel-action" type="button" data-panel-action="coding-learning">Choose how to learn coding</button>'
                    : isMediaStudio
                      ? '<button class="panel-action" type="button" data-panel-action="media-studio">Open Media Studio</button>'
                      : isAIProblemSolving
                        ? '<button class="panel-action" type="button" data-panel-action="ai-problem-solving">Open Problem Solving</button>'
                        : isAIKnowledgeDiscovery
                          ? '<button class="panel-action" type="button" data-panel-action="ai-knowledge-discovery">Open Knowledge Discovery</button>'
                          : isAuthorizedSearch
                            ? '<button class="panel-action" type="button" data-panel-action="authorized-search">Open Authorized Search</button>'
                            : isOptionalFeatures
                              ? '<button class="panel-action" type="button" data-panel-action="optional-features">Manage Optional Features</button>'
                              : "";

        return `
          <article class="panel-card${isCodeCreation || isMeetings || isGeneralConnections || isAIProblemSolving || isAIKnowledgeDiscovery ? " panel-card-action" : ""}"
            ${cardAction}>
            <h3>${escapeHTML(card.title)}</h3>
            <p>${escapeHTML(card.text)}</p>
            ${cardButton}
          </article>
        `;
      })
      .join("");
  }

  function renderAuthForm(type) {
    if (type === "login") {
      return `
        <form class="auth-form" data-auth-form="login" novalidate>
          <div class="panel-card">
            <label class="panel-label" for="auth-email">Email</label>
            <input
              class="panel-input"
              id="auth-email"
              name="email"
              type="email"
              placeholder="you@example.com"
              autocomplete="email"
              required
            >

            <label class="panel-label" for="auth-password">Password</label>
            <input
              class="panel-input"
              id="auth-password"
              name="password"
              type="password"
              placeholder="Password"
              autocomplete="current-password"
              required
            >

            <div class="auth-message" data-auth-message></div>
          </div>

          <div class="panel-actions">
            <button class="panel-action" type="submit">
              Sign in
            </button>
            <button class="panel-action secondary" type="button" data-action="close">
              Close
            </button>
          </div>
        </form>
      `;
    }

    return `
      <form class="auth-form" data-auth-form="register" novalidate>
        <div class="panel-card">
          <label class="panel-label" for="auth-name">Full name</label>
          <input
            class="panel-input"
            id="auth-name"
            name="name"
            type="text"
            placeholder="Your full name"
            autocomplete="name"
            required
          >

          <label class="panel-label" for="auth-register-email">Email</label>
          <input
            class="panel-input"
            id="auth-register-email"
            name="email"
            type="email"
            placeholder="you@example.com"
            autocomplete="email"
            required
          >

          <label class="panel-label" for="auth-register-password">Password</label>
          <input
            class="panel-input"
            id="auth-register-password"
            name="password"
            type="password"
            placeholder="At least 6 characters"
            autocomplete="new-password"
            minlength="6"
            required
          >

          <label class="panel-label" for="auth-role">Account type</label>
          <select class="panel-input" id="auth-role" name="role">
            <option value="learner">Learner</option>
            <option value="teacher">Teacher</option>
            <option value="parent">Parent</option>
            <option value="school">School</option>
          </select>

          <div class="auth-learner-fields">
            <label class="panel-label" for="auth-level">Level</label>
            <input
              class="panel-input"
              id="auth-level"
              name="level"
              type="text"
              placeholder="e.g. JSS"
            >

            <label class="panel-label" for="auth-grade">Grade</label>
            <input
              class="panel-input"
              id="auth-grade"
              name="grade"
              type="text"
              placeholder="e.g. Grade 7"
            >

            <label class="panel-label" for="auth-school">School</label>
            <input
              class="panel-input"
              id="auth-school"
              name="school"
              type="text"
              placeholder="School name"
            >
          </div>

          <div class="auth-message" data-auth-message></div>
        </div>

        <div class="panel-actions">
          <button class="panel-action" type="submit">
            Create account
          </button>
          <button class="panel-action secondary" type="button" data-action="close">
            Close
          </button>
        </div>
      </form>
    `;
  }

  function renderActions(experience) {
    if (experience.form) {
      return "";
    }

    const action = experience.action || "primary";

    return `
      <div class="panel-actions">
        <button class="panel-action" data-panel-action="${escapeHTML(action)}">
          ${escapeHTML(experience.primary || "Continue")}
        </button>

        <button class="panel-action secondary" data-action="close">
          ${escapeHTML(experience.secondary || "Close")}
        </button>
      </div>
    `;
  }

  function renderAuthenticatedPanel(auth) {
    const account = auth.account || {};
    const profile = auth.profile || auth.learner || {};
    const role = auth.role || account.role || "learner";
    const displayName =
      profile.name ||
      account.email ||
      "Dream Education user";

    panelKicker.textContent = "AUTHENTICATED";
    panelTitle.textContent = "Welcome back.";
    panelDescription.textContent =
      "Your Dream Education account is connected to this browser.";

    panelBody.innerHTML = `
      <article class="panel-card">
        <h3>${escapeHTML(displayName)}</h3>
        <p>
          Account type: <strong>${escapeHTML(role)}</strong>
        </p>
      </article>

      <article class="panel-card">
        <h3>Account connected</h3>
        <p>
          Your authenticated account information has been received from
          Dream Education's existing authentication system.
        </p>
      </article>

      <div class="panel-actions">
        <button class="panel-action" data-panel-action="continue-auth">
          Continue
        </button>
        <button class="panel-action secondary" data-panel-action="logout">
          Sign out
        </button>
      </div>
    `;

    document.body.classList.add("panel-open");
    panel.setAttribute("aria-hidden", "false");
  }


  function openSchoolDashboard() {
    const auth = getAuth();
    const account = auth && auth.account ? auth.account : auth;
    const role = String(
      auth && (auth.role || (auth.account && auth.account.role)) || ""
    ).toLowerCase();
    const schoolId = account && (account.school_id || account.schoolId);

    if (role !== "school" || !schoolId) {
      panelKicker.textContent = "SCHOOL SPACE";
      panelTitle.textContent = "School account required.";
      panelDescription.textContent =
        "Sign in with an authenticated school account to enter the school space.";

      panelBody.innerHTML = `
        <article class="panel-card">
          <h3>No school account is connected</h3>
          <p>The School Space uses the school identity connected to your Dream Education account.</p>
        </article>
        <div class="panel-actions">
          <button class="panel-action" data-action="open" data-panel="signin">Sign in</button>
          <button class="panel-action secondary" data-action="close">Close</button>
        </div>
      `;

      document.body.classList.add("panel-open");
      panel.setAttribute("aria-hidden", "false");
      return;
    }

    panelKicker.textContent = "SCHOOL SPACE";
    panelTitle.textContent = "Loading school space...";
    panelDescription.textContent =
      "Connecting to your school's Dream Education data.";

    panelBody.innerHTML = `
      <div class="school-loading">
        <div class="school-loading-dot"></div>
        <p>Loading school information...</p>
      </div>
    `;

    document.body.classList.add("panel-open");
    panel.setAttribute("aria-hidden", "false");

    loadSchoolDashboard(String(schoolId));
  }

  async function loadSchoolDashboard(schoolId) {
    try {
      const auth = getAuth();
      const token =
        auth && auth.session && auth.session.access_token
          ? auth.session.access_token
          : "";

      const headers = {
        "Accept": "application/json"
      };

      if (token) {
        headers.Authorization = "Bearer " + token;
      }

      const response = await fetchWithTimeout(
        "/api/product/school/" +
        encodeURIComponent(schoolId) +
        "/dashboard",
        {
          method: "GET",
          headers
        }
      );

      const data = await response.json().catch(function () {
        return {
          success: false,
          error: "The server returned an invalid response."
        };
      });

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Could not load the school dashboard."
        );
      }

      renderSchoolDashboard(data);
    } catch (error) {
      console.error("School dashboard error:", error);

      panelKicker.textContent = "SCHOOL SPACE";
      panelTitle.textContent = "School space unavailable.";
      panelDescription.textContent =
        "Dream Education could not load the school's current information.";

      panelBody.innerHTML = `
        <article class="panel-card">
          <h3>Could not load school information</h3>
          <p>${escapeHTML(error.message || "Please try again.")}</p>
        </article>

        <div class="panel-actions">
          <button
            class="panel-action"
            data-panel-action="school-dashboard"
          >
            Try again
          </button>

          <button
            class="panel-action secondary"
            data-action="close"
          >
            Close
          </button>
        </div>
      `;
    }
  }

  function renderSchoolDashboard(data) {
    const school = data.school || {};
    const classes = Array.isArray(data.classes) ? data.classes : [];
    const teachers = Array.isArray(data.teachers) ? data.teachers : [];
    const learners = Array.isArray(data.learners) ? data.learners : [];
    const results = Array.isArray(data.results) ? data.results : [];
    const analytics = data.analytics || {};

    const schoolName =
      school.name ||
      school.school_name ||
      school.title ||
      school.school_id ||
      "Your school";

    const number = function (value) {
      const n = Number(value);
      return Number.isFinite(n) ? n : 0;
    };

    const learnerCount =
      number(analytics.total_learners) || learners.length;

    const teacherCount =
      number(analytics.total_teachers) || teachers.length;

    const classCount =
      number(analytics.total_classes) || classes.length;

    const assessmentCount =
      number(analytics.total_assessments) || results.length;

    const averageScore = number(analytics.average_score);

    const learnerRows = learners.length
      ? learners.slice(0, 50).map(function (learner) {
          const name =
            learner.name ||
            learner.full_name ||
            learner.learner_name ||
            learner.learner_id ||
            "Learner";

          const id =
            learner.learner_id ||
            learner.id ||
            "";

          const classData = classes.find(function (item) {
            return Array.isArray(item.learners) &&
              item.learners.includes(id);
          });

          return `
            <tr>
              <td>${escapeHTML(name)}</td>
              <td>${escapeHTML(
                classData
                  ? (
                      classData.name ||
                      classData.class_name ||
                      classData.class_id ||
                      "Class"
                    )
                  : "—"
              )}</td>
            </tr>
          `;
        }).join("")
      : `
        <tr>
          <td colspan="2" class="school-table-empty">
            No learners recorded yet.
          </td>
        </tr>
      `;

    const teacherRows = teachers.length
      ? teachers.slice(0, 50).map(function (teacher) {
          const name =
            teacher.name ||
            teacher.full_name ||
            teacher.teacher_name ||
            teacher.teacher_id ||
            "Teacher";

          const teacherId =
            teacher.teacher_id ||
            teacher.id ||
            "";

          const assigned = classes.filter(function (item) {
            return String(item.teacher_id || "") === String(teacherId);
          });

          return `
            <tr>
              <td>${escapeHTML(name)}</td>
              <td>${escapeHTML(
                assigned.length
                  ? assigned.map(function (item) {
                      return item.name ||
                        item.class_name ||
                        item.class_id ||
                        "Class";
                    }).join(", ")
                  : "—"
              )}</td>
            </tr>
          `;
        }).join("")
      : `
        <tr>
          <td colspan="2" class="school-table-empty">
            No teachers recorded yet.
          </td>
        </tr>
      `;

    const classRows = classes.length
      ? classes.slice(0, 50).map(function (item) {
          const name =
            item.name ||
            item.class_name ||
            item.class_id ||
            "Class";

          const teacher = teachers.find(function (teacher) {
            return String(teacher.teacher_id || "") ===
              String(item.teacher_id || "");
          });

          return `
            <tr>
              <td>${escapeHTML(name)}</td>
              <td>${escapeHTML(
                teacher
                  ? (
                      teacher.name ||
                      teacher.full_name ||
                      teacher.teacher_name ||
                      teacher.teacher_id
                    )
                  : "—"
              )}</td>
              <td>${
                Array.isArray(item.learners)
                  ? item.learners.length
                  : 0
              }</td>
            </tr>
          `;
        }).join("")
      : `
        <tr>
          <td colspan="3" class="school-table-empty">
            No classes recorded yet.
          </td>
        </tr>
      `;

    const resultRows = results.length
      ? results.slice(-50).reverse().map(function (result) {
          return `
            <tr>
              <td>${escapeHTML(
                result.subject ||
                result.topic ||
                result.question ||
                "Assessment"
              )}</td>
              <td>${escapeHTML(result.learner_id || "—")}</td>
              <td>${number(result.score)}</td>
            </tr>
          `;
        }).join("")
      : `
        <tr>
          <td colspan="3" class="school-table-empty">
            No assessment results recorded yet.
          </td>
        </tr>
      `;

    panelKicker.textContent = "SCHOOL SPACE";
    panelTitle.textContent = schoolName;
    panelDescription.textContent =
      "Your school's connected learning environment.";

    panelBody.innerHTML = `
      <div class="school-space">

        <section class="school-welcome">
          <span class="school-section-kicker">
            WELCOME TO YOUR SCHOOL
          </span>
          <h3>${escapeHTML(schoolName)}</h3>
          <p>
            One connected space for learners, teachers, classes,
            assessment activity and the school's learning picture.
          </p>
        </section>

        <section class="school-stat-grid">
          <article class="school-stat-card">
            <span>Learners</span>
            <strong>${learnerCount}</strong>
          </article>

          <article class="school-stat-card">
            <span>Teachers</span>
            <strong>${teacherCount}</strong>
          </article>

          <article class="school-stat-card">
            <span>Classes</span>
            <strong>${classCount}</strong>
          </article>

          <article class="school-stat-card">
            <span>Assessments</span>
            <strong>${assessmentCount}</strong>
          </article>

          <article class="school-stat-card school-stat-wide">
            <span>Average assessment score</span>
            <strong>${averageScore}</strong>
          </article>
        </section>

        <nav class="school-nav">
          <button class="school-nav-button active" data-school-tab="overview">
            Overview
          </button>
          <button class="school-nav-button" data-school-tab="learners">
            Learners
          </button>
          <button class="school-nav-button" data-school-tab="teachers">
            Teachers
          </button>
          <button class="school-nav-button" data-school-tab="classes">
            Classes
          </button>
          <button class="school-nav-button" data-school-tab="results">
            Results
          </button>
        </nav>

        <section class="school-tab active" data-school-content="overview">
          <div class="school-section-grid">

            <article class="panel-card">
              <h3>School overview</h3>
              <p>
                ${learnerCount} learners,
                ${teacherCount} teachers and
                ${classCount} classes are currently represented
                in the school's connected data.
              </p>
            </article>

            <article class="panel-card">
              <h3>Learning picture</h3>
              <p>
                The recorded assessment average is
                <strong>${averageScore}</strong>.
              </p>
            </article>

            <article class="panel-card">
              <h3>Connected education</h3>
              <p>
                Your school information is connected to the existing
                Dream Education learning system.
              </p>
            </article>

          </div>
        </section>

        <section class="school-tab" data-school-content="learners">
          <article class="panel-card school-table-card">
            <h3>Learners</h3>
            <p>Students represented in the school's connected classes.</p>
            <div class="school-table-wrap">
              <table class="school-table">
                <thead>
                  <tr>
                    <th>Learner</th>
                    <th>Class</th>
                  </tr>
                </thead>
                <tbody>${learnerRows}</tbody>
              </table>
            </div>
          </article>
        </section>

        <section class="school-tab" data-school-content="teachers">
          <article class="panel-card school-table-card">
            <h3>Teachers</h3>
            <p>Teachers assigned through the school's classes.</p>
            <div class="school-table-wrap">
              <table class="school-table">
                <thead>
                  <tr>
                    <th>Teacher</th>
                    <th>Classes</th>
                  </tr>
                </thead>
                <tbody>${teacherRows}</tbody>
              </table>
            </div>
          </article>
        </section>

        <section class="school-tab" data-school-content="classes">
          <article class="panel-card school-table-card">
            <h3>Classes</h3>
            <p>Classes currently connected to this school.</p>
            <div class="school-table-wrap">
              <table class="school-table">
                <thead>
                  <tr>
                    <th>Class</th>
                    <th>Teacher</th>
                    <th>Learners</th>
                  </tr>
                </thead>
                <tbody>${classRows}</tbody>
              </table>
            </div>
          </article>
        </section>

        <section class="school-tab" data-school-content="results">
          <article class="panel-card school-table-card">
            <h3>Assessment results</h3>
            <p>Recorded results from the existing learning data.</p>
            <div class="school-table-wrap">
              <table class="school-table">
                <thead>
                  <tr>
                    <th>Assessment</th>
                    <th>Learner</th>
                    <th>Score</th>
                  </tr>
                </thead>
                <tbody>${resultRows}</tbody>
              </table>
            </div>
          </article>
        </section>

        <div class="school-tools">
          <button class="panel-action" data-panel-action="meetings">
            Open Meetings
          </button>

          <button class="panel-action" data-panel-action="school-ai-lab">
            Open AI Lab
          </button>

          <button class="panel-action secondary" data-panel-action="school-dashboard">
            Refresh
          </button>
        </div>

        <div class="panel-actions">
          <button class="panel-action secondary" data-action="close">
            Close School Space
          </button>
        </div>

      </div>
    `;

    document.querySelectorAll("[data-school-tab]").forEach(function (button) {
      button.addEventListener("click", function () {
        const tab = button.dataset.schoolTab;

        document.querySelectorAll("[data-school-tab]").forEach(function (item) {
          item.classList.toggle("active", item === button);
        });

        document.querySelectorAll("[data-school-content]").forEach(function (section) {
          section.classList.toggle(
            "active",
            section.dataset.schoolContent === tab
          );
        });
      });
    });
  }

  function renderAboutDream() {
    return `
      <div class="de-workspace de-about-dream">
        <section class="de-section de-highlight de-about-hero">
          <span class="de-eyebrow">OUR PURPOSE · OUR FUTURE</span>
          <h2>Education that understands the learner.</h2>
          <p>A vision for more accessible, personal and adaptive education — connecting learners, teachers, parents and schools in one learning environment.</p>
          <div class="de-actions">
            <button type="button" class="de-action" data-about-jump="vision">Our vision</button>
            <button type="button" class="de-action primary" data-about-jump="learning-cycle">How it works ↓</button>
          </div>
        </section>

        <section class="de-section de-about-section" id="de-about-vision">
          <span class="de-eyebrow">01 / THE VISION</span>
          <h3>Learning without unnecessary barriers.</h3>
          <p>Dream Education aims to make quality learning more accessible, regardless of where a person lives or their financial circumstances. Our goal is to use technology to make learning more personal, understandable and effective.</p>
          <div class="de-list">
            <div class="de-list-item"><strong>A global learning vision</strong><span>Built with the needs of Kenyan learners in mind, with the ambition to serve a wider global learning community.</span></div>
            <div class="de-list-item"><strong>Our mission</strong><span>Build an accessible, intelligent and adaptive learning platform that helps people learn better and gives educational communities better ways to support progress.</span></div>
          </div>
        </section>

        <section class="de-section de-about-section" id="de-about-learning-cycle">
          <span class="de-eyebrow">02 / THE LEARNING CYCLE</span>
          <h3>Not just answers. Real understanding.</h3>
          <p>The platform is designed around a continuous learning cycle: understand what a learner knows, identify gaps, provide relevant teaching, assess progress and guide the next learning step.</p>
          <div class="de-list">
            <div class="de-list-item"><strong>01 · Understand</strong><span>Start with a learner's question, topic or current understanding.</span></div>
            <div class="de-list-item"><strong>02 · Teach</strong><span>Provide explanations and learning materials suited to the topic and learner.</span></div>
            <div class="de-list-item"><strong>03 · Assess</strong><span>Check the learner's response and look for evidence of understanding.</span></div>
            <div class="de-list-item"><strong>04 · Adapt</strong><span>Use learning evidence to guide the next appropriate step.</span></div>
          </div>
        </section>

        <section class="de-section de-about-section" id="de-about-community">
          <span class="de-eyebrow">03 / ONE LEARNING COMMUNITY</span>
          <h3>Everyone has a role in education.</h3>
          <div class="de-list">
            <div class="de-list-item"><strong>Learners</strong><span>Explore subjects, practise skills and build understanding.</span></div>
            <div class="de-list-item"><strong>Teachers</strong><span>Guide learning, support learners and follow progress.</span></div>
            <div class="de-list-item"><strong>Parents</strong><span>Stay connected to children's learning and progress.</span></div>
            <div class="de-list-item"><strong>Schools</strong><span>Bring learning, teaching and educational support into a connected environment.</span></div>
            <div class="de-list-item"><strong>Meetings and communication</strong><span>Help the people around learning collaborate and stay connected.</span></div>
          </div>
        </section>

        <section class="de-section de-about-section" id="de-about-commitment">
          <span class="de-eyebrow">04 / OUR COMMITMENT</span>
          <h3>Technology should serve learning.</h3>
          <div class="de-list">
            <div class="de-list-item"><strong>Accuracy and evidence</strong><span>Work toward reliable information supported by relevant evidence and sources.</span></div>
            <div class="de-list-item"><strong>Adaptability</strong><span>Support different learning needs, levels and approaches.</span></div>
            <div class="de-list-item"><strong>Accessibility</strong><span>Make learning easier to reach and use across the learning community.</span></div>
            <div class="de-list-item"><strong>Continuous improvement</strong><span>Improve the platform through testing, feedback and responsible development.</span></div>
          </div>
          <p>These are the standards Dream Education is working toward, not a claim that every feature or outcome is already perfect.</p>
        </section>

        <section class="de-section de-about-section" id="de-about-founder">
          <span class="de-eyebrow">05 / THE FOUNDER'S STORY</span>
          <h3>A vision worth building.</h3>
          <p>Dream Education is being developed around a simple idea: education can do more than deliver information. It can help people understand, practise, receive feedback and keep improving. The founder's story is part of that journey — building toward a future where more learners have opportunities to grow.</p>
          <div class="de-about-signoff">
            <strong>Dream bigger. Learn deeper.</strong>
            <span>Learn better. Understand deeper. Grow further.</span>
          </div>
        </section>

        <section class="de-section de-about-section" id="de-about-platform-tour">
          <span class="de-eyebrow">06 / EXPLORE DREAM EDUCATION</span>
          <h3>See the platform in action.</h3>
          <p>Move from the idea to the actual workspace. Each button opens an existing Dream Education experience; it does not claim that every workflow is perfect or that outcomes are guaranteed.</p>
          <div class="de-actions">
            <button type="button" class="de-action primary" data-about-workspace="learn">Open Learn</button>
            <button type="button" class="de-action" data-about-workspace="teacher">Open Teach</button>
            <button type="button" class="de-action" data-about-workspace="school">Open School</button>
            <button type="button" class="de-action" data-about-workspace="tools">Open AI Lab</button>
            <button type="button" class="de-action" data-about-workspace="search">Try Dream Search</button>
            <button type="button" class="de-action" data-about-workspace="invest" hidden>Explore Dream Invest</button>
            <button type="button" class="de-action" data-panel-action="subscription">View plans</button>
          </div>
        </section>

        <section class="de-section de-highlight de-about-cta">
          <h3>Ready to explore?</h3>
          <p>Discover the learning, teaching and connection spaces available in Dream Education.</p>
          <div class="de-actions">
            <button type="button" class="de-action primary" data-about-explore>Explore Dream Education →</button>
            <button type="button" class="de-action" data-action="close">Close About Dream</button>
          </div>
        </section>
      </div>
    `;
  }

  function openPanel(name) {
    const existingAuth = getAuth();

    // The landing-page Learn entry must open the real learner workspace,
    // where the button hub and searchable vertical media feed live.
    // Do not leave authenticated learners on the old placeholder cards.
    if (name === "learn" && existingAuth && existingAuth.account) {
      const workspaceButton = document.querySelector("[data-de-workspace]");
      if (workspaceButton) {
        workspaceButton.click();
        return;
      }
    }

    if (name === "connect" && window.DreamEducationSearch) {
      // Connect remains the entry point; Authorized Search is rendered only
      // when the authenticated owner account is present.
    }

    if ((name === "signin" || name === "join") && existingAuth) {
      renderAuthenticatedPanel(existingAuth);
      return;
    }

    const experience = experiences[name];

    if (!experience || !panel) {
      return;
    }

    panelKicker.textContent = experience.kicker || "";
    panelTitle.textContent = experience.title || "";
    panelDescription.textContent = experience.description || "";

    let body = "";

    if (experience.form) {
      body = renderAuthForm(experience.form);
    } else if (name === "books") {
      body = typeof window.renderBooksReading === "function" ? window.renderBooksReading() : '<p>Books are loading. Please try again.</p>';
    } else if (name === "about") {
      body = renderAboutDream();
    } else {
      body += renderCards(experience.cards);
      body += renderActions(experience);
    }

    panelBody.innerHTML = body;

    setMenuOpen(false);
    document.body.classList.add("panel-open");
    panel.setAttribute("aria-hidden", "false");

    updateLearnerFieldsVisibility();
  }

  // About Dream section controls stay inside the existing experience panel.
  document.addEventListener("click", function (event) {
    const jump = event.target.closest("[data-about-jump]");
    if (jump) {
      const sectionName = jump.getAttribute("data-about-jump");
      const target = document.getElementById("de-about-" + sectionName);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    const workspace = event.target.closest("[data-about-workspace]");
    if (workspace) {
      const destination = workspace.getAttribute("data-about-workspace");
      if (destination === "learn") openPanel("learn");
      else if (destination === "teacher" && typeof openTeacherLessonStudio === "function") openTeacherLessonStudio();
      else if (destination === "school" && typeof openSchoolDashboard === "function") openSchoolDashboard();
      else if (destination === "tools") openPanel("tools");
      else if (destination === "search") {
        closePanel();
        const searchSection = document.getElementById("dream-search");
        const searchInput = document.getElementById("dream-search-input");
        if (searchSection) searchSection.scrollIntoView({ behavior: "smooth", block: "start" });
        if (searchInput) searchInput.focus({ preventScroll: true });
      } else if (destination === "invest") {
        closePanel();
        const investButton = document.querySelector("[data-dream-invest-open]");
        if (investButton) investButton.click();
      }
      return;
    }

    const explore = event.target.closest("[data-about-explore]");
    if (explore) {
      openPanel("explore");
    }
  });

  function closePanel() {
    if (!panel) {
      return;
    }

    document.body.classList.remove("panel-open");
    panel.setAttribute("aria-hidden", "true");
  }

  function setMenuOpen(isOpen) {
    const open = Boolean(isOpen);
    document.body.classList.toggle("menu-open", open);
    if (mobileDrawer) {
      mobileDrawer.setAttribute("aria-hidden", String(!open));
      mobileDrawer.inert = !open;
    }
    if (mobileMenu) {
      mobileMenu.setAttribute("aria-expanded", String(open));
      mobileMenu.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    }
  }

  function toggleMenu() {
    setMenuOpen(!document.body.classList.contains("menu-open"));
  }

  function setAuthMessage(form, message, error) {
    const box = form.querySelector("[data-auth-message]");

    if (!box) {
      return;
    }

    box.textContent = message || "";
    box.style.display = message ? "block" : "none";
    box.style.marginTop = "15px";
    box.style.fontSize = "12px";
    box.style.lineHeight = "1.5";
    box.style.color = error ? "#ff9b9b" : "#dfff63";
  }

  function setFormBusy(form, busy) {
    const submit = form.querySelector('button[type="submit"]');

    if (!submit) {
      return;
    }

    submit.disabled = busy;
    submit.style.opacity = busy ? ".55" : "1";
    submit.textContent = busy
      ? "Please wait..."
      : form.dataset.authForm === "login"
        ? "Sign in"
        : "Create account";
  }

  function updateLearnerFieldsVisibility() {
    const role = document.getElementById("auth-role");
    const fields = document.querySelector(".auth-learner-fields");

    if (!role || !fields) {
      return;
    }

    fields.style.display =
      role.value === "learner" ? "block" : "none";
  }

  async function submitLogin(form) {
    const email = String(form.elements.email.value || "").trim();
    const password = String(form.elements.password.value || "");

    if (!email || !password) {
      setAuthMessage(form, "Email and password are required.", true);
      return;
    }

    setFormBusy(form, true);
    setAuthMessage(form, "Signing in...", false);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: email,
          password: password
        })
      });

      const data = await response.json().catch(function () {
        return {
          success: false,
          error: "The server returned an invalid response."
        };
      });

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Login failed.");
      }

      saveAuth(data);
      renderAuthenticatedPanel(data);
    } catch (error) {
      console.error("Login error:", error);
      setAuthMessage(
        form,
        error.message || "Unable to sign in.",
        true
      );
      setFormBusy(form, false);
    }
  }

  async function submitRegister(form) {
    const name = String(form.elements.name.value || "").trim();
    const email = String(form.elements.email.value || "").trim();
    const password = String(form.elements.password.value || "");
    const role = String(form.elements.role.value || "learner").trim();

    if (!name || !email || !password) {
      setAuthMessage(
        form,
        "Name, email and password are required.",
        true
      );
      return;
    }

    if (password.length < 6) {
      setAuthMessage(
        form,
        "Password must be at least 6 characters.",
        true
      );
      return;
    }

    const payload = {
      name: name,
      email: email,
      password: password,
      role: role
    };

    if (role === "learner") {
      payload.level = String(form.elements.level.value || "").trim();
      payload.grade = String(form.elements.grade.value || "").trim();
      payload.school = String(form.elements.school.value || "").trim();
    }

    setFormBusy(form, true);
    setAuthMessage(form, "Creating your account...", false);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json().catch(function () {
        return {
          success: false,
          error: "The server returned an invalid response."
        };
      });

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Registration failed.");
      }

      saveAuth(data);
      renderAuthenticatedPanel(data);
    } catch (error) {
      console.error("Registration error:", error);
      setAuthMessage(
        form,
        error.message || "Unable to create the account.",
        true
      );
      setFormBusy(form, false);
    }
  }

  document.addEventListener("submit", function (event) {
  const form = event.target.closest("#teacher-connection-search-form");

  if (!form) return;

  searchTeacherConnectionPeople(event);
});

document.addEventListener("click", function (event) {
    const connectionElement =
      event.target.closest("[data-connection-action]");

    if (!connectionElement) return;

    const action =
      connectionElement.dataset.connectionAction;

    if (action === "view-learner") {
      const learnerId =
        connectionElement.dataset.learnerId;

      if (typeof openTeacherLearnerView === "function") {
        openTeacherLearnerView(learnerId);
      }

      return;
    }

    if (action === "send-request") {
      const learnerId =
        connectionElement.dataset.learnerId;

      if (
        typeof sendTeacherConnectionRequestForLearner ===
        "function"
      ) {
        sendTeacherConnectionRequestForLearner(
          learnerId,
          connectionElement
        );
      }

      return;
    }

    if (
      action === "approve" ||
      action === "reject"
    ) {
      const connectionId =
        connectionElement.dataset.connectionId;

      const status =
        action === "approve"
          ? "active"
          : "rejected";

      if (
        connectionId &&
        typeof updateTeacherConnection === "function"
      ) {
        updateTeacherConnection(
          connectionId,
          status
        );
      }
    }
  });

  // Primary landing navigation: direct delegation from document keeps dynamically injected
  // next-generation role cards and the original landing buttons on the same navigation path.
  document.addEventListener("click", function (event) {
    const trigger = event.target && event.target.closest
      ? event.target.closest("[data-action]")
      : null;
    if (!trigger) return;

    const action = trigger.dataset.action;

    if (action === "open") {
      const targetPanel = trigger.dataset.panel || "learn";
      const auth = window.DreamEducationUI && window.DreamEducationUI.getAuth
        ? window.DreamEducationUI.getAuth()
        : null;

      if (targetPanel === "learn" && auth && auth.success) {
        if (typeof openLearnerDashboard === "function") {
          openLearnerDashboard();
        } else {
          openPanel(targetPanel);
        }
        return;
      }

      if (
        targetPanel === "teach" &&
        auth &&
        auth.success &&
        String(auth.role || (auth.account && auth.account.role) || "").toLowerCase() === "teacher"
      ) {
        if (typeof openTeacherDashboard === "function") {
          openTeacherDashboard();
        } else {
          openPanel(targetPanel);
        }
        return;
      }

      openPanel(targetPanel);
      return;
    }

    if (action === "parent-child") {
      const learnerId = trigger.dataset.learnerId;
      if (typeof openParentChildOverview === "function") {
        openParentChildOverview(learnerId);
      }
      return;
    }

    if (action === "close") {
      closePanel();
      return;
    }

    if (action === "home") {
      closePanel();
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (action === "menu") {
      toggleMenu();
    }
  });

  document.addEventListener("change", function (event) {
    if (event.target && event.target.id === "auth-role") {
      updateLearnerFieldsVisibility();
    }
  });

  document.addEventListener("submit", function (event) {
    const form = event.target.closest("[data-auth-form]");
    if (!form) return;

    event.preventDefault();

    if (form.dataset.authForm === "login") {
      submitLogin(form);
      return;
    }

    if (form.dataset.authForm === "register") {
      submitRegister(form);
    }
  });

  document.addEventListener("click", function (event) {
    const button = event.target.closest("[data-panel-action]");
    if (!button) return;

    const action = button.dataset.panelAction;

    // Dynamic sign-in prompts use the shared panel-action dispatcher.
    if (action === "signin") {
      openPanel("signin");
      return;
    }

    if (action === "owner-control-room") {
      openOwnerControlRoom();
      return;
    }

    if (action === "close") {
      closePanel();
      return;
    }

    if (action === "subscription") {
      if (typeof openSubscription === "function") {
        openSubscription();
      }
      return;
    }

    if (action === "primary") {
      const currentTitle =
        document.getElementById("panel-title")?.textContent || "";

      if (currentTitle.trim().toLowerCase() === "start learning.") {
        // A logged-out visitor must authenticate instead of pressing a
        // dead "Enter learning" button.
        openPanel("signin");
        return;
      }

      if (currentTitle.trim() === "Education, together.") {
        openSchoolDashboard();
        return;
      }

      if (
        currentTitle.trim().toLowerCase() === "stay connected." &&
        typeof openTeacherConnections === "function"
      ) {
        openTeacherConnections();
      }

      return;
    }

    if (action === "optional-features") {
      if (window.DreamInvestAccess && typeof window.DreamInvestAccess.openSettings === "function") {
        window.DreamInvestAccess.openSettings();
      } else {
        openPanel("OPTIONAL FEATURES", "Settings unavailable", "Please refresh Dream Education and try again.");
      }
      return;
    }

    if (action === "code-generator" || action === "coding-lab") {
      if (window.openCodingLab && typeof window.openCodingLab === "function") {
        window.openCodingLab();
      } else {
        window.location.href = "/code-generator/index.html";
      }
      return;
    }

    if (action === "coding-learning") {
      if (window.openCodingLearning && typeof window.openCodingLearning === "function") {
        window.openCodingLearning();
      }
      return;
    }

    if (action === "media-studio") {
      if (window.DreamMediaStudio && typeof window.DreamMediaStudio.open === "function") {
        window.DreamMediaStudio.open();
      } else {
        console.error("Dream Education Media Studio module is not loaded.");
      }
      return;
    }

    if (action === "ai-problem-solving") {
      openPanel("learn");
      return;
    }

    if (action === "ai-knowledge-discovery") {
      closePanel();
      const searchSection = document.getElementById("dream-search");
      const searchInput = document.getElementById("dream-search-input");
      if (searchSection) searchSection.scrollIntoView({ behavior: "smooth", block: "start" });
      if (searchInput) searchInput.focus({ preventScroll: true });
      return;
    }

    if (action === "meetings") {
      const openMeetingsWorkspace = window.DreamEducationMeetings?.open;
      if (typeof openMeetingsWorkspace === "function") {
        openMeetingsWorkspace();
      } else {
        console.error("Dream Education Meetings workspace is not available.");
        const panelTitle = document.getElementById("panel-title");
        const panelBody = document.getElementById("panel-body");
        if (panelTitle && panelBody) {
          panelTitle.textContent = "Meetings unavailable";
          panelBody.innerHTML = '<section class="panel-card"><h3>Meetings could not open</h3><p>Please refresh Dream Education and try again.</p></section>';
          document.body.classList.add("panel-open");
        }
      }
      return;
    }

    if (action === "parent-space") {
      if (typeof openParentSpace === "function") {
        openParentSpace();
      }
      return;
    }

    if (action === "universal-connector") {
      if (typeof openUniversalConnector === "function") openUniversalConnector();
      return;
    }

    if (action === "general-connections") {
  if (typeof openGeneralConnections === "function") {
    openGeneralConnections();
  }
  return;
}

if (action === "chat") {
      if (
        window.DreamEducationChat &&
        typeof window.DreamEducationChat.open === "function"
      ) {
        window.DreamEducationChat.open();
      }
      return;
    }

    if (action === "school-dashboard") {
      openSchoolDashboard();
      return;
    }

    if (action === "school-ai-lab") {
      closePanel();
      setTimeout(function () {
        openPanel("tools");
      }, 150);
      return;
    }

    if (action === "teacher-lesson-studio") {
      openTeacherLessonStudio();
      return;
    }

    if (action === "teacher-analytics") {
      if (typeof openTeacherAnalytics === "function") {
        openTeacherAnalytics();
      }
      return;
    }

    if (action === "teacher-connections") {
      if (typeof openTeacherConnections === "function") {
        openTeacherConnections();
      }
      return;
    }


    if (action === "teacher-dashboard") {
      if (
        window.DreamEducationTeacher &&
        typeof window.DreamEducationTeacher.openDashboard === "function"
      ) {
        window.DreamEducationTeacher.openDashboard();
      }
      return;
    }

    if (action === "refresh-teacher-dashboard") {
      if (
        window.DreamEducationTeacher &&
        typeof window.DreamEducationTeacher.openDashboard === "function"
      ) {
        window.DreamEducationTeacher.openDashboard();
      }
      return;
    }

    if (action === "adaptive-learning") {
      if (typeof openAdaptiveQuestion === "function") {
        openAdaptiveQuestion();
      }
      return;
    }

    if (action === "multimodal-learning") {
      if (typeof openMultimodalLearning === "function") {
        openMultimodalLearning();
      }
      return;
    }

    if (action === "ask-dream") {
        if (
          window.DreamEducationLearner &&
          typeof window.DreamEducationLearner.openAsk === "function"
        ) {
          window.DreamEducationLearner.openAsk();
        }
        return;
      }

    if (action === "logout") {
      clearAuth();
      closePanel();
      return;
    }

    if (action === "continue-auth") {
      const continueAuth =
        window.DreamEducationUI &&
        window.DreamEducationUI.getAuth
          ? window.DreamEducationUI.getAuth()
          : null;

      const continueRole =
        continueAuth &&
        (
          continueAuth.role ||
          (
            continueAuth.account &&
            continueAuth.account.role
          )
        );

      if (isOwnerAccount(continueAuth)) {
        openOwnerControlRoom();
        return;
      }

      if (String(continueRole).toLowerCase() === "learner") {
        openAdaptiveQuestion();
        return;
      }

      if (String(continueRole).toLowerCase() === "teacher") {
        if (
          window.DreamEducationTeacher &&
          typeof window.DreamEducationTeacher.openDashboard === "function"
        ) {
          window.DreamEducationTeacher.openDashboard();
        }
        return;
      }

      closePanel();

      const auth = getAuth();
      const role =
        auth &&
        (auth.role ||
          (auth.account && auth.account.role)) ||
        "learner";

      let target = "learn";

      if (role === "teacher") target = "teach";
      if (role === "parent") target = "connect";
      if (role === "school") target = "school";

      setTimeout(function () {
        openPanel(target);
      }, 250);

      return;
    }
  });

  if (backdrop) {
    backdrop.addEventListener("click", closePanel);
  }

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      closePanel();
      setMenuOpen(false);
    }
  });

  if (mobileDrawer) {
    mobileDrawer.addEventListener("click", function (event) {
      const trigger = event.target.closest("[data-action]");
      if (!trigger) return;

      setMenuOpen(false);

      if (trigger.dataset.action === "open") {
        const targetPanel = trigger.dataset.panel || "learn";
        const auth =
          window.DreamEducationUI &&
          window.DreamEducationUI.getAuth
            ? window.DreamEducationUI.getAuth()
            : null;

        if (targetPanel === "learn" && auth && auth.success) {
          openLearnerDashboard();
          return;
        }

        openPanel(targetPanel);
      }
    });
  }

  // Keep saved sessions alive by rotating Supabase tokens before access-token expiry.
  // Network failures are retried without discarding a still-stored session.
  let sessionRefreshTimer = null;
  let sessionRefreshInFlight = false;

  function accessTokenExpiryMs(token) {
    try {
      const payloadPart = String(token || "").split(".")[1];
      if (!payloadPart) return 0;
      const normalized = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
      const payload = JSON.parse(atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=")));
      return Number(payload.exp || 0) * 1000;
    } catch (error) {
      return 0;
    }
  }

  function scheduleSavedSessionRefresh(auth, delayOverride) {
    if (sessionRefreshTimer) {
      clearTimeout(sessionRefreshTimer);
      sessionRefreshTimer = null;
    }

    if (!auth || !auth.success || !auth.session || !auth.session.refresh_token) return;

    const expiry = accessTokenExpiryMs(auth.session.access_token);
    const delay = Number.isFinite(delayOverride)
      ? Math.max(1000, delayOverride)
      : expiry
        ? Math.max(1000, expiry - Date.now() - 120000)
        : 1000;

    sessionRefreshTimer = setTimeout(function () {
      renewSavedSession();
    }, Math.min(delay, 2147480000));
  }

  async function renewSavedSession() {
    if (sessionRefreshInFlight) return;
    const auth = getAuth();

    if (!auth || !auth.success || !auth.session || !auth.session.refresh_token) return;

    sessionRefreshInFlight = true;
    try {
      const response = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: auth.session.refresh_token })
      });
      const data = await response.json().catch(function () { return {}; });

      if (response.ok && data.success && data.session && data.session.access_token && data.session.refresh_token) {
        saveAuth(data);
        scheduleSavedSessionRefresh(data);
        return;
      }

      // Only clear a session when the server explicitly rejects the refresh token
      // or confirms that this account is no longer linked. Keep it on transient failures.
      if (response.status === 400 || response.status === 401 || response.status === 403) {
        clearAuth();
        return;
      }

      scheduleSavedSessionRefresh(auth, 60000);
    } catch (error) {
      console.warn("Dream Education session refresh will be retried:", error);
      scheduleSavedSessionRefresh(auth, 60000);
    } finally {
      sessionRefreshInFlight = false;
    }
  }

  function initializePersistentSession() {
    const auth = getAuth();
    if (!auth || !auth.success || !auth.session || !auth.session.refresh_token) return;

    const expiry = accessTokenExpiryMs(auth.session.access_token);
    if (!expiry || expiry <= Date.now() + 120000) {
      renewSavedSession();
    } else {
      scheduleSavedSessionRefresh(auth);
    }
  }

  const savedAuth = getAuth();

  if (savedAuth && savedAuth.success) {
    const account =
      savedAuth.account ||
      {};

    const role =
      savedAuth.role ||
      account.role ||
      "learner";

    document.body.dataset.authenticated = "true";
    document.body.dataset.role = role;
  }

  window.DreamEducationUI = {
    openPanel,
    closePanel,
    getAuth,
    clearAuth,
    experiences
  };

  initializePersistentSession();

})();

async function fetchWithTimeout(input, options, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(function () {
    controller.abort();
  }, Number(timeoutMs) || 8000);

  const requestOptions = Object.assign({}, options || {}, {
    signal: controller.signal
  });

  try {
    return await fetch(input, requestOptions);
  } finally {
    clearTimeout(timeout);
  }
}

/* ============================================================
   TEACHER DASHBOARD — BACKEND INTEGRATION
   Uses the authenticated teacher account.
   ============================================================ */

async function fetchTeacherDashboard() {
  const auth =
    window.DreamEducationUI &&
    window.DreamEducationUI.getAuth
      ? window.DreamEducationUI.getAuth()
      : null;

  if (!auth || !auth.success) {
    return {
      success: false,
      error: "Please sign in first."
    };
  }

  const account = auth.account || {};
  const profile = auth.profile || {};
  const teacherId =
    account.teacher_id ||
    profile.teacher_id ||
    auth.teacher_id ||
    "";

  const token =
    auth.session &&
    auth.session.access_token
      ? auth.session.access_token
      : "";

  if (!teacherId) {
    return {
      success: false,
      error: "No teacher account ID was found."
    };
  }

  if (!token) {
    return {
      success: false,
      error: "Your authenticated session token is missing. Please sign in again."
    };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(function () {
      controller.abort();
    }, 10000);

    const response = await fetchWithTimeout(
      "/api/product/teacher/" +
        encodeURIComponent(teacherId) +
        "/dashboard",
      {
        method: "GET",
        headers: {
          "Authorization": "Bearer " + token
        },
        signal: controller.signal
      }
    );

    clearTimeout(timeout);

    const responseText = await response.text();

    let data;

    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      return {
        success: false,
        error: "The server returned an invalid JSON response."
      };
    }

    if (!response.ok || !data.success) {
      throw new Error(
        data.error || "Unable to load the teacher dashboard."
      );
    }

    return data;
  } catch (error) {
    console.error("Teacher dashboard error:", error);

    return {
      success: false,
      error:
        error.message ||
        "Unable to load the teacher dashboard."
    };
  }
}

function teacherDashboardMarkup(data) {
  const teacherEscapeHTML = function (value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };


  const teacher = data.teacher || {};
  const classes = Array.isArray(data.classes) ? data.classes : [];
  const learners = Array.isArray(data.learners) ? data.learners : [];
  const results = Array.isArray(data.results) ? data.results : [];
  const analytics = data.analytics || {};

  const teacherName = String(
    teacher.name || teacher.full_name || "Teacher"
  );

  const totalClasses = Number(analytics.total_classes) || classes.length;
  const totalLearners = Number(analytics.total_learners) || learners.length;
  const totalAssessments = Number(analytics.total_assessments) || results.length;
  const averageScore = Number(analytics.average_score) || 0;

  const classCards = classes.length
    ? classes.map(function (item) {
        const className = String(
          item && (item.name || item.class_name || item.class_id)
            ? (item.name || item.class_name || item.class_id)
            : "Class"
        );

        const learnerCount =
          item && Array.isArray(item.learners)
            ? item.learners.length
            : 0;

        return `
          <article class="teacher-dashboard-card">
            <div class="teacher-dashboard-card-label">CLASS</div>
            <h3>${teacherEscapeHTML(className)}</h3>
            <p>${learnerCount} learner${learnerCount === 1 ? "" : "s"}</p>
          </article>
        `;
      }).join("")
    : `
        <article class="teacher-dashboard-card empty">
          <h3>No classes yet</h3>
          <p>Your assigned classes will appear here.</p>
        </article>
      `;

  const learnerCards = learners.length
    ? learners.slice(0, 12).map(function (learner) {
        const name = String(
          learner && (learner.name || learner.full_name || learner.learner_id)
            ? (learner.name || learner.full_name || learner.learner_id)
            : "Learner"
        );

        const level = String(
          learner && (learner.level || learner.grade)
            ? (learner.level || learner.grade)
            : ""
        );

        return `
          <article class="teacher-dashboard-card teacher-learner-card"
            data-teacher-learner-id="${teacherEscapeHTML(learner.learner_id || "")}"
            role="button"
            tabindex="0">
            <div class="teacher-dashboard-card-label">LEARNER</div>
            <h3>${teacherEscapeHTML(name)}</h3>
            <p>${teacherEscapeHTML(level)}</p>
          </article>
        `;
      }).join("")
    : `
        <article class="teacher-dashboard-card empty">
          <h3>No learners yet</h3>
          <p>Learners connected to your classes will appear here.</p>
        </article>
      `;

  const resultRows = results.length
    ? results.slice(-8).reverse().map(function (result) {
        const learnerName = String(
          result && (result.learner_name || result.name || result.learner_id)
            ? (result.learner_name || result.name || result.learner_id)
            : "Learner"
        );

        const score = Number(result && result.score);

        return `
          <div class="teacher-result-row">
            <span>${teacherEscapeHTML(learnerName)}</span>
            <strong>${Number.isFinite(score) ? score + "%" : "—"}</strong>
          </div>
        `;
      }).join("")
    : `
        <div class="teacher-result-empty">
          No assessment results yet.
        </div>
      `;

  return `
    <section class="teacher-dashboard">

      <div class="teacher-dashboard-header">
        <div>
          <div class="teacher-dashboard-kicker">TEACHER DASHBOARD</div>
          <h2>Welcome, ${teacherEscapeHTML(teacherName)}.</h2>
          <p>Manage your classes, follow learners and review learning results.</p>
        </div>
      </div>

      <div class="teacher-dashboard-section teacher-send-request">
        <div class="teacher-dashboard-section-heading">
          <div>
            <span class="teacher-dashboard-card-label">NEW CONNECTION</span>
            <h3>Find a learner</h3>
            <p>Search by name, email, or learner ID.</p>
          </div>
        </div>

        <form
          class="teacher-connection-search-form"
          id="teacher-connection-search-form">

          <label
            class="teacher-request-label"
            for="teacher-connection-search">
            Search for a learner
          </label>

          <div class="teacher-search-row">
            <input
              class="panel-input teacher-request-input"
              id="teacher-connection-search"
              name="q"
              type="search"
              placeholder="Enter learner name, email, or ID"
              autocomplete="off"
              required
            />

            <button
              class="panel-button primary"
              type="submit">
              Search
            </button>
          </div>

          <div
            class="teacher-search-results"
            id="teacher-connection-search-results"
            aria-live="polite">
          </div>
        </form>
      </div>

      <div class="teacher-dashboard-stats">
        <article class="teacher-stat-card">
          <span>Classes</span>
          <strong>${totalClasses}</strong>
        </article>

        <article class="teacher-stat-card">
          <span>Learners</span>
          <strong>${totalLearners}</strong>
        </article>

        <article class="teacher-stat-card">
          <span>Assessments</span>
          <strong>${totalAssessments}</strong>
        </article>

        <article class="teacher-stat-card">
          <span>Average score</span>
          <strong>${averageScore}%</strong>
        </article>
      </div>

      <div class="teacher-dashboard-section">
        <div class="teacher-dashboard-section-heading">
          <h3>Your classes</h3>
          <span>${totalClasses}</span>
        </div>

        <div class="teacher-dashboard-grid">
          ${classCards}
        </div>
      </div>

      <div class="teacher-dashboard-section">
        <div class="teacher-dashboard-section-heading">
          <h3>Your learners</h3>
          <span>${totalLearners}</span>
        </div>

        <div class="teacher-dashboard-grid">
          ${learnerCards}
        </div>
      </div>

      <div class="teacher-dashboard-section">
        <div class="teacher-dashboard-section-heading">
          <h3>Assessment results</h3>
          <span>${totalAssessments}</span>
        </div>

        <div class="teacher-results-list">
          ${resultRows}
        </div>
      </div>

      <div class="panel-actions teacher-dashboard-actions">
        <button
          class="panel-button primary"
          type="button"
          data-panel-action="teacher-lesson-studio">
          Lesson Plans & Assessments
        </button>

        <button
          class="panel-button primary"
          type="button"
          data-panel-action="teacher-analytics">
          Analytics & Results
        </button>

        <button
          class="panel-button primary"
          type="button"
          data-panel-action="teacher-connections">
          Connections
        </button>

        <button
          class="panel-button primary"
          type="button"
          data-panel-action="refresh-teacher-dashboard">
          Refresh dashboard
        </button>

        <button
          class="panel-button"
          type="button"
          data-panel-action="close-dashboard">
          Close
        </button>
      </div>

    </section>
  `;
}




async function openOwnerControlRoom() {
  const panel = document.getElementById("experience-panel");
  const body = document.getElementById("panel-body");
  const kicker = document.getElementById("panel-kicker");
  const title = document.getElementById("panel-title");
  const description = document.getElementById("panel-description");
  if (!panel || !body) return;
  kicker.textContent = "DREAM EDUCATION · OWNER";
  title.textContent = "Owner Control Room";
  description.textContent = "Open the existing learner, teacher, parent, school and platform workspaces from your owner account.";
  body.innerHTML = '<section class="panel-card"><h3>Project workspaces</h3><p>Owner access does not change the role or data of other accounts. Choose a workspace to inspect its existing features.</p><div class="panel-actions">' +
    '<button class="panel-button primary" type="button" data-panel-action="adaptive-learning">Open Learner Workspace</button>' +
    '<button class="panel-button primary" type="button" data-panel-action="teacher-lesson-studio">Open Teacher Workspace & Lesson Plans</button>' +
    '<button class="panel-button primary" type="button" data-panel-action="school-dashboard">Open School Workspace</button>' +
    '<button class="panel-button" type="button" data-panel-action="parent-space">Open Parent Workspace</button>' +
    '<button class="panel-button" type="button" data-panel-action="meetings">Open Meetings</button>' +
    '<button class="panel-button" type="button" data-panel-action="universal-connector">Open Universal Connector</button>' +
    '<button class="panel-button" type="button" data-panel-action="authorized-search">Open Authorized Search</button>' +
    '<button class="panel-button" type="button" data-panel-action="close">Close</button>' +
    '</div></section>';
  document.body.classList.add("panel-open");
  panel.setAttribute("aria-hidden", "false");
}

async function openTeacherLessonStudio() {
  const panel = document.getElementById("experience-panel");
  const body = document.getElementById("panel-body");
  const kicker = document.getElementById("panel-kicker");
  const title = document.getElementById("panel-title");
  const description = document.getElementById("panel-description");
  const auth = window.DreamEducationUI && window.DreamEducationUI.getAuth
    ? window.DreamEducationUI.getAuth() : null;
  const token = auth && auth.session && auth.session.access_token || "";
  if (!token) { alert("Please sign in again."); return; }
  if (!panel || !body) return;

  kicker.textContent = "TEACHER WORKSPACE";
  title.textContent = "Lesson Plans & Assessments";
  description.textContent = "Dream prepares a level-matched lesson plan, source-backed notes and topic-specific assessment questions. Review them, then assign the lesson to an actively connected learner.";
  body.innerHTML = '<article class="panel-card"><h3>Opening Lesson Studio…</h3><p>Loading your saved lessons and connected learners.</p></article>';
  document.body.classList.add("panel-open");
  panel.setAttribute("aria-hidden", "false");

  const escape = value => String(value == null ? "" : value).replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character]);
  const request = async (url, options = {}, timeoutMs = 12000) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, Object.assign({}, options, {
        signal: controller.signal,
        headers: Object.assign({ "Authorization": "Bearer " + token }, options.headers || {})
      }));
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.success !== true) throw new Error(data.error || "Lesson Studio request failed.");
      return data;
    } catch (error) {
      if (error && error.name === "AbortError") {
        throw new Error("Lesson preparation did not respond within " + Math.round(timeoutMs / 1000) + " seconds. Please try again; if this repeats, the lesson service needs investigation.");
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  };
  let connectedLearners = [];
  let lessons = [];
  let activeLesson = null;

  function lessonCard(lesson) {
    const steps = lesson.lesson_plan && Array.isArray(lesson.lesson_plan.lesson_steps) ? lesson.lesson_plan.lesson_steps : [];
    const questions = Array.isArray(lesson.assessment_questions) ? lesson.assessment_questions : [];
    const objectives = lesson.lesson_plan && Array.isArray(lesson.lesson_plan.objectives) ? lesson.lesson_plan.objectives : [];
    const assigned = Array.isArray(lesson.assigned_learner_ids) ? lesson.assigned_learner_ids : [];
    const options = connectedLearners.map(learner =>
      '<option value="' + escape(learner.learner_id) + '">' + escape(learner.name) + ' · ' + escape(learner.level || learner.learner_id) + '</option>'
    ).join("");
    return '<article class="teacher-lesson-card" data-teacher-lesson-card="' + escape(lesson.lesson_id || "") + '">' +
      '<div class="teacher-lesson-meta"><span>' + escape(lesson.subject) + '</span><span>' + escape(lesson.level) + '</span><span>' + escape(lesson.duration_minutes) + ' min</span></div>' +
      '<h3>' + escape(lesson.topic) + '</h3>' +
      '<p>' + objectives.slice(0, 2).map(escape).join(" · ") + '</p>' +
      '<div class="teacher-lesson-preparation-grid">' +
      '<section><h4>Prior knowledge</h4><ul>' + ((lesson.lesson_plan && lesson.lesson_plan.prior_knowledge) || []).map(item => '<li>' + escape(item) + '</li>').join("") + '</ul></section>' +
      '<section><h4>Key inquiry questions</h4><ul>' + ((lesson.lesson_plan && lesson.lesson_plan.key_inquiry_questions) || []).map(item => '<li>' + escape(item) + '</li>').join("") + '</ul></section>' +
      '<section><h4>Key vocabulary</h4><ul>' + ((lesson.lesson_plan && lesson.lesson_plan.key_vocabulary) || []).map(item => '<li><strong>' + escape(item.term) + '</strong>: ' + escape(item.meaning) + '</li>').join("") + '</ul></section>' +
      '<section><h4>Teacher preparation & materials</h4><ul>' + (((lesson.lesson_plan && lesson.lesson_plan.teacher_preparation) || []).concat((lesson.lesson_plan && lesson.lesson_plan.materials) || [])).map(item => '<li>' + escape(item) + '</li>').join("") + '</ul></section></div>' +
      '<div class="teacher-lesson-columns"><section><h4>Lesson sequence</h4><ol>' + steps.map(step => '<li><strong>' + escape(step.stage) + ' (' + escape(step.minutes) + ' min)</strong><p><b>Teacher:</b> ' + escape(step.teacher_actions) + '</p><p><b>Learners:</b> ' + escape(step.learner_actions) + '</p>' + (step.checks_for_understanding ? '<p><b>Check:</b> ' + escape(step.checks_for_understanding) + '</p>' : '') + '</li>').join("") + '</ol></section>' +
      '<section><h4>Lesson Notes</h4><button type="button" class="panel-button" data-lesson-notes-open="' + escape(lesson.lesson_id || "") + '">Open Lesson Notes</button><details class="teacher-lesson-notes-panel" data-lesson-notes-panel="' + escape(lesson.lesson_id || "") + '"><summary>Notes from connected free sources</summary><div class="teacher-lesson-notes">' + escape(lesson.notes).replace(/\n/g, "<br>") + '</div></details><h4>Assessment questions (' + questions.length + ')</h4><ol>' + questions.map(question => '<li>' + escape(question.question) + '<p class="teacher-lesson-answer">Answer: ' + escape(question.correct_answer) + '</p></li>').join("") + '</ol></section></div>' +
      '<div class="teacher-lesson-preparation-grid">' +
      '<section><h4>Differentiation</h4><p><strong>Support:</strong></p><ul>' + ((lesson.lesson_plan && lesson.lesson_plan.differentiation && lesson.lesson_plan.differentiation.support) || []).map(item => '<li>' + escape(item) + '</li>').join("") + '</ul><p><strong>Core:</strong></p><ul>' + ((lesson.lesson_plan && lesson.lesson_plan.differentiation && lesson.lesson_plan.differentiation.core) || []).map(item => '<li>' + escape(item) + '</li>').join("") + '</ul><p><strong>Extension:</strong></p><ul>' + ((lesson.lesson_plan && lesson.lesson_plan.differentiation && lesson.lesson_plan.differentiation.extension) || []).map(item => '<li>' + escape(item) + '</li>').join("") + '</ul></section>' +
      '<section><h4>Competencies, values & inclusion</h4><ul>' + (((lesson.lesson_plan && lesson.lesson_plan.competencies_and_values) || []).concat((lesson.lesson_plan && lesson.lesson_plan.safety_and_inclusion) || [])).map(item => '<li>' + escape(item) + '</li>').join("") + '</ul></section>' +
      '<section><h4>Board plan</h4><ul>' + ((lesson.lesson_plan && lesson.lesson_plan.board_plan) || []).map(item => '<li>' + escape(item) + '</li>').join("") + '</ul></section>' +
      '<section><h4>Marking guidance & remediation</h4><ul>' + (((lesson.lesson_plan && lesson.lesson_plan.marking_guidance) || []).concat((lesson.lesson_plan && lesson.lesson_plan.remediation) || [])).map(item => '<li>' + escape(item) + '</li>').join("") + '</ul></section>' +
      '<section><h4>Homework / extended learning</h4><ul>' + (((lesson.lesson_plan && lesson.lesson_plan.homework) || []).concat((lesson.lesson_plan && lesson.lesson_plan.activities) || [])).map(item => '<li>' + escape(item) + '</li>').join("") + '</ul></section>' +
      '<section><h4>Teacher reflection</h4><ul>' + ((lesson.lesson_plan && lesson.lesson_plan.teacher_reflection_questions) || []).map(item => '<li>' + escape(item) + '</li>').join("") + '</ul></section></div>' +
      '<p class="teacher-lesson-source-label">Evidence sources: ' + (Array.isArray(lesson.sources) ? lesson.sources.map(source => source.url ? '<button type="button" class="teacher-lesson-source-open" data-lesson-source-open="' + escape(source.url) + '">Open source: ' + escape(source.title) + '</button>' : escape(source.title)).join(" · ") : "Retrieved knowledge") + '</p>' +
      '<div class="teacher-lesson-assign-row">' +
      (connectedLearners.length ? '<label>Assign to <select data-lesson-learner="' + escape(lesson.lesson_id) + '">' + options + '</select></label><button type="button" class="panel-button primary" data-lesson-assign="' + escape(lesson.lesson_id) + '">Assign lesson</button>' : '<p>Connect a learner first to assign this lesson.</p>') +
      '<button type="button" class="panel-button" data-lesson-submissions="' + escape(lesson.lesson_id) + '">Review submissions</button></div>' +
      '<p class="teacher-lesson-assigned">Assigned to ' + assigned.length + ' learner(s).</p><div data-lesson-feedback="' + escape(lesson.lesson_id) + '" aria-live="polite"></div></article>';
  }

  function render() {
    body.innerHTML = '<div class="teacher-lesson-studio">' +
      '<form id="teacher-lesson-form" class="teacher-dashboard-section teacher-lesson-form">' +
      '<div class="teacher-dashboard-section-heading"><div><span class="teacher-dashboard-card-label">DREAM TEACHING INTELLIGENCE</span><h3>Prepare a complete lesson</h3><p>Dream will retrieve relevant evidence, prepare notes, build lesson steps and create an answer key.</p></div></div>' +
      '<div class="teacher-lesson-form-grid">' +
      '<label>Subject<input name="subject" required maxlength="100" placeholder="e.g. Biology"></label>' +
      '<label>Topic<input name="topic" required maxlength="300" placeholder="e.g. Photosynthesis"></label>' +
      '<label>Class / education level<input name="level" required maxlength="100" placeholder="e.g. Grade 8 / Junior secondary"></label>' +
      '<label>Curriculum/framework<input name="curriculum" maxlength="180" placeholder="e.g. Kenya CBC/CBE, KCSE, Cambridge, university"></label><label>Lesson duration<select name="duration_minutes"><option value="30">30 minutes</option><option value="40" selected>40 minutes</option><option value="60">60 minutes</option><option value="80">80 minutes</option></select></label>' +
      '<label class="teacher-lesson-full">Teaching context or curriculum requirements (optional)<textarea name="instructions" rows="2" maxlength="1200" placeholder="Add curriculum outcomes, language needs, local examples or learner needs."></textarea></label>' +
      '</div><div class="panel-actions"><button class="panel-button primary" type="submit">Prepare lesson with Dream</button><button class="panel-button" type="button" data-lesson-notes-show>Lesson Notes</button><button class="panel-button" type="button" data-panel-action="teacher-dashboard">Back to teacher dashboard</button></div><div id="teacher-lesson-create-feedback" aria-live="polite"></div></form>' +
      '<section class="teacher-dashboard-section"><div class="teacher-dashboard-section-heading"><h3>Saved lesson plans</h3><span>' + lessons.length + '</span></div>' +
      (lessons.length ? lessons.map(lessonCard).join("") : '<div class="teacher-result-empty">No lesson plans yet. Prepare your first lesson above.</div>') +
      '</section></div>';

    const form = document.getElementById("teacher-lesson-form");
    if (form) {
      const notesButton = form.querySelector("[data-lesson-notes-show]");
      if (notesButton) notesButton.addEventListener("click", () => {
        const savedSection = body.querySelector(".teacher-lesson-studio > .teacher-dashboard-section:last-child");
        const firstLesson = savedSection && savedSection.querySelector("[data-teacher-lesson-card]");
        const notes = firstLesson && firstLesson.querySelector("[data-lesson-notes-panel]");
        if (notes) {
          notes.open = true;
          notes.scrollIntoView({ behavior: "smooth", block: "center" });
        } else {
          const feedback = document.getElementById("teacher-lesson-create-feedback");
          if (feedback) feedback.textContent = "Lesson Notes are prepared with each lesson. Prepare a lesson above to generate and display the notes here.";
          const formTop = form.getBoundingClientRect();
          if (formTop) form.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
      form.addEventListener("submit", async event => {
      event.preventDefault();
      const feedback = document.getElementById("teacher-lesson-create-feedback");
      const submit = form.querySelector('button[type="submit"]');
      const originalSubmitLabel = submit.textContent;
      const payload = {
        subject: form.elements.subject.value.trim(),
        topic: form.elements.topic.value.trim(),
        level: form.elements.level.value.trim(),
        duration_minutes: Number(form.elements.duration_minutes.value),
        instructions: form.elements.instructions.value.trim(),
        curriculum: form.elements.curriculum.value.trim()
      };
      submit.disabled = true;
      submit.textContent = "Preparing lesson…";
      feedback.innerHTML = '<p class="teacher-lesson-loading" role="status">Dream is retrieving topic evidence, then preparing the lesson plan, teaching notes and assessment together. The form will stay open while Dream works.</p>';
      try {
        const data = await request("/api/v1/teacher/lessons", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }, 120000);
        lessons.unshift(data.lesson);
        activeLesson = data.lesson;
        render();
        const nextFeedback = document.getElementById("teacher-lesson-create-feedback");
        if (nextFeedback) nextFeedback.innerHTML = '<p class="teacher-lesson-success">Lesson prepared and saved. Your complete lesson, notes and answer key are displayed below.</p>';
        const createdCard = body.querySelector('[data-teacher-lesson-card="' + CSS.escape(String(data.lesson.lesson_id || "")) + '"]');
        if (createdCard) createdCard.scrollIntoView({ behavior: "smooth", block: "start" });
      } catch (error) {
        const message = error && error.name === "AbortError"
          ? "Lesson preparation took longer than expected. Please try again; Dream has not saved an incomplete lesson."
          : error.message;
        feedback.innerHTML = '<p class="teacher-lesson-error">' + escape(message) + '</p>';
        submit.disabled = false;
        submit.textContent = originalSubmitLabel;
      }
      });
    }
  }

  function renderLessonSubmissions(feedback, lessonId, submissions) {
    if (!feedback) return;
    feedback.innerHTML = '<div class="teacher-lesson-submissions"><h4>Learner submissions</h4>' +
      (submissions.length ? submissions.map(submission => {
        const learnerId = escape(submission.learner_id);
        const responses = Array.isArray(submission.responses) ? submission.responses : [];
        const shortAnswers = responses.filter(response => response.type === "short_answer");
        return '<article class="teacher-lesson-submission"><p><strong>' + escape(submission.learner_name) + '</strong> · Total ' + escape(submission.score) + '/' + escape(submission.max_score) + ' · ' + escape(submission.status) + '</p>' +
          '<ol>' + responses.map(response => '<li><strong>' + escape(response.question) + '</strong><p>Learner answer: ' + escape(response.answer || "No answer provided") + '</p>' +
            (response.type === "multiple_choice"
              ? '<p>' + (response.correct ? 'Correct' : 'Incorrect') + ' · Answer key: ' + escape(response.correct_answer) + '</p>'
              : '<label class="teacher-lesson-grade-label">Teacher marks (0–' + escape(response.marks) + ')<input type="number" min="0" max="' + escape(response.marks) + '" step="1" data-review-score="' + learnerId + '" data-review-question="' + escape(response.question_id) + '" value="' + (response.manual_score == null ? '' : escape(response.manual_score)) + '"></label>') +
          '</li>').join("") + '</ol>' +
          (shortAnswers.length ? '<button type="button" class="panel-button primary" data-lesson-review="' + escape(lessonId) + '" data-review-learner="' + learnerId + '">Save short-answer marks</button>' : '') +
          '<div data-review-feedback="' + learnerId + '" aria-live="polite"></div></article>';
      }).join("") : '<p>No submissions yet.</p>') + '</div>';
  }

  body.addEventListener("click", async event => {
    const notesButton = event.target.closest("[data-lesson-notes-open]");
    if (notesButton) {
      const lessonId = notesButton.getAttribute("data-lesson-notes-open") || "";
      const notesPanel = body.querySelector('[data-lesson-notes-panel="' + CSS.escape(lessonId) + '"]');
      if (notesPanel) {
        notesPanel.open = true;
        notesPanel.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }
    const sourceButton = event.target.closest("[data-lesson-source-open]");
    if (sourceButton) {
      const sourceUrl = sourceButton.getAttribute("data-lesson-source-open") || "";
      if (sourceUrl.startsWith("https://") || sourceUrl.startsWith("http://")) window.open(sourceUrl, "_blank", "noopener,noreferrer");
      return;
    }
    const assignButton = event.target.closest("[data-lesson-assign]");
    if (assignButton) {
      const lessonId = assignButton.getAttribute("data-lesson-assign");
      const select = body.querySelector('[data-lesson-learner="' + lessonId + '"]');
      const feedback = body.querySelector('[data-lesson-feedback="' + lessonId + '"]');
      assignButton.disabled = true;
      try {
        await request("/api/v1/teacher/lessons/" + encodeURIComponent(lessonId) + "/assign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ learner_id: select && select.value })
        });
        if (feedback) feedback.innerHTML = '<p class="teacher-lesson-success">Assigned. The learner can open this lesson from their Learn workspace.</p>';
        const refreshed = await request("/api/v1/teacher/lessons");
        lessons = refreshed.lessons || lessons;
        connectedLearners = refreshed.connected_learners || connectedLearners;
        render();
      } catch (error) {
        if (feedback) feedback.innerHTML = '<p class="teacher-lesson-error">' + escape(error.message) + '</p>';
        assignButton.disabled = false;
      }
      return;
    }
    const reviewButton = event.target.closest("[data-lesson-review]");
    if (reviewButton) {
      const lessonId = reviewButton.getAttribute("data-lesson-review");
      const learnerId = reviewButton.getAttribute("data-review-learner");
      const reviewFeedback = body.querySelector('[data-review-feedback="' + learnerId + '"]');
      const manualScores = {};
      body.querySelectorAll("[data-review-score]").forEach(input => {
        if (input.getAttribute("data-review-score") === learnerId && input.value !== "") {
          manualScores[input.getAttribute("data-review-question")] = Number(input.value);
        }
      });
      reviewButton.disabled = true;
      try {
        const result = await request("/api/v1/teacher/lessons/" + encodeURIComponent(lessonId) + "/submissions/" + encodeURIComponent(learnerId) + "/review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ manual_scores: manualScores })
        });
        if (reviewFeedback) reviewFeedback.innerHTML = '<p class="teacher-lesson-success">Marks saved. Total score: ' + escape(result.submission.score) + '/' + escape(result.submission.max_score) + (result.submission.manual_review_required ? '. Some short answers still need marks.' : '. Assessment review complete.') + '</p>';
        const refreshed = await request("/api/v1/teacher/lessons/" + encodeURIComponent(lessonId) + "/submissions");
        renderLessonSubmissions(body.querySelector('[data-lesson-feedback="' + lessonId + '"]'), lessonId, refreshed.submissions || []);
      } catch (error) {
        if (reviewFeedback) reviewFeedback.innerHTML = '<p class="teacher-lesson-error">' + escape(error.message) + '</p>';
        reviewButton.disabled = false;
      }
      return;
    }

    const submissionsButton = event.target.closest("[data-lesson-submissions]");
    if (submissionsButton) {
      const lessonId = submissionsButton.getAttribute("data-lesson-submissions");
      const feedback = body.querySelector('[data-lesson-feedback="' + lessonId + '"]');
      submissionsButton.disabled = true;
      try {
        const data = await request("/api/v1/teacher/lessons/" + encodeURIComponent(lessonId) + "/submissions");
        renderLessonSubmissions(feedback, lessonId, data.submissions || []);
      } catch (error) {
        if (feedback) feedback.innerHTML = '<p class="teacher-lesson-error">' + escape(error.message) + '</p>';
      } finally { submissionsButton.disabled = false; }
    }
  });

  try {
    const data = await request("/api/v1/teacher/lessons");
    lessons = data.lessons || [];
    connectedLearners = data.connected_learners || [];
    render();
  } catch (error) {
    body.innerHTML = '<article class="panel-card"><h3>Lesson Studio could not load</h3><p>' + escape(error.message) + '</p><button type="button" class="panel-button" data-panel-action="teacher-dashboard">Back to dashboard</button></article>';
  }
}

async function openTeacherLearnerView(learnerId) {
  const panelElement = document.getElementById("experience-panel");
  const panelBodyElement = document.getElementById("panel-body");
  const panelKickerElement = document.getElementById("panel-kicker");
  const panelTitleElement = document.getElementById("panel-title");
  const panelDescriptionElement = document.getElementById("panel-description");

  if (!panelElement || !panelBodyElement) return;

  const auth =
    window.DreamEducationUI && window.DreamEducationUI.getAuth
      ? window.DreamEducationUI.getAuth()
      : null;

  const token =
    auth &&
    auth.session &&
    auth.session.access_token
      ? auth.session.access_token
      : "";

  if (!token) {
    alert("Please sign in again.");
    return;
  }

  learnerId = String(learnerId || "").trim();

  if (!learnerId) {
    alert("Learner information is unavailable.");
    return;
  }

  panelKickerElement.textContent = "CONNECTED LEARNER";
  panelTitleElement.textContent = "Learner information";
  panelDescriptionElement.textContent =
    "View the learning information available to you for this connected learner.";

  panelBodyElement.innerHTML = `
    <article class="panel-card">
      <h3>Loading learner information...</h3>
      <p>Reading the learner's existing Dream Education record.</p>
    </article>
  `;

  document.body.classList.add("panel-open");
  panelElement.setAttribute("aria-hidden", "false");

  try {
    const response = await fetchWithTimeout(
      "/api/product/teacher/learner/" + encodeURIComponent(learnerId),
      {
        method: "GET",
        headers: {
          "Authorization": "Bearer " + token
        }
      }
    );

    const responseText = await response.text();
    let data;

    try {
      data = JSON.parse(responseText);
    } catch (error) {
      throw new Error("The server returned an invalid learner response.");
    }

    if (!response.ok || !data.success) {
      throw new Error(
        data.error || "Unable to load learner information."
      );
    }

    const learner = data.learner || {};
    const classes = Array.isArray(data.classes) ? data.classes : [];
    const teachers = Array.isArray(data.teachers) ? data.teachers : [];
    const schools = Array.isArray(data.schools) ? data.schools : [];
    const results = Array.isArray(data.results) ? data.results : [];
    const analytics = data.analytics || {};
    const learning = data.learning || {};
    const next = data.next || {};
    const learningJourney = data.learning_journey || {};
    const journeyAssessments = Array.isArray(learningJourney.assessments)
      ? learningJourney.assessments
      : [];
    const journeyHistory = Array.isArray(learningJourney.history)
      ? learningJourney.history
      : [];
    const subjectHistory = Array.isArray(learningJourney.subject_history)
      ? learningJourney.subject_history
      : [];
    const topicProgression = Array.isArray(learningJourney.topic_progression)
      ? learningJourney.topic_progression
      : [];
    const assessmentProgression = Array.isArray(learningJourney.assessment_progression)
      ? learningJourney.assessment_progression
      : [];
    const journeyState = learningJourney.current_state || {};
    const teacherAction = learningJourney.teacher_action || {};

    const escapeHTML = function (value) {
      return String(value == null ? "" : value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    };

    const average =
      analytics.average_score == null
        ? "0"
        : Number(analytics.average_score).toFixed(1);

    const journeyAssessmentHTML = journeyAssessments.length
      ? journeyAssessments.slice(0, 10).map(function (item) {
          const date = item.created_at
            ? new Date(item.created_at).toLocaleString()
            : "Date not recorded";

          return `
            <div class="teacher-result-row">
              <div>
                <strong>${escapeHTML(item.subject || "General")}</strong>
                <span>${escapeHTML(item.topic || "No topic")}</span>
                <small>${escapeHTML(item.question || "Assessment question not recorded")}</small>
              </div>
              <strong>${escapeHTML(item.score == null ? "—" : item.score + "%")}</strong>
              <small>${escapeHTML(date)}</small>
            </div>
          `;
        }).join("")
      : `
        <div class="teacher-result-empty">
          No learning assessments recorded yet.
        </div>
      `;

    const journeyHistoryHTML = journeyHistory.length
      ? journeyHistory.slice(0, 10).map(function (item) {
          const date = item.created_at
            ? new Date(item.created_at).toLocaleString()
            : "Date not recorded";

          return `
            <div class="teacher-result-row">
              <div>
                <strong>${escapeHTML(item.subject || "General")}</strong>
                <span>${escapeHTML(item.topic || "No topic")}</span>
                <small>${escapeHTML(item.question || "Learning activity not recorded")}</small>
              </div>
              <small>${escapeHTML(item.level || "Level not recorded")}</small>
              <small>${escapeHTML(date)}</small>
            </div>
          `;
        }).join("")
      : `
        <div class="teacher-result-empty">
          No learning activity recorded yet.
        </div>
      `;


    const weakResults =
      analytics.weak_results == null
        ? 0
        : analytics.weak_results;

    const classNames = classes.length
      ? classes.map(function (item) {
          return escapeHTML(item.name || item.class_name || item.class_id);
        }).join(", ")
      : "No class recorded";

    const teacherNames = teachers.length
      ? teachers.map(function (item) {
          return escapeHTML(item.name || item.full_name || item.teacher_id);
        }).join(", ")
      : "No teacher recorded";

    const schoolNames = schools.length
      ? schools.map(function (item) {
          return escapeHTML(item.name || item.school_name || item.school_id);
        }).join(", ")
      : "No school recorded";

    const resultHTML = results.length
      ? results.map(function (result) {
          return `
            <div class="teacher-result-row">
              <div>
                <strong>${escapeHTML(result.subject || "General")}</strong>
                <span>${escapeHTML(result.topic || "No topic")}</span>
              </div>
              <strong>${escapeHTML(result.score == null ? "—" : result.score + "%")}</strong>
            </div>
          `;
        }).join("")
      : `
        <div class="teacher-result-empty">
          No assessment results recorded yet.
        </div>
      `;

    panelBodyElement.innerHTML = `
      <article class="panel-card">
        <div class="teacher-dashboard-card-label">LEARNER</div>
        <h3>${escapeHTML(learner.name || learner.full_name || learner.learner_id)}</h3>
        <p>${escapeHTML(learner.level || "Level not recorded")} · ${escapeHTML(learner.grade || "Grade not recorded")}</p>
      </article>

      <div class="teacher-stat-grid">
        <article class="teacher-stat-card">
          <span>RESULTS</span>
          <strong>${results.length}</strong>
        </article>
        <article class="teacher-stat-card">
          <span>AVERAGE SCORE</span>
          <strong>${average}%</strong>
        </article>
        <article class="teacher-stat-card">
          <span>WEAK RESULTS</span>
          <strong>${weakResults}</strong>
        </article>
      </div>

      <article class="panel-card">
        <div class="teacher-dashboard-card-label">CURRENT LEARNING</div>
        <div class="teacher-connection-detail">
          <strong>Subject</strong>
          <span>${escapeHTML(learning.active_subject || "Not recorded")}</span>
        </div>
        <div class="teacher-connection-detail">
          <strong>Topic</strong>
          <span>${escapeHTML(learning.active_topic || "Not recorded")}</span>
        </div>
        <div class="teacher-connection-detail">
          <strong>Learning state</strong>
          <span>${escapeHTML(learning.learning_state || "Not recorded")}</span>
        </div>
        <div class="teacher-connection-detail">
          <strong>Mastery</strong>
          <span>${escapeHTML(learning.mastery_status || "Not started")}</span>
        </div>
        <div class="teacher-connection-detail">
          <strong>Assessment average</strong>
          <span>${escapeHTML(learning.assessment_average == null ? "0" : learning.assessment_average + "%")}</span>
        </div>
        <div class="teacher-connection-detail">
          <strong>Assessments</strong>
          <span>${escapeHTML(learning.assessments == null ? 0 : learning.assessments)}</span>
        </div>
        <div class="teacher-connection-detail">
          <strong>Next step</strong>
          <span>${escapeHTML(next.action || "Not recorded")}</span>
        </div>
        <div class="teacher-connection-detail">
          <strong>Next topic</strong>
          <span>${escapeHTML(next.topic || "Not recorded")}</span>
        </div>
      </article>

      <article class="panel-card">
        <div class="teacher-dashboard-card-label">LEARNING RECORD</div>
        <div class="teacher-connection-detail">
          <strong>Class</strong>
          <span>${classNames}</span>
        </div>
        <div class="teacher-connection-detail">
          <strong>Teacher</strong>
          <span>${teacherNames}</span>
        </div>
        <div class="teacher-connection-detail">
          <strong>School</strong>
          <span>${schoolNames}</span>
        </div>
      </article>

      <article class="panel-card">
        <div class="teacher-dashboard-card-label">ASSESSMENT RESULTS</div>
        <div class="teacher-results-list">
          ${resultHTML}
        </div>
      </article>

      <article class="panel-card">
        <div class="teacher-dashboard-card-label">LEARNING JOURNEY</div>

        <div class="teacher-connection-detail">
          <strong>Stored assessments</strong>
          <span>${escapeHTML(journeyAssessments.length)}</span>
        </div>

        <div class="teacher-connection-detail">
          <strong>Learning activities</strong>
          <span>${escapeHTML(journeyHistory.length)}</span>
        </div>

        <div class="teacher-dashboard-card-label">CURRENT LEARNING STATE</div>

        <div class="teacher-connection-detail">
          <strong>Subject</strong>
          <span>${escapeHTML(journeyState.subject || learning.active_subject || "Not recorded")}</span>
        </div>

        <div class="teacher-connection-detail">
          <strong>Topic</strong>
          <span>${escapeHTML(journeyState.topic || learning.active_topic || "Not recorded")}</span>
        </div>

        <div class="teacher-connection-detail">
          <strong>Learning state</strong>
          <span>${escapeHTML(journeyState.learning_state || learning.learning_state || "Not recorded")}</span>
        </div>

        <div class="teacher-connection-detail">
          <strong>Mastery</strong>
          <span>${escapeHTML(journeyState.mastery_status || learning.mastery_status || "Not started")}</span>
        </div>

        <div class="teacher-dashboard-card-label">SUBJECT HISTORY</div>

        <div class="teacher-results-list">
          ${subjectHistory.length
            ? subjectHistory.slice(0, 10).map(function (item) {
                return `
                  <div class="teacher-result-row">
                    <div>
                      <strong>${escapeHTML(item.subject)}</strong>
                      <small>${escapeHTML(item.assessments)} assessments · ${escapeHTML(item.activities)} activities</small>
                    </div>
                    <strong>${escapeHTML(item.average_score == null ? "—" : item.average_score + "%")}</strong>
                    <small>Latest: ${escapeHTML(item.latest_score == null ? "—" : item.latest_score + "%")}</small>
                  </div>
                `;
              }).join("")
            : `
              <div class="teacher-result-empty">
                No subject history recorded yet.
              </div>
            `}
        </div>

        <div class="teacher-dashboard-card-label">TOPIC PROGRESSION</div>

        <div class="teacher-results-list">
          ${topicProgression.length
            ? topicProgression.slice(0, 10).map(function (item) {
                return `
                  <div class="teacher-result-row">
                    <div>
                      <strong>${escapeHTML(item.topic)}</strong>
                      <span>${escapeHTML(item.subject)}</span>
                      <small>${escapeHTML(item.assessments)} assessments</small>
                    </div>
                    <strong>${escapeHTML(item.average_score == null ? "—" : item.average_score + "%")}</strong>
                    <small>Latest: ${escapeHTML(item.latest_score == null ? "—" : item.latest_score + "%")}</small>
                  </div>
                `;
              }).join("")
            : `
              <div class="teacher-result-empty">
                No topic progression recorded yet.
              </div>
            `}
        </div>

        <div class="teacher-dashboard-card-label">ASSESSMENT PROGRESSION</div>

        <div class="teacher-results-list">
          ${assessmentProgression.length
            ? assessmentProgression.map(function (item) {
                const date = item.created_at
                  ? new Date(item.created_at).toLocaleString()
                  : "Date not recorded";

                return `
                  <div class="teacher-result-row">
                    <div>
                      <strong>${escapeHTML(item.score + "%")}</strong>
                      <span>${escapeHTML(item.subject)} · ${escapeHTML(item.topic)}</span>
                    </div>
                    <small>${escapeHTML(date)}</small>
                  </div>
                `;
              }).join("")
            : `
              <div class="teacher-result-empty">
                No scored assessments recorded yet.
              </div>
            `}
        </div>

        <div class="teacher-dashboard-card-label">TEACHER ACTION</div>

        <div class="teacher-connection-detail">
          <strong>Next action</strong>
          <span>${escapeHTML(teacherAction.action || next.action || "Review learner progress")}</span>
        </div>

        <div class="teacher-connection-detail">
          <strong>Focus topic</strong>
          <span>${escapeHTML(teacherAction.topic || next.topic || "Not recorded")}</span>
        </div>

        <div class="teacher-connection-detail">
          <strong>Learning state</strong>
          <span>${escapeHTML(teacherAction.learning_state || journeyState.learning_state || "Not recorded")}</span>
        </div>

        <div class="teacher-dashboard-card-label">RECENT ASSESSMENTS</div>
        <div class="teacher-results-list">
          ${journeyAssessmentHTML}
        </div>

        <div class="teacher-dashboard-card-label">RECENT LEARNING ACTIVITY</div>
        <div class="teacher-results-list">
          ${journeyHistoryHTML}
        </div>
      </article>


      <div class="panel-actions teacher-dashboard-actions">
        <button
          class="panel-button primary"
          type="button"
          data-panel-action="teacher-connections">
          Back to connections
        </button>
        <button
          class="panel-button"
          type="button"
          data-panel-action="teacher-dashboard">
          Teacher dashboard
        </button>
        <button
          class="panel-button"
          type="button"
          data-panel-action="close-dashboard">
          Close
        </button>
      </div>
    `;
  } catch (error) {
    console.error("Teacher learner view error:", error);

    panelBodyElement.innerHTML = `
      <article class="panel-card">
        <h3>Unable to load learner information</h3>
        <p>${String(error.message || "Learner information failed to load.")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")}</p>
        <div class="panel-actions teacher-dashboard-actions">
          <button
            class="panel-button primary"
            type="button"
            data-panel-action="teacher-connections">
            Back to connections
          </button>
        </div>
      </article>
    `;
  }
}
function teacherConnectionsMarkup(data, teacherData) {
  const escapeHTML = function (value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  const connections = Array.isArray(data && data.connections)
    ? data.connections
    : [];

  const learners = Array.isArray(teacherData && teacherData.learners)
    ? teacherData.learners
    : [];

  const learnerNames = {};
  learners.forEach(function (learner) {
    if (learner && learner.learner_id) {
      learnerNames[learner.learner_id] =
        learner.name || learner.full_name || learner.learner_id;
    }
  });

  const active = connections.filter(function (connection) {
    return connection && connection.status === "active";
  });

  const pending = connections.filter(function (connection) {
    return connection && connection.status === "pending";
  });

  function connectionLabel(connection) {
    if (!connection) return "Unknown connection";

    if (
      connection.type === "teacher_learner" &&
      connection.to_role === "learner"
    ) {
      return learnerNames[connection.to_id] || connection.to_id;
    }

    if (
      connection.type === "teacher_learner" &&
      connection.from_role === "learner"
    ) {
      return learnerNames[connection.from_id] || connection.from_id;
    }

    return connection.to_id || connection.from_id || "Unknown";
  }

  function connectionTypeLabel(type) {
    return String(type || "connection")
      .replace(/_/g, " ")
      .replace(/\b\w/g, function (letter) {
        return letter.toUpperCase();
      });
  }

  function renderConnection(connection, pendingMode) {
    const person = connectionLabel(connection);
    const type = connectionTypeLabel(connection.type);

      const learnerId =
        !pendingMode &&
        connection &&
        connection.type === "teacher_learner" &&
        connection.to_role === "learner"
          ? connection.to_id
          : "";

      const clickable = learnerId
        ? ' data-connection-action="view-learner" data-learner-id="' +
          escapeHTML(learnerId) +
          '" tabindex="0" role="button"'
        : "";

    return `
      <article class="teacher-connection-card"${clickable}>
        <div class="teacher-connection-main">
          <div class="teacher-dashboard-card-label">
            ${escapeHTML(type)}
          </div>
          <h3>${escapeHTML(person)}</h3>
          <p>
            ${pendingMode
              ? "This connection is waiting for your approval."
              : "Active connection"}
          </p>
        </div>

        <div class="teacher-connection-meta">
          <span class="teacher-connection-status ${
            pendingMode ? "pending" : "active"
          }">
            ${pendingMode ? "Pending" : "Active"}
          </span>

          ${
            pendingMode
              ? `
                <div class="teacher-connection-actions">
                  <button
                    class="panel-button primary"
                    type="button"
                    data-connection-action="approve"
                    data-connection-id="${escapeHTML(connection.connection_id)}">
                    Approve
                  </button>

                  <button
                    class="panel-button"
                    type="button"
                    data-connection-action="reject"
                    data-connection-id="${escapeHTML(connection.connection_id)}">
                    Reject
                  </button>
                </div>
              `
              : ""
          }
        </div>
      </article>
    `;
  }

  const activeHTML = active.length
    ? active.map(function (connection) {
        return renderConnection(connection, false);
      }).join("")
    : `
      <div class="teacher-result-empty">
        No active connections yet.
      </div>
    `;

  const pendingHTML = pending.length
    ? pending.map(function (connection) {
        return renderConnection(connection, true);
      }).join("")
    : `
      <div class="teacher-result-empty">
        No pending connection requests.
      </div>
    `;

  return `
    <section class="teacher-dashboard teacher-connections">
      <div class="teacher-dashboard-header">
        <div>
          <div class="teacher-dashboard-kicker">TEACHER CONNECTIONS</div>
          <h2>Connections</h2>
          <p>
            Manage the learners and other Dream Education accounts connected
            to your teacher account.
          </p>
        </div>
      </div>

      <div class="teacher-dashboard-stats">
        <article class="teacher-stat-card">
          <span>Active</span>
          <strong>${active.length}</strong>
        </article>

        <article class="teacher-stat-card">
          <span>Pending</span>
          <strong>${pending.length}</strong>
        </article>

        <article class="teacher-stat-card">
          <span>Total</span>
          <strong>${connections.length}</strong>
        </article>
      </div>

      <div class="teacher-dashboard-section">
        <div class="teacher-dashboard-section-heading">
          <div>
            <span class="teacher-dashboard-card-label">ACTIVE</span>
            <h3>Active connections</h3>
          </div>
        </div>

        <div class="teacher-connections-list">
          ${activeHTML}
        </div>
      </div>

      <div class="teacher-dashboard-section">
        <div class="teacher-dashboard-section-heading">
          <div>
            <span class="teacher-dashboard-card-label">REQUESTS</span>
            <h3>Pending requests</h3>
          </div>
        </div>

        <div class="teacher-connections-list">
          ${pendingHTML}
        </div>
      </div>

      <div class="panel-actions teacher-dashboard-actions">
        <button
          class="panel-button primary"
          type="button"
          data-panel-action="teacher-dashboard">
          Back to dashboard
        </button>

        <button
          class="panel-button"
          type="button"
          data-panel-action="close-dashboard">
          Close
        </button>
      </div>
    </section>
  `;
}

async function sendTeacherConnectionRequest(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const input = document.getElementById("teacher-request-learner-id");
  const message = document.getElementById("teacher-request-message");

  const learnerId = input
    ? String(input.value || "").trim()
    : "";

  if (!learnerId) {
    if (message) {
      message.textContent = "Enter a learner ID.";
      message.className = "teacher-request-message error";
    }
    return;
  }

  const auth =
    window.DreamEducationUI &&
    window.DreamEducationUI.getAuth
      ? window.DreamEducationUI.getAuth()
      : null;

  const account = auth && auth.account ? auth.account : {};
  const profile = auth && auth.profile ? auth.profile : {};

  const teacherId =
    account.teacher_id ||
    profile.teacher_id ||
    auth.teacher_id ||
    "";

  const token =
    auth &&
    auth.session &&
    auth.session.access_token
      ? auth.session.access_token
      : "";

  if (!teacherId || !token) {
    if (message) {
      message.textContent = "Please sign in again.";
      message.className = "teacher-request-message error";
    }
    return;
  }

  const button = form.querySelector("button[type=\"submit\"]");

  if (button) {
    button.disabled = true;
    button.textContent = "Sending...";
  }

  if (message) {
    message.textContent = "";
    message.className = "teacher-request-message";
  }

  try {
    const response = await fetch("/api/product/connections/request", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify({
        type: "teacher_learner",
        from_role: "teacher",
        from_id: teacherId,
        to_role: "learner",
        to_id: learnerId
      })
    });

    const responseText = await response.text();
    let data = {};

    try {
      data = JSON.parse(responseText);
    } catch (error) {
      throw new Error("The server returned an invalid response.");
    }

    if (!response.ok || !data.success) {
      throw new Error(
        data.error ||
        "Unable to send the connection request."
      );
    }

    if (message) {
      message.textContent = "Connection request sent successfully.";
      message.className = "teacher-request-message success";
    }

    input.value = "";

    setTimeout(function () {
      openTeacherConnections();
    }, 700);

  } catch (error) {
    console.error("Teacher connection request error:", error);

    if (message) {
      message.textContent =
        error.message || "Connection request failed.";
      message.className = "teacher-request-message error";
    }

    if (button) {
      button.disabled = false;
      button.textContent = "Send Request";
    }
  }
}


async function searchTeacherConnectionPeople(event) {
  event.preventDefault();

  const input =
    document.getElementById("teacher-connection-search");

  const resultsElement =
    document.getElementById("teacher-connection-search-results");

  const query = input
    ? String(input.value || "").trim()
    : "";

  if (!query) {
    if (resultsElement) {
      resultsElement.innerHTML =
        '<div class="teacher-result-empty">Enter a name, email, or learner ID.</div>';
    }
    return;
  }

  const auth =
    window.DreamEducationUI &&
    window.DreamEducationUI.getAuth
      ? window.DreamEducationUI.getAuth()
      : null;

  const token =
    auth &&
    auth.session &&
    auth.session.access_token
      ? auth.session.access_token
      : "";

  if (!token) {
    if (resultsElement) {
      resultsElement.innerHTML =
        '<div class="teacher-result-empty">Please sign in again.</div>';
    }
    return;
  }

  if (resultsElement) {
    resultsElement.innerHTML =
      '<div class="teacher-result-empty">Searching...</div>';
  }

  try {
    const response = await fetch(
      "/api/product/connections/search?q=" +
      encodeURIComponent(query),
      {
        method: "GET",
        headers: {
          "Authorization": "Bearer " + token
        }
      }
    );

    const responseText = await response.text();
    let data = {};

    try {
      data = JSON.parse(responseText);
    } catch (error) {
      throw new Error("The server returned an invalid search response.");
    }

    if (!response.ok || !data.success) {
      throw new Error(
        data.error || "Unable to search learners."
      );
    }

    const results = Array.isArray(data.results)
      ? data.results
      : [];

    if (!results.length) {
      resultsElement.innerHTML =
        '<div class="teacher-result-empty">No learners found.</div>';
      return;
    }

    const escapeHTML = function (value) {
      return String(value == null ? "" : value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    };

    resultsElement.innerHTML = results.map(function (learner) {
      const status =
        learner.connection_status || "none";

      let actionHTML = "";

      if (status === "active") {
        actionHTML =
          '<span class="teacher-search-status active">Already connected</span>';
      } else if (status === "pending") {
        actionHTML =
          '<span class="teacher-search-status pending">Request pending</span>';
      } else {
        actionHTML =
          '<button class="panel-button primary" type="button" ' +
          'data-connection-action="send-request" ' +
          'data-learner-id="' +
          escapeHTML(learner.learner_id) +
          '">' +
          'Send Request' +
          '</button>';
      }

      const academic = [
        learner.level,
        learner.grade
      ].filter(Boolean).join(" • ");

      return `
        <article class="teacher-search-result">
          <div class="teacher-search-result-main">
            <span class="teacher-dashboard-card-label">LEARNER</span>
            <h3>${escapeHTML(learner.name)}</h3>
            ${
              learner.email
                ? `<p>${escapeHTML(learner.email)}</p>`
                : ""
            }
            ${
              academic
                ? `<p>${escapeHTML(academic)}</p>`
                : ""
            }
            <small>ID: ${escapeHTML(learner.learner_id)}</small>
          </div>

          <div class="teacher-search-result-action">
            ${actionHTML}
          </div>
        </article>
      `;
    }).join("");

  } catch (error) {
    console.error("Learner search error:", error);

    if (resultsElement) {
      resultsElement.innerHTML =
        '<div class="teacher-result-empty">' +
        String(error.message || "Search failed.")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;") +
        '</div>';
    }
  }
}

async function sendTeacherConnectionRequestForLearner(
  learnerId,
  button
) {
  const auth =
    window.DreamEducationUI &&
    window.DreamEducationUI.getAuth
      ? window.DreamEducationUI.getAuth()
      : null;

  const account =
    auth && auth.account
      ? auth.account
      : {};

  const profile =
    auth && auth.profile
      ? auth.profile
      : {};

  const teacherId =
    account.teacher_id ||
    profile.teacher_id ||
    auth.teacher_id ||
    "";

  const token =
    auth &&
    auth.session &&
    auth.session.access_token
      ? auth.session.access_token
      : "";

  if (!teacherId || !token) {
    alert("Please sign in again.");
    return;
  }

  if (!learnerId) return;

  if (button) {
    button.disabled = true;
    button.textContent = "Sending...";
  }

  try {
    const response = await fetch(
      "/api/product/connections/request",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + token
        },
        body: JSON.stringify({
          type: "teacher_learner",
          from_role: "teacher",
          from_id: teacherId,
          to_role: "learner",
          to_id: learnerId
        })
      }
    );

    const responseText = await response.text();
    let data = {};

    try {
      data = JSON.parse(responseText);
    } catch (error) {
      throw new Error("The server returned an invalid response.");
    }

    if (!response.ok || !data.success) {
      throw new Error(
        data.error || "Unable to send connection request."
      );
    }

    if (button) {
      button.disabled = true;
      button.textContent = "Request Sent";
    }

  } catch (error) {
    console.error(
      "Connection request error:",
      error
    );

    if (button) {
      button.disabled = false;
      button.textContent = "Send Request";
    }

    alert(
      error.message ||
      "Connection request failed."
    );
  }
}

async function openTeacherConnections() {
  const panelElement = document.getElementById("experience-panel");
  const panelBodyElement = document.getElementById("panel-body");
  const panelKickerElement = document.getElementById("panel-kicker");
  const panelTitleElement = document.getElementById("panel-title");
  const panelDescriptionElement =
    document.getElementById("panel-description");

  if (!panelElement || !panelBodyElement) {
    return;
  }

  panelKickerElement.textContent = "TEACHER CONNECTIONS";
  panelTitleElement.textContent = "Connections";
  panelDescriptionElement.textContent =
    "Manage your existing Dream Education connections.";

  panelBodyElement.innerHTML = `
    <article class="panel-card">
      <h3>Loading connections...</h3>
      <p>Reading your existing Dream Education relationships.</p>
    </article>
  `;

  document.body.classList.add("panel-open");
  panelElement.setAttribute("aria-hidden", "false");

  const auth =
    window.DreamEducationUI &&
    window.DreamEducationUI.getAuth
      ? window.DreamEducationUI.getAuth()
      : null;

  if (!auth || !auth.success) {
    panelBodyElement.innerHTML = `
      <article class="panel-card">
        <h3>Session required</h3>
        <p>Please sign in again to view teacher connections.</p>
      </article>
    `;
    return;
  }

  const account = auth.account || {};
  const profile = auth.profile || {};
  const teacherId =
    account.teacher_id ||
    profile.teacher_id ||
    auth.teacher_id ||
    "";

  const token =
    auth.session &&
    auth.session.access_token
      ? auth.session.access_token
      : "";

  if (!teacherId || !token) {
    panelBodyElement.innerHTML = `
      <article class="panel-card">
        <h3>Teacher session unavailable</h3>
        <p>Your authenticated teacher information could not be found.</p>
      </article>
    `;
    return;
  }

  try {
    const headers = {
      "Authorization": "Bearer " + token
    };

    const connectionsResponse = await fetchWithTimeout(
      "/api/product/connections?type=teacher_learner",
      {
        method: "GET",
        headers: headers
      }
    );

    const connectionsText = await connectionsResponse.text();
    let connectionsData;

    try {
      connectionsData = JSON.parse(connectionsText);
    } catch (error) {
      throw new Error("The server returned an invalid connections response.");
    }

    if (!connectionsResponse.ok || !connectionsData.success) {
      throw new Error(
        connectionsData.error ||
        "Unable to load teacher connections."
      );
    }

    let teacherData = { success: true, learners: [] };

    try {
      const teacherResponse = await fetchWithTimeout(
        "/api/product/teacher/" +
          encodeURIComponent(teacherId) +
          "/dashboard",
        {
          method: "GET",
          headers: headers
        }
      );

      const teacherText = await teacherResponse.text();

      try {
        teacherData = JSON.parse(teacherText);
      } catch (error) {
        teacherData = { success: true, learners: [] };
      }
    } catch (error) {
      teacherData = { success: true, learners: [] };
    }

    const connectedLearnerIds = connectionsData.connections
      .filter(function (connection) {
        return connection &&
          connection.type === "teacher_learner";
      })
      .map(function (connection) {
        return connection.from_role === "learner"
          ? connection.from_id
          : connection.to_id;
      })
      .filter(Boolean);

    const connectedLearners = [];

    for (const learnerId of connectedLearnerIds) {
      try {
        const learnerResponse = await fetchWithTimeout(
          "/api/product/learner/" +
            encodeURIComponent(learnerId),
          {
            method: "GET",
            headers: headers
          }
        );

        if (!learnerResponse.ok) continue;

        const learnerText = await learnerResponse.text();
        const learnerData = JSON.parse(learnerText);

        if (learnerData && learnerData.success && learnerData.learner) {
          connectedLearners.push(learnerData.learner);
        }
      } catch (error) {
        console.warn(
          "Unable to load connected learner:",
          learnerId,
          error
        );
      }
    }

    teacherData.learners = [
      ...(Array.isArray(teacherData.learners)
        ? teacherData.learners
        : []),
      ...connectedLearners
    ];

    panelBodyElement.innerHTML =
      teacherConnectionsMarkup(connectionsData, teacherData);

  } catch (error) {
    console.error("Teacher connections error:", error);

    panelBodyElement.innerHTML = `
      <article class="panel-card">
        <h3>Unable to load connections</h3>
        <p>${String(error.message || "Connection loading failed.")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")}</p>

        <div class="panel-actions teacher-dashboard-actions">
          <button
            class="panel-button primary"
            type="button"
            data-panel-action="teacher-dashboard">
            Back to dashboard
          </button>
        </div>
      </article>
    `;
  }
}

async function updateTeacherConnection(connectionId, status) {
  const auth =
    window.DreamEducationUI &&
    window.DreamEducationUI.getAuth
      ? window.DreamEducationUI.getAuth()
      : null;

  const token =
    auth &&
    auth.session &&
    auth.session.access_token
      ? auth.session.access_token
      : "";

  if (!token) {
    alert("Please sign in again.");
    return;
  }

  try {
    const response = await fetch(
      "/api/product/connections/" +
        encodeURIComponent(connectionId) +
        "/status",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + token
        },
        body: JSON.stringify({
          status: status
        })
      }
    );

    const responseText = await response.text();
    let data;

    try {
      data = JSON.parse(responseText);
    } catch (error) {
      throw new Error("The server returned an invalid connection response.");
    }

    if (!response.ok || !data.success) {
      throw new Error(
        data.error ||
        "Unable to update the connection."
      );
    }

    await openTeacherConnections();

  } catch (error) {
    console.error("Teacher connection update error:", error);
    alert(error.message || "Unable to update the connection.");
  }
}


async function openGeneralConnections() {
  const panelElement = document.getElementById("experience-panel");
  const panelBodyElement = document.getElementById("panel-body");
  const panelKickerElement = document.getElementById("panel-kicker");
  const panelTitleElement = document.getElementById("panel-title");
  const panelDescriptionElement =
    document.getElementById("panel-description");

  if (!panelElement || !panelBodyElement) return;

  if (panelKickerElement) {
    panelKickerElement.textContent = "CONNECTED EDUCATION";
  }

  if (panelTitleElement) {
    panelTitleElement.textContent = "General Connections";
  }

  if (panelDescriptionElement) {
    panelDescriptionElement.textContent =
      "Find people across Dream Education and build connections with them.";
  }

  setMenuOpen(false);
  document.body.classList.add("panel-open");
  panelElement.setAttribute("aria-hidden", "false");

  panelBodyElement.innerHTML = `
    <article class="panel-card">
      <div class="teacher-dashboard-card-label">FIND PEOPLE</div>
      <h3>Connect with someone</h3>
      <p>
        Search by name, email address, or account ID.
      </p>

      <form id="general-connection-search-form">
        <div class="teacher-search-row">
          <input
            class="panel-input"
            id="general-connection-search"
            name="q"
            type="search"
            placeholder="Name, email or ID"
            autocomplete="off"
            required
          />
          <button class="panel-button primary" type="submit">
            Search
          </button>
        </div>
      </form>

      <div
        id="general-connection-search-results"
        class="teacher-search-results"
        aria-live="polite">
      </div>
    </article>

    <div id="general-connection-sections"></div>

    <div class="panel-actions">
      <button
        class="panel-button"
        type="button"
        data-panel-action="close">
        Close
      </button>
    </div>
  `;

  const form =
    document.getElementById("general-connection-search-form");

  if (form && !form.dataset.bound) {
    form.dataset.bound = "true";

    form.addEventListener("submit", function (event) {
      searchGeneralConnections(event);
    });
  }

  if (!panelBodyElement.dataset.generalConnectionHandler) {
    panelBodyElement.dataset.generalConnectionHandler = "true";

    panelBodyElement.addEventListener("click", function (event) {
      const button = event.target.closest(
        "[data-general-connection-action]"
      );

      if (!button) return;

      const action =
        button.dataset.generalConnectionAction;

      const connectionId =
        button.dataset.connectionId || "";

      const role =
        button.dataset.role || "";

      const entityId =
        button.dataset.entityId || "";

      if (action === "send-request") {
        sendGeneralConnectionRequest(
          role,
          entityId,
          button
        );
        return;
      }

      if (action === "approve") {
        updateGeneralConnection(
          connectionId,
          "active"
        );
        return;
      }

      if (action === "reject") {
        updateGeneralConnection(
          connectionId,
          "rejected"
        );
      }
    });
  }

  await loadGeneralConnections();
}

function getGeneralConnectionAuth() {
  const auth =
    window.DreamEducationUI &&
    window.DreamEducationUI.getAuth
      ? window.DreamEducationUI.getAuth()
      : null;

  if (
    !auth ||
    !auth.session ||
    !auth.session.access_token
  ) {
    return null;
  }

  return auth;
}

function getGeneralConnectionEntityId(auth) {
  const account = auth && auth.account
    ? auth.account
    : {};

  return (
    account.learner_id ||
    account.teacher_id ||
    account.parent_id ||
    account.school_id ||
    ""
  );
}

async function loadGeneralConnections() {
  const auth = getGeneralConnectionAuth();

  const resultsElement =
    document.getElementById(
      "general-connection-search-results"
    );

  const sectionsElement =
    document.getElementById(
      "general-connection-sections"
    );

  if (!auth) {
    if (resultsElement) {
      resultsElement.innerHTML =
        "<p>Please sign in again.</p>";
    }
    return;
  }

  const headers = {
    "Content-Type": "application/json",
    "Authorization":
      "Bearer " + auth.session.access_token
  };

  try {
    const response = await fetch(
      "/api/product/connections?type=general",
      {
        method: "GET",
        headers
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(
        data.error ||
        "General connections could not be loaded."
      );
    }

    renderGeneralConnectionLists(
      Array.isArray(data.connections)
        ? data.connections
        : [],
      auth
    );
  } catch (error) {
    console.error(
      "General connections load error:",
      error
    );

    if (sectionsElement) {
      sectionsElement.innerHTML = `
        <article class="panel-card">
          <p>${escapeHTML(
            error.message ||
            "General connections could not be loaded."
          )}</p>
        </article>
      `;
    }
  }
}

function renderGeneralConnectionLists(
  connections,
  auth
) {
  const sectionsElement =
    document.getElementById(
      "general-connection-sections"
    );

  if (!sectionsElement) return;

  const account = auth.account || {};
  const myRole = account.role || "";
  const myId = getGeneralConnectionEntityId(auth);

  const incoming = [];
  const outgoing = [];
  const active = [];

  connections.forEach(function (connection) {
    const isMine =
      connection.from_role === myRole &&
      connection.from_id === myId;

    const isDestination =
      connection.to_role === myRole &&
      connection.to_id === myId;

    if (connection.status === "active") {
      active.push(connection);
      return;
    }

    if (
      connection.status === "pending" &&
      isDestination
    ) {
      incoming.push(connection);
      return;
    }

    if (
      connection.status === "pending" &&
      isMine
    ) {
      outgoing.push(connection);
    }
  });

  const endpointLabel = function (
    role,
    id
  ) {
    return escapeHTML(
      String(role || "") +
      " · " +
      String(id || "")
    );
  };

  sectionsElement.innerHTML = `
    <article class="panel-card">
      <div class="teacher-dashboard-card-label">
        INCOMING REQUESTS
      </div>
      <h3>Requests waiting for you</h3>

      ${
        incoming.length
          ? incoming.map(connection => `
              <div class="panel-card">
                <strong>
                  ${endpointLabel(
                    connection.from_role,
                    connection.from_id
                  )}
                </strong>
                <p>Wants to connect with you.</p>

                <div class="panel-actions">
                  <button
                    class="panel-button primary"
                    type="button"
                    data-general-connection-action="approve"
                    data-connection-id="${escapeHTML(
                      connection.connection_id
                    )}">
                    Approve
                  </button>

                  <button
                    class="panel-button"
                    type="button"
                    data-general-connection-action="reject"
                    data-connection-id="${escapeHTML(
                      connection.connection_id
                    )}">
                    Reject
                  </button>
                </div>
              </div>
            `).join("")
          : "<p>No incoming requests.</p>"
      }
    </article>

    <article class="panel-card">
      <div class="teacher-dashboard-card-label">
        SENT REQUESTS
      </div>
      <h3>Your pending requests</h3>

      ${
        outgoing.length
          ? outgoing.map(connection => `
              <div class="panel-card">
                <strong>
                  ${endpointLabel(
                    connection.to_role,
                    connection.to_id
                  )}
                </strong>
                <p>Request sent.</p>
              </div>
            `).join("")
          : "<p>No pending requests.</p>"
      }
    </article>

    <article class="panel-card">
      <div class="teacher-dashboard-card-label">
        ACTIVE CONNECTIONS
      </div>
      <h3>People you're connected with</h3>

      ${
        active.length
          ? active.map(connection => {
              const otherIsFrom =
                connection.from_role === myRole &&
                connection.from_id === myId;

              const role =
                otherIsFrom
                  ? connection.to_role
                  : connection.from_role;

              const id =
                otherIsFrom
                  ? connection.to_id
                  : connection.from_id;

              return `
                <div class="panel-card">
                  <strong>
                    ${endpointLabel(role, id)}
                  </strong>
                  <p>Active connection.</p>
                </div>
              `;
            }).join("")
          : "<p>No active general connections yet.</p>"
      }
    </article>
  `;
}

async function searchGeneralConnections(event) {
  if (event) event.preventDefault();

  const generalEscapeHTML = value =>
    String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const auth = getGeneralConnectionAuth();

  const input =
    document.getElementById(
      "general-connection-search"
    );

  const resultsElement =
    document.getElementById(
      "general-connection-search-results"
    );

  if (!auth || !input || !resultsElement) return;

  const query = input.value.trim();

  if (query.length < 2) {
    resultsElement.innerHTML =
      "<p>Enter at least 2 characters.</p>";
    return;
  }

  resultsElement.innerHTML =
    "<p>Searching...</p>";

  try {
    const response = await fetch(
      "/api/product/connections/general/search?q=" +
      encodeURIComponent(query),
      {
        method: "GET",
        headers: {
          "Authorization":
            "Bearer " +
            auth.session.access_token
        }
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(
        data.error ||
        "People could not be searched."
      );
    }

    const results =
      Array.isArray(data.results)
        ? data.results
        : [];

    if (!results.length) {
      resultsElement.innerHTML =
        "<p>No matching people found.</p>";
      return;
    }

    resultsElement.innerHTML = results.map(person => {
      const status =
        person.connection_status;

      let action = "";

      if (status === "active") {
        action =
          '<button class="panel-button" type="button" disabled>Connected</button>';
      } else if (
        status === "outgoing_pending"
      ) {
        action =
          '<button class="panel-button" type="button" disabled>Request Sent</button>';
      } else if (
        status === "incoming_pending"
      ) {
        action =
          '<button class="panel-button" type="button" disabled>Incoming Request</button>';
      } else {
        action = `
          <button
            class="panel-button primary"
            type="button"
            data-general-connection-action="send-request"
            data-role="${generalEscapeHTML(
              person.role
            )}"
            data-entity-id="${generalEscapeHTML(
              person.id
            )}">
            Send Request
          </button>
        `;
      }

      return `
        <article class="panel-card">
          <div class="teacher-dashboard-card-label">
            ${generalEscapeHTML(person.role || "account")}
          </div>

          <h3>
            ${generalEscapeHTML(
              person.name || person.id
            )}
          </h3>

          <p>
            ${generalEscapeHTML(person.email || "")}
          </p>

          <p class="teacher-dashboard-card-label">
            ID: ${generalEscapeHTML(person.id || "")}
          </p>

          <div class="panel-actions">
            ${action}
          </div>
        </article>
      `;
    }).join("");
  } catch (error) {
    console.error(
      "General connection search error:",
      error
    );

    resultsElement.innerHTML = `
      <p>${generalEscapeHTML(
        error.message ||
        "Search failed."
      )}</p>
    `;
  }
}

async function sendGeneralConnectionRequest(
  toRole,
  toId,
  button
) {
  const auth = getGeneralConnectionAuth();

  if (!auth) {
    alert("Please sign in again.");
    return;
  }

  const fromRole =
    auth.account &&
    auth.account.role
      ? auth.account.role
      : "";

  const fromId =
    getGeneralConnectionEntityId(auth);

  if (!fromRole || !fromId || !toRole || !toId) {
    alert("Connection details are incomplete.");
    return;
  }

  button.disabled = true;
  button.textContent = "Sending...";

  try {
    const response = await fetch(
      "/api/product/connections/request",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization":
            "Bearer " +
            auth.session.access_token
        },
        body: JSON.stringify({
          type: "general",
          from_role: fromRole,
          from_id: fromId,
          to_role: toRole,
          to_id: toId
        })
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(
        data.error ||
        "Connection request failed."
      );
    }

    button.textContent = "Request Sent";
    button.classList.remove("primary");

    await loadGeneralConnections();
  } catch (error) {
    console.error(
      "General connection request error:",
      error
    );

    button.disabled = false;
    button.textContent = "Send Request";

    alert(
      error.message ||
      "Connection request failed."
    );
  }
}

async function updateGeneralConnection(
  connectionId,
  status
) {
  const auth = getGeneralConnectionAuth();

  if (!auth || !connectionId) {
    alert("Please sign in again.");
    return;
  }

  try {
    const response = await fetch(
      "/api/product/connections/" +
      encodeURIComponent(connectionId) +
      "/status",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization":
            "Bearer " +
            auth.session.access_token
        },
        body: JSON.stringify({
          status
        })
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(
        data.error ||
        "Unable to update the connection."
      );
    }

    await loadGeneralConnections();
  } catch (error) {
    console.error(
      "General connection update error:",
      error
    );

    alert(
      error.message ||
      "Unable to update the connection."
    );
  }
}

async function openMeetings() {
  const panelElement = document.getElementById("experience-panel");
  const panelBodyElement = document.getElementById("panel-body");
  const panelKickerElement = document.getElementById("panel-kicker");
  const panelTitleElement = document.getElementById("panel-title");
  const panelDescriptionElement = document.getElementById("panel-description");

  if (!panelElement || !panelBodyElement) return;

  if (panelKickerElement) panelKickerElement.textContent = "CONNECTED EDUCATION";
  if (panelTitleElement) panelTitleElement.textContent = "Meetings";
  if (panelDescriptionElement) {
    panelDescriptionElement.textContent =
      "Create and manage meetings with people connected to your Dream Education account.";
  }

  setMenuOpen(false);
  document.body.classList.add("panel-open");
  panelElement.setAttribute("aria-hidden", "false");

  const auth =
    window.DreamEducationUI &&
    window.DreamEducationUI.getAuth
      ? window.DreamEducationUI.getAuth()
      : null;

  const headers = {
    "Content-Type": "application/json"
  };

  if (auth && auth.session && auth.session.access_token) {
    headers.Authorization = "Bearer " + auth.session.access_token;
  }

  const escapeText = value =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const supportedMeetingUrl = value => {
    try {
      const url = new URL(String(value || "").trim());
      return url.protocol === "https:" && (
        url.hostname === "meet.google.com" ||
        url.hostname === "meet.jit.si" ||
        url.hostname === "teams.microsoft.com" ||
        url.hostname === "teams.live.com"
      ) ? url.href : "";
    } catch {
      return "";
    }
  };

  try {
    const [meetingsResponse, connectionsResponse] = await Promise.all([
      fetchWithTimeout("/api/product/meetings", {
        method: "GET",
        headers
      }),
      fetchWithTimeout("/api/product/connections?status=active", {
        method: "GET",
        headers
      })
    ]);

    const meetingsData = await meetingsResponse.json();
    const connectionsData = await connectionsResponse.json();

    if (!meetingsResponse.ok || !meetingsData.success) {
      throw new Error(
        meetingsData.error || "Meeting list could not be loaded."
      );
    }

    if (!connectionsResponse.ok || !connectionsData.success) {
      throw new Error(
        connectionsData.error || "Active connections could not be loaded."
      );
    }

    const upcoming = Array.isArray(meetingsData.upcoming)
      ? meetingsData.upcoming
      : [];

    const past = Array.isArray(meetingsData.past)
      ? meetingsData.past
      : [];

    const connections = Array.isArray(connectionsData.connections)
      ? connectionsData.connections
      : [];

    function connectionLabel(connection) {
      if (!connection) return "Unknown connection";

      if (
        connection.type === "teacher_learner" &&
        connection.to_role === "learner"
      ) {
        return connection.to_id || "Connected learner";
      }

      if (
        connection.type === "teacher_learner" &&
        connection.from_role === "learner"
      ) {
        return connection.from_id || "Connected learner";
      }

      return connection.to_id || connection.from_id || "Connected account";
    }

    const providerLabel = provider => ({
      dream: "Dream Education room (video powered by Jitsi)",
      jitsi: "Jitsi Meet",
      "google-meet": "Google Meet",
      teams: "Microsoft Teams"
    }[provider] || "Meeting");

    const renderMeeting = (meeting, showFollowUp) => `
      <article class="de-meeting-card">
        <div class="de-meeting-card-top">
          <span class="de-meeting-type">${escapeText(String(meeting.type || "meeting").replace(/-/g, " "))}</span>
          <span class="de-meeting-provider">${escapeText(providerLabel(meeting.provider))}</span>
        </div>
        <h3>${escapeText(meeting.title || "Meeting")}</h3>
        <p class="de-meeting-date"><span aria-hidden="true">◷</span> ${escapeText(meeting.scheduled_date)} · ${escapeText(meeting.scheduled_time)}</p>
        <p class="de-meeting-status">Status: ${escapeText(meeting.status || "scheduled")}</p>
        ${meeting.agenda ? '<p class="de-meeting-agenda"><strong>Agenda</strong><br>' + escapeText(meeting.agenda) + '</p>' : ''}
        ${showFollowUp ? '<div class="de-meeting-follow-up"><label for="meeting-follow-up-' + escapeText(meeting.meeting_id) + '">Meeting notes / decisions</label><textarea class="panel-input" id="meeting-follow-up-' + escapeText(meeting.meeting_id) + '" maxlength="4000" rows="3" placeholder="What was discussed? What did participants agree?">' + escapeText(meeting.follow_up || '') + '</textarea><label for="meeting-action-items-' + escapeText(meeting.meeting_id) + '">Next actions</label><textarea class="panel-input" id="meeting-action-items-' + escapeText(meeting.meeting_id) + '" maxlength="2000" rows="2" placeholder="Action — person responsible — due date">' + escapeText(meeting.action_items || '') + '</textarea><p class="de-meeting-message" data-meeting-follow-up-status="' + escapeText(meeting.meeting_id) + '" role="status" aria-live="polite"></p><button class="panel-action" type="button" data-meeting-action="save-follow-up" data-meeting-id="' + escapeText(meeting.meeting_id) + '">Save notes & actions</button></div>' : ''}
        <div class="de-meeting-card-actions">
          <button class="panel-action" type="button" data-meeting-action="join" data-meeting-id="${escapeText(meeting.meeting_id)}" data-meeting-provider="${escapeText(meeting.provider || "dream")}">Join meeting <span aria-hidden="true">→</span></button>
        </div>
      </article>
    `;

    if (!panelBodyElement.dataset.meetingJoinHandler) {
      panelBodyElement.addEventListener("click", async function (event) {
        const tab = event.target.closest("[data-meeting-tab]");
        if (tab) {
          const selectedTab = tab.dataset.meetingTab;
          panelBodyElement.querySelectorAll("[data-meeting-tab]").forEach(item => {
            const active = item === tab;
            item.classList.toggle("is-active", active);
            item.setAttribute("aria-selected", active ? "true" : "false");
          });
          panelBodyElement.querySelectorAll("[data-meeting-list]").forEach(list => {
            list.hidden = list.dataset.meetingList !== selectedTab;
          });
          return;
        }

        const followUpButton = event.target.closest('[data-meeting-action="save-follow-up"]');
        if (followUpButton) {
          const meetingId = followUpButton.dataset.meetingId;
          const followUpInput = document.getElementById("meeting-follow-up-" + meetingId);
          const actionItemsInput = document.getElementById("meeting-action-items-" + meetingId);
          const status = panelBodyElement.querySelector('[data-meeting-follow-up-status="' + CSS.escape(meetingId) + '"]');
          followUpButton.disabled = true;
          if (status) status.textContent = "Saving shared follow-up…";
          try {
            const response = await fetchWithTimeout("/api/product/meetings/" + encodeURIComponent(meetingId) + "/follow-up", {
              method: "POST", headers,
              body: JSON.stringify({ follow_up: followUpInput?.value || "", action_items: actionItemsInput?.value || "" })
            });
            const data = await response.json();
            if (!response.ok || !data.success) throw new Error(data.error || "Meeting follow-up could not be saved.");
            if (status) status.textContent = "Notes and actions saved for authorised meeting participants.";
          } catch (error) {
            if (status) status.textContent = error.message || "Meeting follow-up could not be saved.";
          } finally { followUpButton.disabled = false; }
          return;
        }

        const openRoomButton = event.target.closest('[data-meeting-action="open-room"]');
        if (openRoomButton) {
          const safeUrl = supportedMeetingUrl(openRoomButton.dataset.meetingUrl || "");
          if (!safeUrl) {
            alert("The live meeting link is unavailable. Please close this panel and try joining again.");
            return;
          }
          const opened = window.open(safeUrl, "_blank");
          if (opened) opened.opener = null;
          else alert("Your browser blocked the meeting tab. Allow pop-ups for Dream Education and try again.");
          return;
        }

        const button = event.target.closest('[data-meeting-action="join"]');
        if (!button) return;

        // If the browser blocked the initial placeholder, let the user open
        // the validated URL directly from a fresh click gesture.
        const directExternalUrl = supportedMeetingUrl(button.dataset.externalUrl || "");
        if (directExternalUrl) {
          delete button.dataset.externalUrl;
          // Avoid the noopener feature string here: some browsers return null for
          // a successfully opened tab when that feature is requested.
          const opened = window.open(directExternalUrl, "_blank");
          if (opened) {
            opened.opener = null;
          } else {
            alert("Your browser blocked the meeting tab. Allow pop-ups for Dream Education and try again.");
          }
          return;
        }

        const meetingId = button.dataset.meetingId;

        if (!meetingId) return;

        // Open external meeting tabs synchronously from the click gesture so
        // browsers are less likely to block navigation after the API request.
        const provider = button.dataset.meetingProvider || "dream";
        const externalProvider = ["dream", "jitsi", "google-meet", "teams"].includes(provider);
        let externalMeetingWindow = null;
        if (externalProvider) {
          try {
            externalMeetingWindow = window.open("about:blank", "_blank");
          } catch {
            externalMeetingWindow = null;
          }
        }

        button.disabled = true;
        button.textContent = "Joining...";

        try {
          const response = await fetchWithTimeout(
            "/api/product/meetings/" +
              encodeURIComponent(meetingId) +
              "/join",
            {
              method: "GET",
              headers
            }
          );

          const data = await response.json();

          if (!response.ok || !data.success) {
            throw new Error(
              data.error || "Unable to join meeting."
            );
          }

          window.DreamEducationMeetingRoom =
            data;

          if (data.meeting?.external_url) {
            const safeMeetingUrl = supportedMeetingUrl(data.meeting.external_url);
            if (!safeMeetingUrl) {
              throw new Error("This meeting link is missing or is not from a supported secure meeting provider.");
            }
            if (externalMeetingWindow && !externalMeetingWindow.closed) {
              externalMeetingWindow.location.replace(safeMeetingUrl);
              externalMeetingWindow.opener = null;
            } else {
              // Open from the original click gesture, then sever opener access.
              // The noopener feature string can make window.open return null even
              // when the browser did create the tab, breaking the retry button flow.
              const opened = window.open(safeMeetingUrl, "_blank");
              if (opened) {
                opened.opener = null;
              } else {
                button.dataset.externalUrl = safeMeetingUrl;
                button.disabled = false;
                button.textContent = "Open meeting";
              }
            }
            return;
          }

          if (externalMeetingWindow && !externalMeetingWindow.closed) {
            externalMeetingWindow.close();
          }

          if (typeof window.openMeetingRoom === "function") {
            window.openMeetingRoom(data);
          } else {
            panelBodyElement.innerHTML = `
              <section class="panel-card">
                <div class="teacher-dashboard-card-label">MEETING ROOM</div>
                <h3>${escapeText(data.meeting.title || "Meeting")}</h3>
                <p>Your meeting room is ready, but this page could not open the live meeting window.</p>
                <p class="teacher-dashboard-card-label">Room ID: ${escapeText(data.room.room_id)}</p>
                <div class="panel-actions">
                  <button class="panel-action" type="button" data-meeting-action="open-room" data-meeting-url="${escapeText(data.meeting.external_url || "")}">Open live meeting ↗</button>
                  <button class="panel-action secondary" type="button" data-action="close">Close</button>
                </div>
              </section>
            `;
          }
        } catch (error) {
          if (externalMeetingWindow && !externalMeetingWindow.closed) {
            externalMeetingWindow.close();
          }
          console.error("Meeting join error:", error);
          button.disabled = false;
          button.textContent = "Join Meeting";
          alert(error.message || "Unable to join meeting.");
        }
      });

      panelBodyElement.dataset.meetingJoinHandler = "true";
    }

    const upcomingHTML = upcoming.length
      ? upcoming.map(meeting => renderMeeting(meeting, false)).join("")
      : `
        <article class="de-meeting-empty">
          <span class="de-meeting-empty-icon" aria-hidden="true">▣</span>
          <h3>No upcoming meetings</h3>
          <p>Meetings you schedule with connected people will appear here.</p>
        </article>
      `;

    const pastHTML = past.length
      ? past.map(meeting => renderMeeting(meeting, true)).join("")
      : `
        <article class="de-meeting-empty">
          <span class="de-meeting-empty-icon" aria-hidden="true">◷</span>
          <h3>No past meetings yet</h3>
          <p>Your previous meetings will be listed here when their scheduled time has passed.</p>
        </article>
      `;

    const connectionOptions = connections.length
      ? connections.map(connection => `
          <option value="${escapeText(connection.connection_id)}">
            ${escapeText(connectionLabel(connection))}
          </option>
        `).join("")
      : `
          <option value="">No active connections available</option>
        `;

    panelBodyElement.innerHTML = `
      <div class="de-meetings">
        <section class="de-meetings-hero">
          <div class="de-meetings-hero-copy">
            <span class="de-meetings-eyebrow">CONNECTED EDUCATION</span>
            <h3>Meet, learn and grow together.</h3>
            <p>One place for lessons, parent conferences and school conversations.</p>
          </div>
          <div class="de-meetings-hero-icon" aria-hidden="true">▣</div>
        </section>

        <section class="de-meeting-stats" aria-label="Meeting overview">
          <article class="de-meeting-stat"><span class="de-meeting-stat-icon">▦</span><strong>${upcoming.length}</strong><span>Upcoming</span></article>
          <article class="de-meeting-stat"><span class="de-meeting-stat-icon">◷</span><strong>${past.length}</strong><span>Past meetings</span></article>
          <article class="de-meeting-stat"><span class="de-meeting-stat-icon">♧</span><strong>${connections.length}</strong><span>Connections</span></article>
        </section>

        <section class="de-meeting-create">
          <div class="de-meeting-section-heading">
            <span class="de-meetings-eyebrow">GET TOGETHER</span>
            <h3>Create a meeting</h3>
            <p>Invite someone already connected to your Dream Education account.</p>
          </div>
          <div class="de-meeting-form-grid">
            <div class="de-meeting-field de-meeting-field-wide">
              <label class="panel-label" for="meeting-connection">Connected person</label>
              <select class="panel-input" id="meeting-connection">
                <option value="">Select a connected person</option>
                ${connectionOptions}
              </select>
            </div>
            <div class="de-meeting-field de-meeting-field-wide">
              <label class="panel-label" for="meeting-title">Meeting title</label>
              <input class="panel-input" id="meeting-title" type="text" maxlength="160" placeholder="e.g. Mathematics revision">
            </div>
            <div class="de-meeting-field de-meeting-field-wide">
              <label class="panel-label" for="meeting-agenda">Agenda / learning goal (optional)</label>
              <textarea class="panel-input" id="meeting-agenda" maxlength="2000" rows="3" placeholder="What should the group cover? e.g. fractions practice, recent progress, next steps"></textarea>
            </div>
            <div class="de-meeting-field">
              <label class="panel-label" for="meeting-type">Meeting type</label>
              <select class="panel-input" id="meeting-type">
                <option value="learning">Online lesson</option>
                <option value="teaching">Teaching session</option>
                <option value="parent-support">Parent–teacher support</option>
                <option value="school">School meeting</option>
              </select>
            </div>
            <div class="de-meeting-field">
              <label class="panel-label" for="meeting-provider">Meeting platform</label>
              <select class="panel-input" id="meeting-provider">
                <option value="dream">Dream Education room</option>
                <option value="jitsi">Jitsi Meet — free room</option>
                <option value="google-meet">Google Meet — use your meeting link</option>
                <option value="teams">Microsoft Teams — use your meeting link</option>
              </select>
            </div>
            <div class="de-meeting-field">
              <label class="panel-label" for="meeting-date">Date</label>
              <input class="panel-input" id="meeting-date" type="date">
            </div>
            <div class="de-meeting-field">
              <label class="panel-label" for="meeting-time">Time</label>
              <input class="panel-input" id="meeting-time" type="time">
            </div>
            <div class="de-meeting-field de-meeting-field-wide" id="meeting-external-link-wrap" hidden>
              <label class="panel-label" for="meeting-external-link">Meeting link</label>
              <input class="panel-input" id="meeting-external-link" type="url" inputmode="url" placeholder="https://meet.google.com/…">
              <p class="de-meeting-field-help" id="meeting-provider-help">Create the meeting on the selected provider first, then paste its invitation link here.</p>
            </div>
          </div>
          <div class="de-meeting-create-footer">
            <p id="meeting-create-message" class="de-meeting-message" role="status" aria-live="polite"></p>
            <button class="panel-action" type="button" id="create-meeting-button" ${connections.length ? "" : "disabled"}>Create meeting <span aria-hidden="true">→</span></button>
          </div>
          ${connections.length ? "" : '<p class="de-meeting-no-connections">You need an active connection before scheduling a meeting. Connect with a learner, teacher or parent first.</p>'}
        </section>

        <section class="de-meeting-schedule">
          <div class="de-meeting-section-heading">
            <span class="de-meetings-eyebrow">YOUR SCHEDULE</span>
            <h3>Meeting calendar</h3>
          </div>
          <div class="de-meeting-tabs" role="tablist" aria-label="Meeting schedule">
            <button type="button" class="de-meeting-tab is-active" data-meeting-tab="upcoming" role="tab" aria-selected="true">Upcoming <span>${upcoming.length}</span></button>
            <button type="button" class="de-meeting-tab" data-meeting-tab="past" role="tab" aria-selected="false">Past <span>${past.length}</span></button>
          </div>
          <div class="de-meeting-list" data-meeting-list="upcoming">${upcomingHTML}</div>
          <div class="de-meeting-list" data-meeting-list="past" hidden>${pastHTML}</div>
        </section>

        <section class="de-meeting-tools">
          <div class="de-meeting-section-heading"><span class="de-meetings-eyebrow">MEETING WORKSPACE</span><h3>Everything around the conversation</h3></div>
          <div class="de-meeting-tool-grid">
            <article><span aria-hidden="true">▤</span><strong>Learning materials</strong><p>Keep lesson resources ready to share during a session.</p></article>
            <article><span aria-hidden="true">✓</span><strong>Attendance & follow-up</strong><p>Use your meeting history to plan the next conversation.</p></article>
          </div>
        </section>
        <div class="panel-actions"><button class="panel-action secondary" type="button" data-action="close">Close</button></div>
      </div>
    `;

    const createButton =
      document.getElementById("create-meeting-button");

    const messageElement =
      document.getElementById("meeting-create-message");
    const providerSelect = document.getElementById("meeting-provider");
    const externalLinkWrap = document.getElementById("meeting-external-link-wrap");
    const externalLinkInput = document.getElementById("meeting-external-link");
    const providerHelp = document.getElementById("meeting-provider-help");

    const syncProviderFields = () => {
      const provider = providerSelect?.value || "dream";
      const externalProvider = provider === "google-meet" || provider === "teams";
      if (externalLinkWrap) externalLinkWrap.hidden = !externalProvider;
      if (externalLinkInput) {
        externalLinkInput.required = externalProvider;
        externalLinkInput.placeholder = provider === "teams"
          ? "https://teams.microsoft.com/l/meetup-join/…"
          : "https://meet.google.com/…";
      }
      if (providerHelp) {
        providerHelp.textContent = provider === "teams"
          ? "Create a Teams meeting in Microsoft Teams, then paste its invitation URL. Dream Education saves the link and opens it when participants join."
          : "Create a Google Meet in Google Meet, then paste its invitation URL. Dream Education saves the link and opens it when participants join.";
      }
    };
    if (providerSelect) {
      providerSelect.addEventListener("change", syncProviderFields);
      syncProviderFields();
    }

    if (createButton) {
      createButton.addEventListener("click", async function () {
        const connectionId =
          document.getElementById("meeting-connection")?.value;

        const title =
          document.getElementById("meeting-title")?.value.trim();

        const type =
          document.getElementById("meeting-type")?.value;
        const provider =
          document.getElementById("meeting-provider")?.value || "dream";
        const externalUrlRaw =
          document.getElementById("meeting-external-link")?.value.trim() || "";
        const externalUrl = provider === "google-meet" || provider === "teams"
          ? supportedMeetingUrl(externalUrlRaw)
          : "";

        const scheduledDate =
          document.getElementById("meeting-date")?.value;

        const scheduledTime =
          document.getElementById("meeting-time")?.value;

        if (!connectionId || !title || !scheduledDate || !scheduledTime) {
          if (messageElement) {
            messageElement.textContent =
              "Select a connected person and complete the meeting details.";
          }
          return;
        }

        if ((provider === "google-meet" || provider === "teams") && !externalUrl) {
          if (messageElement) {
            messageElement.textContent = "Paste a valid secure meeting link from the selected provider.";
          }
          externalLinkInput?.focus();
          return;
        }

        createButton.disabled = true;
        createButton.textContent = "Creating...";

        try {
          const response = await fetchWithTimeout("/api/product/meetings", {
            method: "POST",
            headers,
            body: JSON.stringify({
              connection_id: connectionId,
              title,
              type,
              provider,
              agenda: document.getElementById("meeting-agenda")?.value.trim() || "",
              external_url: externalUrl || undefined,
              scheduled_date: scheduledDate,
              scheduled_time: scheduledTime
            })
          });

          const data = await response.json();

          if (!response.ok || !data.success) {
            throw new Error(
              data.error || "Meeting creation failed."
            );
          }

          if (messageElement) {
            messageElement.textContent =
              "Meeting created successfully.";
          }

          await openMeetings();
        } catch (error) {
          console.error("Meeting creation error:", error);

          if (messageElement) {
            messageElement.textContent =
              error.message || "Meeting creation failed.";
          }

          createButton.disabled = false;
          createButton.textContent = "Create Meeting";
        }
      });
    }
  } catch (error) {
    console.error("Meeting loading error:", error);

    panelBodyElement.innerHTML = `
      <section class="panel-card">
        <div class="teacher-dashboard-card-label">MEETINGS</div>
        <h3>Unable to load meetings</h3>
        <p>${escapeHTML(error.message || "Meeting data could not be loaded.")}</p>
      </section>

      <div class="panel-actions">
        <button class="panel-action secondary" type="button" data-action="close">
          Close
        </button>
      </div>
    `;
  }
}
// Expose the workspace explicitly because the main navigation dispatcher
// lives in a separate IIFE and cannot see this function's local binding.
window.DreamEducationMeetings = {
  ...(window.DreamEducationMeetings || {}),
  open: openMeetings
};

async function openTeacherAnalytics() {
  const panelElement = document.getElementById("experience-panel");
  const panelBodyElement = document.getElementById("panel-body");
  const panelKickerElement = document.getElementById("panel-kicker");
  const panelTitleElement = document.getElementById("panel-title");
  const panelDescriptionElement =
    document.getElementById("panel-description");

  if (!panelElement || !panelBodyElement) {
    return;
  }

  panelKickerElement.textContent = "TEACHER ANALYTICS";
  panelTitleElement.textContent = "Analytics & results";
  panelDescriptionElement.textContent =
    "Review learner performance across subjects and topics.";

  panelBodyElement.innerHTML = `
    <article class="panel-card">
      <h3>Loading analytics...</h3>
      <p>Reading your existing Dream Education results.</p>
    </article>
  `;

  document.body.classList.add("panel-open");
  panelElement.setAttribute("aria-hidden", "false");

  const auth =
    window.DreamEducationUI &&
    window.DreamEducationUI.getAuth
      ? window.DreamEducationUI.getAuth()
      : null;

  if (!auth || !auth.success) {
    panelBodyElement.innerHTML = `
      <article class="panel-card">
        <h3>Session required</h3>
        <p>Please sign in again to view teacher analytics.</p>
      </article>
    `;
    return;
  }

  const account = auth.account || {};
  const profile = auth.profile || {};
  const teacherId =
    account.teacher_id ||
    profile.teacher_id ||
    auth.teacher_id ||
    "";

  const token =
    auth.session &&
    auth.session.access_token
      ? auth.session.access_token
      : "";

  if (!teacherId || !token) {
    panelBodyElement.innerHTML = `
      <article class="panel-card">
        <h3>Teacher session unavailable</h3>
        <p>Your authenticated teacher information could not be found.</p>
      </article>
    `;
    return;
  }

  try {
    const response = await fetchWithTimeout(
      "/api/product/results/teacher/" +
        encodeURIComponent(teacherId),
      {
        method: "GET",
        headers: {
          "Authorization": "Bearer " + token
        }
      }
    );

    const responseText = await response.text();
    let data;

    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      throw new Error("The server returned an invalid analytics response.");
    }

    if (!response.ok || !data.success) {
      throw new Error(
        data.error || "Unable to load teacher analytics."
      );
    }

    panelBodyElement.innerHTML = teacherAnalyticsMarkup(data);
  } catch (error) {
    console.error("Teacher analytics error:", error);

    panelBodyElement.innerHTML = `
      <article class="panel-card">
        <h3>Unable to load analytics</h3>
        <p>${String(error.message || "Something went wrong.")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#039;")}</p>
      </article>

      <div class="panel-actions">
        <button
          class="panel-button"
          type="button"
          data-panel-action="close-dashboard">
          Close
        </button>
      </div>
    `;
  }
}

function teacherAnalyticsMarkup(data) {
  const analysis = data.analysis || {};
  const bySubject =
    Array.isArray(data.by_subject) ? data.by_subject : [];
  const byTopic =
    Array.isArray(data.by_topic) ? data.by_topic : [];
  const results =
    Array.isArray(data.results) ? data.results : [];

  const safe = function (value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  const averageScoreLabel = results.length && analysis.average_score != null &&
    Number.isFinite(Number(analysis.average_score))
    ? Number(analysis.average_score).toFixed(1) + "%"
    : "Not yet available";
  const weakResultsLabel = results.length && analysis.weak_results != null &&
    Number.isFinite(Number(analysis.weak_results))
    ? String(Number(analysis.weak_results))
    : "Not yet available";
  const supportLabel = results.length && analysis.learners_needing_support != null &&
    Number.isFinite(Number(analysis.learners_needing_support))
    ? String(Number(analysis.learners_needing_support))
    : "Not yet available";

  // Compare dated scores only within the same learner/topic. This is a
  // descriptive trend, not proof that one lesson caused the change.
  const progressGroups = new Map();
  results.forEach(function (item) {
    if (!item || item.score == null) return;
    const score = Number(item.score);
    const learnerId = String(item.learner_id || item.student_id || "").trim();
    const topic = String(item.topic || item.subject || "").trim();
    const timestamp = Date.parse(item.observed_at || item.created_at || item.date || "");
    if (!learnerId || !topic || !Number.isFinite(score) || score < 0 || score > 100 || !Number.isFinite(timestamp)) return;
    const key = learnerId + "|" + topic.toLowerCase();
    if (!progressGroups.has(key)) progressGroups.set(key, []);
    progressGroups.get(key).push({
      learner: item.learner_name || item.student_name || learnerId,
      topic,
      score,
      timestamp
    });
  });
  const progressComparisons = Array.from(progressGroups.values()).map(function (items) {
    if (items.length < 2) return null;
    items.sort(function (a, b) { return a.timestamp - b.timestamp; });
    const first = items[0], latest = items[items.length - 1];
    if (latest.timestamp <= first.timestamp) return null;
    return {
      learner: latest.learner,
      topic: latest.topic,
      first_score: first.score,
      latest_score: latest.score,
      change: Number((latest.score - first.score).toFixed(1)),
      observations: items.length
    };
  }).filter(Boolean).sort(function (a, b) {
    return Math.abs(b.change) - Math.abs(a.change);
  }).slice(0, 8);
  const progressRows = progressComparisons.length
    ? progressComparisons.map(function (item) {
        const changeLabel = (item.change > 0 ? "+" : "") + item.change + " points";
        const status = item.change > 0 ? "Higher" : item.change < 0 ? "Lower" : "Unchanged";
        return '<article class="teacher-dashboard-card"><div class="teacher-dashboard-card-label">RECORDED SCORE CHANGE</div>' +
          '<h3>' + safe(item.learner) + '</h3><p>' + safe(item.topic) + '</p><strong>' + safe(changeLabel) + '</strong>' +
          '<p>' + safe(status) + ' · ' + item.first_score + '% → ' + item.latest_score + '% · ' + item.observations + ' dated results</p></article>';
      }).join("")
    : '<article class="teacher-dashboard-card empty"><p>Not enough dated repeated results for the same learner and topic to show a reliable progress comparison yet.</p></article>';

  const subjectRows = bySubject.length
    ? bySubject.map(function (item) {
        return `
          <article class="teacher-dashboard-card">
            <div class="teacher-dashboard-card-label">
              SUBJECT
            </div>
            <h3>${safe(item.subject)}</h3>
            <p>
              Average: ${Number(item.average_score) || 0}%
              · Assessments: ${Number(item.total_results) || 0}
              · Weak: ${Number(item.weak_results) || 0}
            </p>
          </article>
        `;
      }).join("")
    : `
        <article class="teacher-dashboard-card empty">
          <div class="teacher-dashboard-card-label">
            SUBJECTS
          </div>
          <p>No subject results yet.</p>
        </article>
      `;

  const topicRows = byTopic.length
    ? byTopic.map(function (item) {
        return `
          <article class="teacher-dashboard-card">
            <div class="teacher-dashboard-card-label">
              TOPIC
            </div>
            <h3>${safe(item.topic)}</h3>
            <p>
              Average: ${Number(item.average_score) || 0}%
              · Assessments: ${Number(item.total_results) || 0}
              · Weak: ${Number(item.weak_results) || 0}
            </p>
          </article>
        `;
      }).join("")
    : `
        <article class="teacher-dashboard-card empty">
          <div class="teacher-dashboard-card-label">
            TOPICS
          </div>
          <p>No topic results yet.</p>
        </article>
      `;

  return `
    <section class="teacher-dashboard">
      <div class="teacher-dashboard-header">
        <div>
          <div class="teacher-dashboard-kicker">
            TEACHER ANALYTICS
          </div>
          <h2>Learning performance</h2>
          <p>
            A view of the results already recorded in Dream Education.
          </p>
        </div>
      </div>

      <div class="teacher-dashboard-stats">
        <article class="teacher-stat-card">
          <span>Total results</span>
          <strong>${Number(analysis.total_results) || results.length}</strong>
        </article>

        <article class="teacher-stat-card">
          <span>Average score</span>
          <strong>${averageScoreLabel}</strong>
        </article>

        <article class="teacher-stat-card">
          <span>Weak results</span>
          <strong>${weakResultsLabel}</strong>
        </article>

        <article class="teacher-stat-card">
          <span>Learners needing support</span>
          <strong>${supportLabel}</strong>
        </article>
      </div>

      <div class="teacher-dashboard-section">
        <div class="teacher-dashboard-section-heading">
          <div>
            <div class="teacher-dashboard-card-label">LEARNING EVIDENCE</div>
            <h3>Observed progress over time</h3>
            <p>Earliest and latest dated scores for the same learner and topic. These comparisons are descriptive and do not prove causation.</p>
          </div>
        </div>
        <div class="teacher-dashboard-grid">${progressRows}</div>
      </div>

      <div class="teacher-dashboard-section">
        <div class="teacher-dashboard-section-heading">
          <div>
            <div class="teacher-dashboard-card-label">
              PERFORMANCE
            </div>
            <h3>By subject</h3>
          </div>
        </div>

        <div class="teacher-dashboard-grid">
          ${subjectRows}
        </div>
      </div>

      <div class="teacher-dashboard-section">
        <div class="teacher-dashboard-section-heading">
          <div>
            <div class="teacher-dashboard-card-label">
              PERFORMANCE
            </div>
            <h3>By topic</h3>
          </div>
        </div>

        <div class="teacher-dashboard-grid">
          ${topicRows}
        </div>
      </div>

      <div class="panel-actions teacher-dashboard-actions">
        <button
          class="panel-button"
          type="button"
          data-panel-action="teacher-dashboard">
          Back to dashboard
        </button>

        <button
          class="panel-button"
          type="button"
          data-panel-action="close-dashboard">
          Close
        </button>
      </div>
    </section>
  `;
}



async function openParentChildOverview(learnerId) {
  const panelElement = document.getElementById("experience-panel");
  const panelBodyElement = document.getElementById("panel-body");
  const panelKickerElement = document.getElementById("panel-kicker");
  const panelTitleElement = document.getElementById("panel-title");
  const panelDescriptionElement = document.getElementById("panel-description");

  if (!panelElement || !panelBodyElement || !learnerId) return;

  const auth =
    window.DreamEducationUI &&
    window.DreamEducationUI.getAuth
      ? window.DreamEducationUI.getAuth()
      : null;

  if (
    !auth ||
    !auth.session ||
    !auth.session.access_token ||
    !auth.account ||
    auth.account.role !== "parent" ||
    !auth.account.parent_id
  ) {
    alert("Please sign in as a parent.");
    return;
  }

  const parentId = auth.account.parent_id;
  const token = auth.session.access_token;

  if (panelKickerElement) {
    panelKickerElement.textContent = "PARENT SPACE";
  }

  if (panelTitleElement) {
    panelTitleElement.textContent = "Learner progress";
  }

  if (panelDescriptionElement) {
    panelDescriptionElement.textContent =
      "Review the existing learning information connected to this learner.";
  }

  panelBodyElement.innerHTML = `
    <div class="parent-space">
      <div class="parent-space-loading">
        Loading learner progress...
      </div>
    </div>
  `;

  try {
    const response = await fetchWithTimeout(
      "/api/product/parent/" +
        encodeURIComponent(parentId) +
        "/child/" +
        encodeURIComponent(learnerId) +
        "/overview",
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + token
        }
      }
    );

    const responseText = await response.text();

    let data;

    try {
      data = JSON.parse(responseText);
    } catch (error) {
      throw new Error("The server returned an invalid learner response.");
    }

    if (!response.ok || !data.success) {
      throw new Error(
        data.error || "Unable to load learner progress."
      );
    }

    renderParentChildOverview(data);
  } catch (error) {
    console.error("Parent child overview error:", error);

    panelBodyElement.innerHTML = `
      <div class="parent-space">
        <div class="parent-space-error">
          <strong>Could not load learner progress.</strong>
          <p>${escapeParentText(
            error.message || "Unable to load learner information."
          )}</p>
          <button
            class="panel-action secondary"
            type="button"
            data-panel-action="parent-space"
          >
            Back to Parent Space
          </button>
        </div>
      </div>
    `;
  }
}

function renderParentChildOverview(data) {
  const panelBodyElement = document.getElementById("panel-body");

  if (!panelBodyElement) return;

  const child = data.child || {};
  const results = Array.isArray(data.results) ? data.results : [];
  const teachers = Array.isArray(data.teachers) ? data.teachers : [];
  const schools = Array.isArray(data.schools) ? data.schools : [];
  const classes = Array.isArray(data.classes) ? data.classes : [];
  const analytics = data.analytics || {};
  const bySubject = analytics.by_subject || {};
  const byTopic = analytics.by_topic || {};

  const subjectRows = Object.keys(bySubject).length
    ? Object.entries(bySubject).map(([subject, value]) => `
        <div class="parent-result-row">
          <div>
            <strong>${escapeParentText(subject)}</strong>
            <span>Subject progress</span>
          </div>
          <strong>${escapeParentText(value)}</strong>
        </div>
      `).join("")
    : `<div class="parent-empty">No subject progress available yet.</div>`;

  const topicRows = Object.keys(byTopic).length
    ? Object.entries(byTopic).slice(0, 12).map(([topic, value]) => `
        <div class="parent-result-row">
          <div>
            <strong>${escapeParentText(topic)}</strong>
            <span>Topic progress</span>
          </div>
          <strong>${escapeParentText(value)}</strong>
        </div>
      `).join("")
    : `<div class="parent-empty">No topic progress available yet.</div>`;

  const resultRows = results.length
    ? results.slice(0, 12).map(result => `
        <div class="parent-result-row">
          <div>
            <strong>${escapeParentText(
              result.subject || "Learning"
            )}</strong>
            <span>${escapeParentText(
              result.topic || result.question || "Assessment"
            )}</span>
          </div>
          <strong>${escapeParentText(
            result.score ?? result.mark ?? "-"
          )}</strong>
        </div>
      `).join("")
    : `<div class="parent-empty">No assessment results available yet.</div>`;

  panelBodyElement.innerHTML = `
    <div class="parent-space">

      <section class="parent-welcome">
        <span class="parent-card-kicker">LEARNER PROGRESS</span>
        <h2>${escapeParentText(
          child.name ||
          child.full_name ||
          child.username ||
          "Learner"
        )}</h2>
        <p>
          Review classes, teachers, schools, subjects, topics and assessment
          results already stored in Dream Education.
        </p>
      </section>

      <section class="parent-stat-grid">
        <div class="parent-stat">
          <span>Classes</span>
          <strong>${escapeParentText(classes.length)}</strong>
        </div>

        <div class="parent-stat">
          <span>Teachers</span>
          <strong>${escapeParentText(teachers.length)}</strong>
        </div>

        <div class="parent-stat">
          <span>Schools</span>
          <strong>${escapeParentText(schools.length)}</strong>
        </div>
      </section>

      <section class="parent-section">
        <div class="parent-section-heading">
          <div>
            <span class="parent-card-kicker">SUBJECTS</span>
            <h2>Subject progress</h2>
          </div>
        </div>
        <div class="parent-results">
          ${subjectRows}
        </div>
      </section>

      <section class="parent-section">
        <div class="parent-section-heading">
          <div>
            <span class="parent-card-kicker">TOPICS</span>
            <h2>Topic progress</h2>
          </div>
        </div>
        <div class="parent-results">
          ${topicRows}
        </div>
      </section>

      <section class="parent-section">
        <div class="parent-section-heading">
          <div>
            <span class="parent-card-kicker">ASSESSMENTS</span>
            <h2>Recent results</h2>
          </div>
        </div>
        <div class="parent-results">
          ${resultRows}
        </div>
      </section>

      <section class="parent-tools">
        <button
          class="panel-action secondary"
          type="button"
          data-panel-action="parent-space"
        >
          Back to Parent Space
        </button>

        <button
          class="panel-action secondary"
          type="button"
          data-panel-action="meetings"
        >
          Meetings
        </button>

        <button
          class="panel-action secondary"
          type="button"
          data-action="close"
        >
          Close
        </button>
      </section>

    </div>
  `;
}

async function openParentSpace() {
  const panelElement = document.getElementById("experience-panel");
  const panelBodyElement = document.getElementById("panel-body");
  const panelKickerElement = document.getElementById("panel-kicker");
  const panelTitleElement = document.getElementById("panel-title");
  const panelDescriptionElement = document.getElementById("panel-description");

  if (!panelElement || !panelBodyElement) return;

  const auth =
    window.DreamEducationUI &&
    window.DreamEducationUI.getAuth
      ? window.DreamEducationUI.getAuth()
      : null;

  if (
    !auth ||
    !auth.session ||
    !auth.session.access_token ||
    !auth.account ||
    auth.account.role !== "parent" ||
    !auth.account.parent_id
  ) {
    alert("Please sign in as a parent.");
    return;
  }

  const parentId = auth.account.parent_id;
  const token = auth.session.access_token;

  if (panelKickerElement) {
    panelKickerElement.textContent = "PARENT SPACE";
  }

  if (panelTitleElement) {
    panelTitleElement.textContent = "Your family's learning.";
  }

  if (panelDescriptionElement) {
    panelDescriptionElement.textContent =
      "Follow your children's learning, progress and results from one connected space.";
  }

  setMenuOpen(false);
  document.body.classList.add("panel-open");
  panelElement.setAttribute("aria-hidden", "false");

  panelBodyElement.innerHTML = `
    <div class="parent-space">
      <div class="parent-space-loading">
        Loading your family learning space...
      </div>
    </div>
  `;

  try {
    const response = await fetchWithTimeout(
      "/api/product/parent/" +
        encodeURIComponent(parentId) +
        "/dashboard",
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + token
        }
      }
    );

    const responseText = await response.text();

    let data;

    try {
      data = JSON.parse(responseText);
    } catch (error) {
      throw new Error("The server returned an invalid parent response.");
    }

    if (!response.ok || !data.success) {
      throw new Error(
        data.error || "Unable to load the parent space."
      );
    }

    renderParentSpace(data);
  } catch (error) {
    console.error("Parent Space error:", error);

    panelBodyElement.innerHTML = `
      <div class="parent-space">
        <div class="parent-space-error">
          <strong>Could not load Parent Space.</strong>
          <p>${escapeParentText(
            error.message || "Unable to load your family learning information."
          )}</p>
          <button class="panel-action" type="button" data-action="parent-space">
            Try again
          </button>
          <button class="panel-action secondary" type="button" data-action="close">
            Close
          </button>
        </div>
      </div>
    `;
  }
}

function escapeParentText(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderParentSpace(data) {
  const panelBodyElement = document.getElementById("panel-body");

  if (!panelBodyElement) return;

  const parent = data.parent || {};
  const children = Array.isArray(data.children) ? data.children : [];
  const results = Array.isArray(data.results) ? data.results : [];
  const analytics = data.analytics || {};

  const averageScore =
    typeof analytics.average_score === "number"
      ? analytics.average_score
      : 0;

  const childCards = children.length
    ? children.map(child => `
        <article class="parent-child-card">
          <div class="parent-child-card-top">
            <div>
              <span class="parent-card-kicker">LEARNER</span>
              <h3>${escapeParentText(
                child.name ||
                child.full_name ||
                child.username ||
                child.learner_id ||
                "Learner"
              )}</h3>
            </div>
            <span class="parent-child-status">Connected</span>
          </div>

          <p>
            ${escapeParentText(
              child.level ||
              child.grade ||
              child.class_name ||
              "Learning profile"
            )}
          </p>

          <button
            class="panel-action"
            type="button"
            data-action="parent-child"
            data-learner-id="${escapeParentText(
              child.learner_id || child.id || ""
            )}"
          >
            View learning progress
          </button>
        </article>
      `).join("")
    : `
        <div class="parent-empty">
          <strong>No learners connected yet.</strong>
          <p>
            Children connected to this parent account will appear here.
          </p>
        </div>
      `;

  const recentResults = results.length
    ? results.slice(0, 8).map(result => `
        <div class="parent-result-row">
          <div>
            <strong>${escapeParentText(
              result.subject || "Learning"
            )}</strong>
            <span>${escapeParentText(
              result.topic || result.question || "Assessment"
            )}</span>
          </div>
          <strong>${escapeParentText(
            result.score ?? result.mark ?? "-"
          )}</strong>
        </div>
      `).join("")
    : `
        <div class="parent-empty">
          No assessment results are available yet.
        </div>
      `;

  panelBodyElement.innerHTML = `
    <div class="parent-space">

      <section class="parent-welcome">
        <div>
          <span class="parent-card-kicker">PARENT SPACE</span>
          <h2>
            Welcome${parent.name ? ", " + escapeParentText(parent.name) : ""}.
          </h2>
          <p>
            See the learning activity and progress of the children connected
            to your account.
          </p>
        </div>
      </section>

      <section class="parent-stat-grid">
        <div class="parent-stat">
          <span>Children</span>
          <strong>${escapeParentText(
            analytics.total_children ?? children.length
          )}</strong>
        </div>

        <div class="parent-stat">
          <span>Assessments</span>
          <strong>${escapeParentText(
            analytics.total_assessments ?? results.length
          )}</strong>
        </div>

        <div class="parent-stat">
          <span>Average score</span>
          <strong>${escapeParentText(averageScore)}</strong>
        </div>
      </section>

      <section class="parent-section">
        <div class="parent-section-heading">
          <div>
            <span class="parent-card-kicker">FAMILY LEARNING</span>
            <h2>Your children</h2>
          </div>
        </div>

        <div class="parent-child-grid">
          ${childCards}
        </div>
      </section>

      <section class="parent-section">
        <div class="parent-section-heading">
          <div>
            <span class="parent-card-kicker">RECENT ACTIVITY</span>
            <h2>Recent results</h2>
          </div>
        </div>

        <div class="parent-results">
          ${recentResults}
        </div>
      </section>

      <section class="parent-tools">
        <button
          class="panel-action"
          type="button"
          data-action="parent-space"
        >
          Refresh Parent Space
        </button>

        <button
          class="panel-action secondary"
          type="button"
          data-panel-action="meetings"
        >
          Meetings
        </button>

        <button
          class="panel-action secondary"
          type="button"
          data-action="close"
        >
          Close
        </button>
      </section>

    </div>
  `;
}

document.addEventListener("click", function (event) {
  const card = event.target.closest(".teacher-learner-card");
  if (!card) return;

  const learnerId = card.dataset.teacherLearnerId;
  if (learnerId) {
    openTeacherLearnerView(learnerId);
  }
});

document.addEventListener("keydown", function (event) {
  if (event.key !== "Enter" && event.key !== " ") return;

  const card = event.target.closest(".teacher-learner-card");
  if (!card) return;

  event.preventDefault();

  const learnerId = card.dataset.teacherLearnerId;
  if (learnerId) {
    openTeacherLearnerView(learnerId);
  }
});

async function openTeacherDashboard() {
  const panelElement = document.getElementById("experience-panel");
  const panelBodyElement = document.getElementById("panel-body");
  const panelKickerElement = document.getElementById("panel-kicker");
  const panelTitleElement = document.getElementById("panel-title");
  const panelDescriptionElement =
    document.getElementById("panel-description");

  if (!panelElement || !panelBodyElement) {
    return;
  }

  panelKickerElement.textContent = "TEACHER SPACE";
  panelTitleElement.textContent = "Teacher dashboard";
  panelDescriptionElement.textContent =
    "Your classes, learners and assessment activity.";

  panelBodyElement.innerHTML = `
    <article class="panel-card">
      <h3>Loading teacher dashboard...</h3>
      <p>Connecting to your existing Dream Education teacher data.</p>
    </article>
  `;

  document.body.classList.add("panel-open");
  panelElement.setAttribute("aria-hidden", "false");

  const data = await fetchTeacherDashboard();


  if (!data.success) {
    panelBodyElement.innerHTML = `
      <article class="panel-card">
        <h3>Unable to load dashboard</h3>
        <p>${escapeHTML(data.error || "Something went wrong.")}</p>
      </article>

      <div class="panel-actions teacher-dashboard-actions">
        <button
          class="panel-button"
          type="button"
          data-panel-action="close-dashboard">
          Close
        </button>
      </div>
    `;
    return;
  }

  panelBodyElement.innerHTML = teacherDashboardMarkup(data);
}

window.DreamEducationTeacher = {
  ...(window.DreamEducationTeacher || {}),
  fetchDashboard: fetchTeacherDashboard,
  openDashboard: openTeacherDashboard
};

/* ============================================================
   LEARNER DASHBOARD — BACKEND INTEGRATION
   Uses the authenticated learner account.
   ============================================================ */

let learnerDashboardRequest = null;

async function fetchLearnerDashboard() {
  if (learnerDashboardRequest) {
    return learnerDashboardRequest;
  }

  learnerDashboardRequest = (async function () {
  const auth =
    window.DreamEducationUI && window.DreamEducationUI.getAuth
      ? window.DreamEducationUI.getAuth()
      : null;

  if (!auth || !auth.success) {
    return {
      success: false,
      error: "Please sign in first."
    };
  }

  const account = auth.account || {};
  const learnerId =
    account.learner_id ||
    (auth.learner && auth.learner.learner_id) ||
    (auth.profile && auth.profile.learner_id);

  if (!learnerId) {
    return {
      success: false,
      error: "Authenticated learner ID was not found."
    };
  }

  try {
    const headers = {
      "Content-Type": "application/json"
    };

    if (auth.session && auth.session.access_token) {
      headers.Authorization = "Bearer " + auth.session.access_token;
    }

    const controller = new AbortController();
    const timeout = setTimeout(function () {
      controller.abort();
    }, 9000);

    let response;

    try {
      response = await fetch(
        "/api/product/learner/" +
        encodeURIComponent(learnerId) +
        "/dashboard",
        {
          method: "GET",
          headers,
          credentials: "same-origin",
          signal: controller.signal
        }
      );
    } finally {
      clearTimeout(timeout);
    }

    const responseText = await response.text();
    let data;

    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      return {
        success: false,
        error: "The learner dashboard returned an invalid server response."
      };
    }

    if (!response.ok || !data.success) {
      return {
        success: false,
        error: data.error || "Could not load learner dashboard."
      };
    }

    return data;
  } catch (error) {
    console.error("Learner dashboard error:", error);

    return {
      success: false,
      error:
        error && error.name === "AbortError"
          ? "The learner dashboard took too long to respond. Please try again."
          : "Could not connect to the learner dashboard."
    };
  }
  })();

  try {
    return await learnerDashboardRequest;
  } finally {
    learnerDashboardRequest = null;
  }
}

function learnerDashboardMarkup(data) {
  if (!data || !data.success) {
    return `
      <div class="panel-card">
        <h3>Dashboard unavailable</h3>
        <p>${escapeHtml(
          data && data.error
            ? data.error
            : "Could not load your learner dashboard."
        )}</p>
      </div>
    `;
  }

  const learner = data.learner || {};
  const learning = data.learning || {};
  const results = data.results || {};
  const next = data.next || {};
  const progress = learning.progress || {};

  const learningJourney = data.learning_journey || {};
  const development = data.development || {};
  const developmentCapabilities = Array.isArray(development.capabilities)
    ? development.capabilities
    : [];
  const developmentGoals = Array.isArray(development.goals)
    ? development.goals
    : [];
  const developmentGaps = Array.isArray(development.gaps)
    ? development.gaps
    : [];
  const developmentEvidence = Array.isArray(development.evidence)
    ? development.evidence
    : [];
  const developmentDirections = Array.isArray(development.directions)
    ? development.directions
    : [];

  const capabilityHTML = developmentCapabilities.length
    ? developmentCapabilities.slice(0, 8).map(function (item) {
        return `
          <div class="teacher-result-row">
            <div>
              <strong>${escapeHtml(item.name || item.id || "Capability")}</strong>
              <span>${escapeHtml(item.state || "unknown")} · ${escapeHtml(String(item.evidence_ids?.length || 0))} evidence</span>
            </div>
            <strong>${escapeHtml(String(Math.round((Number(item.confidence) || 0) * 100)))}%</strong>
          </div>
        `;
      }).join("")
    : `<div class="teacher-result-empty">No capabilities demonstrated yet.</div>`;

  const goalsHTML = developmentGoals.length
    ? developmentGoals.slice(0, 6).map(function (item) {
        return `
          <div class="teacher-result-row">
            <div>
              <strong>${escapeHtml(item.title || "Goal")}</strong>
              <span>${escapeHtml(item.status || "active")}</span>
            </div>
            <strong>${escapeHtml(String(Math.round((Number(item.progress) || 0) * 100)))}%</strong>
          </div>
        `;
      }).join("")
    : `<div class="teacher-result-empty">No goals created yet.</div>`;

  const gapsHTML = developmentGaps.length
    ? developmentGaps.slice(0, 8).map(function (item) {
        return `
          <div class="teacher-result-row">
            <div>
              <strong>${escapeHtml(item.name || item.capability_id || "Capability gap")}</strong>
              <span>Target ${escapeHtml(String(Math.round((Number(item.target) || 0) * 100)))}%</span>
            </div>
            <strong>${escapeHtml(String(Math.round((Number(item.gap) || 0) * 100)))}%</strong>
          </div>
        `;
      }).join("")
    : `<div class="teacher-result-empty">No current capability gaps identified.</div>`;

  const evidenceHTML = developmentEvidence.length
    ? developmentEvidence.slice(-8).reverse().map(function (item) {
        return `
          <div class="teacher-result-row">
            <div>
              <strong>${escapeHtml(item.title || "Evidence")}</strong>
              <span>${escapeHtml(item.type || "evidence")} · ${item.verified ? "verified" : "unverified"}</span>
            </div>
            <strong>${escapeHtml(String(Math.round((Number(item.confidence) || 0) * 100)))}%</strong>
          </div>
        `;
      }).join("")
    : `<div class="teacher-result-empty">No evidence recorded yet.</div>`;

  const directionsHTML = developmentDirections.length
    ? developmentDirections.slice(0, 6).map(function (item) {
        return `
          <div class="teacher-result-row">
            <div>
              <strong>${escapeHtml(item.name || item.id || "Direction")}</strong>
              <span>Possibility — not a prescription</span>
            </div>
            <strong>${escapeHtml(String(Math.round((Number(item.score) || 0) * 100)))}%</strong>
          </div>
        `;
      }).join("")
    : `<div class="teacher-result-empty">No directions to explore yet.</div>`;

  const subjectHistory = Array.isArray(learningJourney.subject_history)
    ? learningJourney.subject_history
    : [];
  const topicProgression = Array.isArray(learningJourney.topic_progression)
    ? learningJourney.topic_progression
    : [];
  const assessmentProgression = Array.isArray(learningJourney.assessment_progression)
    ? learningJourney.assessment_progression
    : [];
  const journeyHistory = Array.isArray(learningJourney.history)
    ? learningJourney.history
    : [];
  const journeyAssessments = Array.isArray(learningJourney.assessments)
    ? learningJourney.assessments
    : [];

  const subjectHistoryHTML = subjectHistory.length
    ? subjectHistory.slice(0, 8).map(function (item) {
        return `
          <div class="teacher-result-row">
            <div>
              <strong>${escapeHtml(item.subject || "General")}</strong>
              <span>${escapeHtml(String(item.assessments || 0))} assessments · ${escapeHtml(String(item.activities || 0))} activities</span>
            </div>
            <strong>${item.average_score == null ? "—" : escapeHtml(String(item.average_score) + "%")}</strong>
          </div>
        `;
      }).join("")
    : `<div class="teacher-result-empty">No subject history recorded yet.</div>`;

  const topicProgressionHTML = topicProgression.length
    ? topicProgression.slice(0, 8).map(function (item) {
        return `
          <div class="teacher-result-row">
            <div>
              <strong>${escapeHtml(item.topic || "No topic")}</strong>
              <span>${escapeHtml(item.subject || "General")}</span>
            </div>
            <strong>${item.average_score == null ? "—" : escapeHtml(String(item.average_score) + "%")}</strong>
          </div>
        `;
      }).join("")
    : `<div class="teacher-result-empty">No topic progression recorded yet.</div>`;

  const assessmentProgressionHTML = assessmentProgression.length
    ? assessmentProgression.slice(-8).reverse().map(function (item) {
        const date = item.created_at
          ? new Date(item.created_at).toLocaleString()
          : "Date not recorded";
        return `
          <div class="teacher-result-row">
            <div>
              <strong>${escapeHtml(item.subject || "General")}</strong>
              <span>${escapeHtml(item.topic || "No topic")}</span>
            </div>
            <strong>${escapeHtml(String(item.score) + "%")}</strong>
            <small>${escapeHtml(date)}</small>
          </div>
        `;
      }).join("")
    : `<div class="teacher-result-empty">No scored assessments recorded yet.</div>`;

  const recentActivityHTML = journeyHistory.length
    ? journeyHistory.slice(0, 8).map(function (item) {
        const date = item.created_at
          ? new Date(item.created_at).toLocaleString()
          : "Date not recorded";
        return `
          <div class="teacher-result-row">
            <div>
              <strong>${escapeHtml(item.subject || "General")}</strong>
              <span>${escapeHtml(item.topic || "No topic")}</span>
              <small>${escapeHtml(item.question || "Learning activity")}</small>
            </div>
            <small>${escapeHtml(date)}</small>
          </div>
        `;
      }).join("")
    : `<div class="teacher-result-empty">No recent activity recorded yet.</div>`;

  const average =
    Number.isFinite(Number(results.average_score))
      ? Number(results.average_score)
      : Number(learning.assessment_average || 0);

  return `
    <div class="panel-card">
      <span class="panel-kicker">LEARNER DASHBOARD</span>
      <h2>Welcome back, ${escapeHtml(learner.name || "Learner")}</h2>
      <p>
        Your learning journey continues from where you left off.
      </p>
    </div>

    <div class="panel-grid">
      <div class="panel-card">
        <span class="panel-kicker">CURRENT LEARNING</span>
        <h3>${escapeHtml(
          learning.active_subject || "No subject selected"
        )}</h3>
        <p>
          Topic:
          <strong>${escapeHtml(
            learning.active_topic || "Not selected"
          )}</strong>
        </p>
      </div>

      <div class="panel-card">
        <span class="panel-kicker">LEARNING STATE</span>
        <h3>${escapeHtml(
          learning.learning_state || "Not started"
        )}</h3>
        <p>
          Mastery:
          <strong>${escapeHtml(
            learning.mastery_status || "not_started"
          )}</strong>
        </p>
      </div>

      <div class="panel-card">
        <span class="panel-kicker">PROGRESS</span>
        <h3>${escapeHtml(String(average))}%</h3>
        <p>
          Assessment average:
          <strong>${escapeHtml(
            String(learning.assessment_average || 0)
          )}%</strong>
        </p>
      </div>

      <div class="panel-card">
        <span class="panel-kicker">LEARNING RECORD</span>
        <h3>${escapeHtml(
          String(results.total || 0)
        )}</h3>
        <p>Recorded learning results</p>
      </div>
    </div>

    <div class="panel-card">
      <span class="panel-kicker">NEXT STEP</span>
      <h3>${escapeHtml(
        next.action || "Continue learning"
      )}</h3>
      <p>
        Topic:
        <strong>${escapeHtml(
          next.topic ||
          learning.active_topic ||
          "Choose a topic"
        )}</strong>
      </p>
    </div>

    <div class="panel-card">
      <span class="panel-kicker">MY LEARNING JOURNEY</span>
      <h3>My progress over time</h3>

      <div class="teacher-dashboard-card-label">SUBJECT HISTORY</div>
      <div class="teacher-results-list">
        ${subjectHistoryHTML}
      </div>

      <div class="teacher-dashboard-card-label">TOPIC PROGRESSION</div>
      <div class="teacher-results-list">
        ${topicProgressionHTML}
      </div>

      <div class="teacher-dashboard-card-label">ASSESSMENT PROGRESSION</div>
      <div class="teacher-results-list">
        ${assessmentProgressionHTML}
      </div>

      <div class="teacher-dashboard-card-label">RECENT ACTIVITY</div>
      <div class="teacher-results-list">
        ${recentActivityHTML}
      </div>

      <div class="teacher-connection-detail">
        <strong>Stored assessments</strong>
        <span>${escapeHtml(String(journeyAssessments.length))}</span>
      </div>
    </div>

    <div class="panel-card">
      <span class="panel-kicker">MY DEVELOPMENT</span>
      <h3>What you are becoming</h3>
      <p>
        Your learning creates evidence of capabilities, goals and progress.
      </p>

      <div class="teacher-dashboard-card-label">CAPABILITIES</div>
      <div class="teacher-results-list">
        ${capabilityHTML}
      </div>

      <div class="teacher-dashboard-card-label">GOALS</div>
      <div class="teacher-results-list">
        ${goalsHTML}
      </div>

      <div class="teacher-dashboard-card-label">GAPS</div>
      <div class="teacher-results-list">
        ${gapsHTML}
      </div>

      <div class="teacher-dashboard-card-label">EVIDENCE</div>
      <div class="teacher-results-list">
        ${evidenceHTML}
      </div>

      <div class="teacher-dashboard-card-label">DISCOVER</div>
      <div class="teacher-results-list">
        ${directionsHTML}
      </div>

      <div class="teacher-connection-detail">
        <strong>DREAM PASSPORT</strong>
        <span>${escapeHtml(String(development.passport?.demonstrated?.length || 0))} demonstrated</span>
      </div>

      <div class="teacher-dashboard-card-label">BUILD YOUR DEVELOPMENT</div>

      <div class="panel-actions" style="margin-top:12px;">
        <button class="panel-button primary" type="button"
          data-panel-action="dream-goal">
          + Goal
        </button>

        <button class="panel-button" type="button"
          data-panel-action="dream-project">
          + Project
        </button>

        <button class="panel-button" type="button"
          data-panel-action="dream-evidence">
          + Evidence
        </button>

        <button class="panel-button" type="button"
          data-panel-action="dream-discovery">
          + Discovery
        </button>
      </div>

      <div class="teacher-connection-detail">
        <strong>PROJECTS</strong>
        <span>${escapeHtml(String(Array.isArray(development.projects) ? development.projects.length : 0))}</span>
      </div>

      <div class="teacher-connection-detail">
        <strong>DISCOVERY SIGNALS</strong>
        <span>${escapeHtml(String(
          Object.values(development.discovery || {})
            .reduce((total, items) => total + (Array.isArray(items) ? items.length : 0), 0)
        ))}</span>
      </div>
    </div>

    <div class="panel-card">
      <span class="panel-kicker">PROFILE</span>
      <p>
        Learner ID:
        <strong>${escapeHtml(learner.learner_id || "Not available")}</strong>
      </p>
      <p>
        Level:
        <strong>${escapeHtml(learner.level || "Not set")}</strong>
      </p>
      <p>
        Learning method:
        <strong>${escapeHtml(
          learner.preferred_learning_method || "auto"
        )}</strong>
      </p>
    </div>

    <div class="panel-actions">
      <button class="panel-button primary" type="button"
          data-panel-action="ask-dream">Ask Dream Education</button>

        <button
          class="panel-button primary"
          type="button"
          data-panel-action="adaptive-learning">
          Continue Adaptive Learning
        </button>

        <button
          class="panel-button primary"
          type="button"
          data-panel-action="multimodal-learning">
          Choose how I learn
        </button>

        <button
        class="panel-button primary"
        type="button"
        data-panel-action="refresh-dashboard">
        Refresh dashboard
      </button>

      <button
        class="panel-button"
        type="button"
        data-panel-action="close-dashboard">
        Close
      </button>
    </div>
  `;
}

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Backward-compatible global alias used by older dashboard/connector markup.
function escapeHTML(value) {
  return escapeHtml(value);
}


/* ============================================================
   MULTIMODAL LEARNING — learner-controlled content delivery
   Uses the existing universal learning resource API.
   ============================================================ */
async function openMultimodalLearning() {
  const panel = document.getElementById("experience-panel");
  const panelKicker = document.getElementById("panel-kicker");
  const panelTitle = document.getElementById("panel-title");
  const panelDescription = document.getElementById("panel-description");
  const panelBody = document.getElementById("panel-body");
  if (!panel || !panelBody) return;

  const auth = getDreamEducationAuth();
  if (!auth || !auth.success) {
    if (typeof openPanel === "function") openPanel("signin");
    return;
  }

  const account = auth.account || {};
  const profile = auth.profile || auth.learner || {};
  const learnerId = account.learner_id || profile.learner_id || "";
  if (!learnerId) {
    panelKicker.textContent = "LEARNING MODES";
    panelTitle.textContent = "Learner account required.";
    panelDescription.textContent = "Sign in with a learner account to use multimodal learning.";
    panelBody.innerHTML = '<div class="de-error"><p>Learner identity was not found in the authenticated session.</p></div>';
    document.body.classList.add("panel-open");
    panel.setAttribute("aria-hidden", "false");
    return;
  }

  const defaultTopic =
    profile.active_topic || profile.topic || account.active_topic || account.topic || "";

  panelKicker.textContent = "MULTIMODAL LEARNING";
  panelTitle.textContent = "Choose how you learn.";
  panelDescription.textContent =
    "Ask for a topic, choose a learning mode, and Dream will retrieve matching educational content instead of forcing one format.";

  panelBody.innerHTML = `
    <div class="de-resource-workspace">
      <section class="de-resource-form de-highlight">
        <div class="de-section-title">
          <div>
            <span class="de-eyebrow">YOUR CHOICE</span>
            <h3>What do you want to learn?</h3>
          </div>
          <span>Content is matched to your topic, subject and level.</span>
        </div>
        <label for="de-resource-topic">Topic or question</label>
        <textarea id="de-resource-topic" rows="3" placeholder="e.g. photosynthesis, quadratic equations, the causes of World War I">${escapeHtml(defaultTopic)}</textarea>
        <div class="de-resource-search-row" style="margin-top:12px;">
          <select id="de-resource-mode" aria-label="Learning mode">
            <option value="any">Let Dream choose the best learning material</option>
            <option value="text">Read text / Read an explanation</option>
            <option value="video">Watch video</option>
            <option value="audio">Listen to audio</option>
          </select>
          <select id="de-resource-level" aria-label="Learning level">
            <option value="">Use my level automatically</option>
            <option value="Early learner">Early learner</option>
            <option value="Primary">Primary school</option>
            <option value="Secondary">Secondary school</option>
            <option value="Tertiary">Tertiary / university</option>
            <option value="Professional">Professional</option>
          </select>
          <button class="de-action primary" type="button" id="de-resource-search">Teach me this</button>
          <button class="de-action" type="button" id="de-resource-clear">Clear</button>
        </div>
        <div id="de-resource-status" class="de-muted" aria-live="polite" style="margin-top:10px;"></div>
      </section>

      <section class="de-section de-lesson-section">
        <div class="de-resource-summary">
          <div>
            <span class="de-eyebrow">VERIFIED LESSON</span>
            <h3>Understand it first</h3>
          </div>
          <span id="de-lesson-verification">Waiting for a topic.</span>
        </div>
        <article id="de-lesson-card" class="de-lesson-card">
          <p>Dream will deliver the verified explanation at the selected level, then provide inline text, video or audio for the same concept.</p>
        </article>
      </section>

      <section class="de-section">
        <div class="de-resource-summary">
          <div>
            <span class="de-eyebrow">LEARNING LIBRARY</span>
            <h3>Resources for this lesson</h3>
          </div>
          <span id="de-resource-count">Choose a topic to begin.</span>
        </div>
        <div id="de-resource-results" class="de-resource-grid">
          <div class="de-resource-empty">
            <strong>Choose a topic and a learning mode.</strong>
            <p>Dream can return inline text, watchable video and playable audio.</p>
          </div>
        </div>
      </section>

      <div class="de-actions de-bottom-actions">
        <button class="de-action" type="button" data-action="close">Back to dashboard</button>
        <button class="de-action primary" type="button" data-panel-action="adaptive-learning">Continue adaptive learning</button>
      </div>
    </div>
  `;

  document.body.classList.add("panel-open");
  panel.setAttribute("aria-hidden", "false");

  const searchButton = document.getElementById("de-resource-search");
  const clearButton = document.getElementById("de-resource-clear");
  const topicInput = document.getElementById("de-resource-topic");
  const modeInput = document.getElementById("de-resource-mode");
  const levelInput = document.getElementById("de-resource-level");
  const lessonCard = document.getElementById("de-lesson-card");
  const lessonVerification = document.getElementById("de-lesson-verification");
  const results = document.getElementById("de-resource-results");
  const status = document.getElementById("de-resource-status");
  const count = document.getElementById("de-resource-count");

  async function loadResources() {
    const topic = String(topicInput && topicInput.value || "").trim();
    const type = String(modeInput && modeInput.value || "any");
    const selectedLevel = String(levelInput && levelInput.value || "").trim();
    const effectiveLevel = selectedLevel || String(profile.level || account.level || "General");
    if (!topic) {
      status.textContent = "Enter a topic or question first.";
      if (topicInput) topicInput.focus();
      return;
    }

    searchButton.disabled = true;
    status.textContent = "Verifying the lesson and finding matching learning content...";
    lessonVerification.textContent = "Verifying…";
    lessonCard.innerHTML = '<div class="de-loading"><span></span><p>Building the right explanation for your level…</p></div>';
    results.innerHTML = '<div class="de-loading"><span></span><p></p></div>';

    try {
      const token = auth.session && auth.session.access_token;
      const learnHeaders = { "Content-Type": "application/json", Accept: "application/json" };
      if (token) learnHeaders.Authorization = "Bearer " + token;

      const learnResponse = await fetch("/api/learn", {
        method: "POST",
        headers: learnHeaders,
        credentials: "same-origin",
        body: JSON.stringify({
          question: topic,
          subject: profile.subject || account.subject || "",
          topic: topic,
          level: effectiveLevel,
          learner_id: learnerId,
          learner_name: account.name || profile.name || "Learner",
          learning_method: type === "any" ? "adaptive multimodal" : type
        })
      });
      const lesson = await learnResponse.json().catch(function () {
        return { success: false, message: "Invalid learning response." };
      });

      if (!learnResponse.ok || !lesson.success || !lesson.answer_verified) {
        throw new Error(lesson.message || lesson.error || "Dream could not verify the lesson.");
      }

      lessonVerification.textContent = lesson.answer_verified ? "Verified answer ✓ · " + effectiveLevel : "Verification unavailable";
      const sources = Array.isArray(lesson.answer_sources) ? lesson.answer_sources : [];
      const sourceNames = sources.slice(0, 4).map(function (source) {
        return escapeHtml(source.name || source.title || source.provider || "source");
      }).join(" · ");

      lessonCard.innerHTML =
        '<div class="de-lesson-answer">' +
          '<div class="de-lesson-badge">VERIFIED</div>' +
          '<div class="de-lesson-text">' + escapeHtml(lesson.answer || "No explanation returned.").replace(/\n/g, "<br>") + '</div>' +
          '<div class="de-lesson-actions">' +
            '<button class="de-action primary" type="button" id="de-lesson-listen">🔊 Listen to this lesson</button>' +
            '<button class="de-action" type="button" id="de-lesson-stop">Stop audio</button>' +
          '</div>' +
          (sourceNames ? '<div class="de-lesson-sources"><strong>Knowledge sources:</strong> ' + sourceNames + '</div>' : '') +
        '</div>';

      const listenButton = document.getElementById("de-lesson-listen");
      const stopButton = document.getElementById("de-lesson-stop");
      const lessonTextForAudio = String(lesson.answer || "").trim();

      if (listenButton) {
        listenButton.addEventListener("click", function () {
          if (!lessonTextForAudio) return;
          if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
            status.textContent = "Audio playback is not available in this browser.";
            return;
          }
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(lessonTextForAudio);
          utterance.lang = "en-US";
          utterance.rate = 0.95;
          utterance.pitch = 1;
          window.speechSynthesis.speak(utterance);
          status.textContent = "Dream is reading the verified lesson aloud.";
        });
      }

      if (stopButton) {
        stopButton.addEventListener("click", function () {
          if ("speechSynthesis" in window) window.speechSynthesis.cancel();
          status.textContent = "Audio stopped.";
        });
      }

      const params = new URLSearchParams({
        learner_id: learnerId,
        q: topic,
        type: type,
        subject: profile.subject || account.subject || "",
        level: effectiveLevel,
        limit: "8"
      });

      const headers = { Accept: "application/json" };
      if (token) headers.Authorization = "Bearer " + token;

      const response = await fetch("/api/v1/learning/resources?" + params.toString(), {
        method: "GET",
        headers: headers,
        credentials: "same-origin"
      });
      const data = await response.json().catch(function () {
        return { success: false, error: "Invalid server response." };
      });

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Learning resources could not be found.");
      }

      const resources = Array.isArray(data.resources) ? data.resources : [];
      const types = Array.isArray(data.requested_types) ? data.requested_types.join(", ") : type;
      count.textContent = resources.length + " matched resource" + (resources.length === 1 ? "" : "s") + " · " + types;
      status.textContent = resources.length
        ? "Dream found content for your selected learning mode."
        : "No strong matches were returned. Try a more specific topic or another mode.";

      results.innerHTML = resources.length
        ? resources.map(renderLearningResourceCard).join("")
        : '<div class="de-resource-empty"><strong>No matching content yet.</strong><p>Try a clearer topic, subject or a different learning mode.</p></div>';

      wireResourceActions(resources);
    } catch (error) {
      console.error("Multimodal learning resource error:", error);
      status.textContent = error.message || "Learning resources could not be found.";
      results.innerHTML = '<div class="de-error"><strong>Could not load learning content.</strong><p>' + escapeHtml(error.message || "Please try again.") + '</p></div>';
      count.textContent = "Unavailable";
    } finally {
      searchButton.disabled = false;
    }
  }

  function renderLearningResourceCard(resource) {
    const type = String(resource.type || "text").toLowerCase();
    const provider = escapeHtml(resource.source || resource.provider || "learning source");
    const title = escapeHtml(resource.title || resource.name || "Learning material");
    const description = escapeHtml(resource.description || "");
    const content = escapeHtml(resource.content || resource.description || "This material is ready to study.");
    const mediaUrl = resource.media_url || "";
    const embedUrl = resource.embed_url || "";
    const safeMediaUrl = /^https?:\/\//i.test(mediaUrl) ? mediaUrl : "";
    const safeEmbedUrl = /^https?:\/\//i.test(embedUrl) ? embedUrl : "";
    let visual = "";

    if (type === "text") {
      visual = '<div class="de-media-stage de-media-text-stage"><div class="de-resource-text">' +
        content.replace(/\n/g, "<br>") + '</div></div>';
    } else if (type === "audio" && safeMediaUrl) {
      visual = '<div class="de-media-stage de-media-audio-stage"><div><strong>' + title +
        '</strong><p>Play the audio here.</p></div><audio class="de-resource-audio de-resource-audio-player" controls preload="metadata" src="' +
        escapeHtml(safeMediaUrl) + '" data-resource-media="audio"></audio></div>';
    } else if (type === "video" && safeMediaUrl) {
      visual = '<div class="de-media-stage de-media-video-stage"><video class="de-resource-video" controls playsinline preload="metadata" src="' +
        escapeHtml(safeMediaUrl) + '" data-resource-media="video"></video><div class="de-media-caption">' + title + '</div></div>';
    } else if ((type === "video" || type === "audio") && safeEmbedUrl) {
      visual = '<div class="de-media-stage de-media-embed-stage"><iframe src="' + escapeHtml(safeEmbedUrl) +
        '" title="' + title + '" loading="lazy" allow="fullscreen; autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe></div>';
    }

    const playable = Boolean(visual);
    return '<article class="de-resource-card" data-resource-id="' +
      escapeHtml(String(resource.id || resource.url || resource.title || Math.random())) + '">' +
      visual +
      '<div class="de-resource-card-body">' +
        '<div class="de-resource-meta"><span>' + escapeHtml(type) + '</span><span>' + provider + '</span></div>' +
        '<h4>' + title + '</h4>' +
        (description && type !== "text" ? '<p>' + description + '</p>' : '') +
        '<div class="de-resource-source">Source: ' + provider + '</div>' +
        (playable ? '<div class="de-media-status">✓ Material is displayed here.</div>' :
          '<div class="de-media-status de-media-warning">This material is not playable in the current app view.</div>') +
        '<div class="de-resource-actions"><button class="de-action primary" type="button" data-resource-complete="1">I learned this</button></div>' +
      '</div></article>';
  }

  function wireResourceActions(resources) {
    const cards = Array.from(results.querySelectorAll(".de-resource-card"));
    cards.forEach(function (card, index) {
      const resource = resources[index];
      if (!resource) return;

      card.querySelectorAll("[data-resource-media]").forEach(function (media) {
        media.addEventListener("play", function () {
          recordResourceProgress(resource, false);
        }, { once: true });
        media.addEventListener("ended", async function () {
          try {
            await recordResourceProgress(resource, true);
            const complete = card.querySelector("[data-resource-complete]");
            if (complete) {
              complete.disabled = true;
              complete.textContent = "Recorded ✓";
            }
          } catch (_) {}
        }, { once: true });
      });

      const complete = card.querySelector("[data-resource-complete]");
      if (complete) {
        complete.addEventListener("click", async function () {
          complete.disabled = true;
          try {
            await recordResourceProgress(resource, true);
            complete.textContent = "Recorded ✓";
          } catch (error) {
            complete.disabled = false;
            complete.textContent = "Try again";
            console.warn("Learning resource completion was not recorded:", error);
          }
        });
      }
    });
  }

  async function recordResourceProgress(resource, completed) {
    try {
      const token = auth.session && auth.session.access_token;
      const headers = { "Content-Type": "application/json" };
      if (token) headers.Authorization = "Bearer " + token;

      await fetch("/api/v1/learning/resources/progress", {
        method: "POST",
        headers: headers,
        credentials: "same-origin",
        body: JSON.stringify({
          learner_id: learnerId,
          topic: String(topicInput && topicInput.value || "").trim(),
          subject: profile.subject || account.subject || "General",
          resource: resource,
          completed: completed === true,
          duration_seconds: 0
        })
      });
    } catch (error) {
      console.warn("Learning resource progress was not recorded:", error);
    }
  }

  searchButton.addEventListener("click", loadResources);
  topicInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) loadResources();
  });
  clearButton.addEventListener("click", function () {
    topicInput.value = "";
    results.innerHTML = '<div class="de-resource-empty"><strong>Choose a topic and a learning mode.</strong><p>Dream can return playable audio, watchable video, visible images, demonstrations, reading material and interactive resources.</p></div>';
    count.textContent = "Choose a topic to begin.";
    status.textContent = "";
    topicInput.focus();
  });

  if (defaultTopic) {
    loadResources();
  }
}

function getDreamEducationAuth() {
  try {
    const raw = localStorage.getItem("dream_education_auth");
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

async function openLearnerDashboard() {
  // The compact, media-first Learn hub is the canonical learner landing screen.
  // Keep the legacy dashboard renderer as a fallback only if the workspace bundle
  // is unavailable; this prevents the old information-heavy dashboard from
  // shadowing the new Learning Feed / Learner Progress hub.
  if (typeof window.openDreamLearningHub === "function") {
    window.openDreamLearningHub();
    return;
  }

  const panelBody = document.getElementById("panel-body");

  if (!panelBody) return;

  if (window.DreamEducationUI && window.DreamEducationUI.openPanel) window.DreamEducationUI.openPanel("learn");

  panelBody.innerHTML = `
    <div class="panel-card">
      <span class="panel-kicker">LEARNER DASHBOARD</span>
      <h2>Loading your dashboard...</h2>
      <p>Connecting to your Dream Education learning record.</p>
    </div>
  `;

  try {
    const data = await fetchLearnerDashboard();
    panelBody.innerHTML = learnerDashboardMarkup(data);
  } catch (error) {
    console.error("Learner dashboard render error:", error);
    panelBody.innerHTML = `
      <div class="panel-card">
        <span class="panel-kicker">LEARNER DASHBOARD</span>
        <h2>Dashboard could not be rendered</h2>
        <p>${escapeHtml(error && error.message ? error.message : "An unexpected dashboard error occurred.")}</p>
        <div class="panel-actions">
          <button class="panel-action" type="button" data-panel-action="refresh-dashboard">Try again</button>
          <button class="panel-action secondary" type="button" data-panel-action="close">Close</button>
        </div>
      </div>
    `;
  }
}


/* ============================================================
   LEARNER DASHBOARD — UI ACTIONS
   ============================================================ */

document.addEventListener("click", function (event) {
  const button = event.target.closest("[data-panel-action]");
  if (!button) return;

  const action = button.dataset.panelAction;

  if (action === "refresh-dashboard") {
    openLearnerDashboard();
    return;
  }

  if (action === "back-to-dashboard") {
    openLearnerDashboard();
    return;
  }

  if (action === "close-dashboard" || action === "close") {
    closePanel();
    return;
  }

  if (
    action === "dream-goal" ||
    action === "dream-project" ||
    action === "dream-evidence" ||
    action === "dream-discovery"
  ) {
    openDreamDevelopmentAction(action);
    return;
  }
});

document.addEventListener("click", function (event) {
  const searchAction = event.target.closest('[data-panel-action="authorized-search"]');
  if (searchAction) {
    event.preventDefault();

    const auth =
      typeof getAuth === "function"
        ? getAuth()
        : null;

    const token = auth?.session?.access_token || "";
    if (!token) {
      console.warn("Authorized Search: no authenticated session token.");
      return;
    }

    if (
      window.DreamEducationSearch &&
      typeof window.DreamEducationSearch.openAuthorizedSearch === "function"
    ) {
      window.DreamEducationSearch.openAuthorizedSearch();
    } else {
      console.error("Authorized Search module is not loaded.");
    }
    return;
  }

  const trigger = event.target.closest("[data-action]");

  if (!trigger) return;

  const panel = trigger.dataset.panel;

  if (
    trigger.dataset.action === "open" &&
    panel === "learn"
  ) {
    const auth =
      window.DreamEducationUI && window.DreamEducationUI.getAuth
        ? window.DreamEducationUI.getAuth()
        : null;

    if (auth && auth.success) {
      event.preventDefault();
      openLearnerDashboard();
    }
  }
});


async function openDreamDevelopmentAction(action) {
  const panelBody = document.getElementById("panel-body");
  if (!panelBody) return;

  const auth =
    window.DreamEducationUI &&
    window.DreamEducationUI.getAuth
      ? window.DreamEducationUI.getAuth()
      : null;

  const token =
    auth && auth.session && auth.session.access_token
      ? auth.session.access_token
      : null;

  const learnerId =
    auth && auth.account && auth.account.learner_id
      ? auth.account.learner_id
      : null;

  if (!token || !learnerId) {
    alert("Please log in again before using Dream Development.");
    return;
  }

  const labels = {
    "dream-goal": "CREATE GOAL",
    "dream-project": "CREATE PROJECT",
    "dream-evidence": "ADD EVIDENCE",
    "dream-discovery": "RECORD DISCOVERY"
  };

  let fields = "";

  if (action === "dream-goal") {
    fields = `
      <input id="dream-title" class="panel-input" placeholder="Goal title" />
      <textarea id="dream-description" class="panel-input" placeholder="What do you want to achieve?"></textarea>
      <input id="dream-capabilities" class="panel-input"
        placeholder="Required capabilities (comma separated)" />
    `;
  }

  if (action === "dream-project") {
    fields = `
      <input id="dream-title" class="panel-input" placeholder="Project title" />
      <textarea id="dream-description" class="panel-input" placeholder="What will you build or do?"></textarea>
      <input id="dream-goal-id" class="panel-input" placeholder="Goal ID (optional)" />
      <input id="dream-capabilities" class="panel-input"
        placeholder="Capability IDs (comma separated)" />
    `;
  }

  if (action === "dream-evidence") {
    fields = `
      <input id="dream-title" class="panel-input" placeholder="Evidence title" />
      <textarea id="dream-description" class="panel-input" placeholder="What did you demonstrate or accomplish?"></textarea>
      <input id="dream-capabilities" class="panel-input"
        placeholder="Capability IDs (comma separated)" />
      <input id="dream-project-id" class="panel-input" placeholder="Project ID (optional)" />
      <input id="dream-confidence" class="panel-input"
        type="number" min="0" max="1" step="0.05" value="0.7"
        placeholder="Confidence 0–1" />
    `;
  }

  if (action === "dream-discovery") {
    fields = `
      <input id="dream-kind" class="panel-input" value="interest"
        placeholder="Signal type" />
      <input id="dream-value" class="panel-input"
        placeholder="What are you interested in exploring?" />
      <input id="dream-strength" class="panel-input"
        type="number" min="0" max="1" step="0.05" value="0.7"
        placeholder="Strength 0–1" />
    `;
  }

  panelBody.innerHTML = `
    <div class="panel-card">
      <span class="panel-kicker">DREAM DEVELOPMENT</span>
      <h2>${escapeHtml(labels[action])}</h2>
      <p>Build your development record from real goals, actions and evidence.</p>

      <div style="display:grid;gap:12px;margin-top:18px;">
        ${fields}
        <button id="dream-submit-action"
          class="panel-button primary" type="button">
          Save
        </button>
        <button id="dream-cancel-action"
          class="panel-button" type="button">
          Cancel
        </button>
      </div>

      <div id="dream-action-status"></div>
    </div>
  `;

  document.getElementById("dream-cancel-action")
    ?.addEventListener("click", openLearnerDashboard);

  document.getElementById("dream-submit-action")
    ?.addEventListener("click", async function () {
      const status = document.getElementById("dream-action-status");

      const value = id => {
        const element = document.getElementById(id);
        return element ? element.value.trim() : "";
      };

      const list = value("dream-capabilities")
        .split(",")
        .map(item => item.trim())
        .filter(Boolean);

      let endpoint = "";
      let body = {};

      if (action === "dream-goal") {
        endpoint = "goal";
        body = {
          title: value("dream-title"),
          description: value("dream-description"),
          desired_capabilities: list.map(id => ({
            id,
            target: 0.75
          }))
        };
      }

      if (action === "dream-project") {
        endpoint = "project";
        body = {
          title: value("dream-title"),
          description: value("dream-description"),
          goal_id: value("dream-goal-id") || null,
          capability_ids: list
        };
      }

      if (action === "dream-evidence") {
        endpoint = "evidence";
        body = {
          title: value("dream-title"),
          description: value("dream-description"),
          capability_ids: list,
          project_id: value("dream-project-id") || null,
          type: "project",
          confidence: Number(value("dream-confidence") || 0.7)
        };
      }

      if (action === "dream-discovery") {
        endpoint = "discovery";
        body = {
          kind: value("dream-kind") || "interest",
          value: value("dream-value"),
          strength: Number(value("dream-strength") || 0.7)
        };
      }

      try {
        status.innerHTML = "<p>Saving...</p>";

        const response = await fetchWithTimeout(
          "/api/product/learner/" +
          encodeURIComponent(learnerId) +
          "/development/" +
          endpoint,
          {
            method: "POST",
            headers: {
              Authorization: "Bearer " + token,
              "Content-Type": "application/json",
              Accept: "application/json"
            },
            body: JSON.stringify(body)
          }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || "Could not save development data.");
        }

        await openLearnerDashboard();
      } catch (error) {
        status.innerHTML =
          "<p>" + escapeHtml(error.message || "Could not save.") + "</p>";
      }
    });
}

window.DreamEducationLearner = {
  fetchDashboard: fetchLearnerDashboard,
  openDashboard: openLearnerDashboard
};


/* DREAM EDUCATION — REAL ADAPTIVE QUESTION + ANSWER SUBMISSION */
async function openAdaptiveQuestion() {
  const panelBody = document.getElementById("panel-body");
  if (!panelBody) return;

  const auth =
    window.DreamEducationUI &&
    window.DreamEducationUI.getAuth
      ? window.DreamEducationUI.getAuth()
      : null;

  const learnerId =
    auth && auth.account && auth.account.learner_id
      ? auth.account.learner_id
      : auth && auth.learner && auth.learner.learner_id
        ? auth.learner.learner_id
        : null;

  const token =
    auth && auth.session && auth.session.access_token
      ? auth.session.access_token
      : null;

  if (!learnerId || !token) {
    panelBody.innerHTML = `
      <div class="panel-card">
        <span class="panel-kicker">SESSION REQUIRED</span>
        <h2>Please sign in again.</h2>
        <p>Your authenticated learning session is not available.</p>
      </div>
    `;
    return;
  }

  panelBody.innerHTML = `
    <div class="panel-card">
      <span class="panel-kicker">ADAPTIVE LEARNING</span>
      <h2>Selecting your next question...</h2>
      <p>Using your existing Dream Education learning record.</p>
    </div>
  `;

  try {
    const response = await fetch(
      "/api/adaptive-question/" + encodeURIComponent(learnerId),
      {
        headers: {
          Authorization: "Bearer " + token,
          Accept: "application/json"
        }
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(
        data.error ||
        data.message ||
        "Unable to select the next question."
      );
    }

    renderAdaptiveQuestion(data, learnerId, token);
  } catch (error) {
    console.error("Adaptive question error:", error);

    panelBody.innerHTML = `
      <div class="panel-card">
        <span class="panel-kicker">ADAPTIVE LEARNING</span>
        <h2>We couldn't load your next question.</h2>
        <p>${escapeHtml(error.message || "Please try again.")}</p>
      </div>

      <div class="panel-actions">
        <button
          class="panel-action secondary"
          type="button"
          data-panel-action="back-to-dashboard"
        >
          Back to dashboard
        </button>
      </div>
    `;
  }
}

function renderAdaptiveQuestion(data, learnerId, token) {
  const panelBody = document.getElementById("panel-body");
  if (!panelBody) return;

  const question = data.next_question || {};
  const performance = data.performance || {};

  panelBody.innerHTML = `
    <div class="panel-card">
      <span class="panel-kicker">ADAPTIVE LEARNING</span>
      <h2>${escapeHtml(question.subject || data.subject || "Learning")}</h2>
      <p>
        <strong>${escapeHtml(data.decision || "continue")}</strong>
        · ${escapeHtml(data.difficulty || "adaptive")}
      </p>
    </div>

    <div class="panel-card">
      <span class="panel-kicker">YOUR NEXT QUESTION</span>
      <h2>${escapeHtml(
        question.question || "No question was returned."
      )}</h2>
    </div>

    <div class="panel-card">
      <span class="panel-kicker">YOUR ANSWER</span>

      <textarea
        id="adaptive-answer"
        rows="6"
        placeholder="Write your answer here..."
        autocomplete="off"
      ></textarea>

      <div class="panel-actions">
        <button
          id="submit-adaptive-answer"
          class="panel-action"
          type="button"
        >
          Submit answer
        </button>

        <button
          class="panel-action secondary"
          type="button"
          data-panel-action="back-to-dashboard"
        >
          Back to dashboard
        </button>
      </div>

      <p id="adaptive-submit-status" class="panel-status"></p>
    </div>

    <div class="panel-card">
      <span class="panel-kicker">WHY THIS QUESTION</span>
      <p>${escapeHtml(
        data.reason || "Selected from your learning record."
      )}</p>
    </div>

    <div class="panel-card">
      <span class="panel-kicker">PERFORMANCE</span>
      <p>
        Average score:
        <strong>${escapeHtml(
          String(performance.average_score || 0)
        )}%</strong>
      </p>
      <p>
        Assessments:
        <strong>${escapeHtml(
          String(performance.assessments_count || 0)
        )}</strong>
      </p>
    </div>
  `;

  const submitButton =
    document.getElementById("submit-adaptive-answer");

  const answerBox =
    document.getElementById("adaptive-answer");

  if (!submitButton || !answerBox) return;

  submitButton.addEventListener("click", async () => {
    const learnerAnswer = answerBox.value.trim();

    if (!learnerAnswer) {
      answerBox.focus();
      setAdaptiveStatus(
        "Please write your answer before submitting.",
        true
      );
      return;
    }

    submitButton.disabled = true;
    answerBox.disabled = true;

    setAdaptiveStatus("Assessing your answer...");

    try {
      const auth =
        window.DreamEducationUI &&
        window.DreamEducationUI.getAuth
          ? window.DreamEducationUI.getAuth()
          : null;

      const learnerProfile =
        auth && auth.learner
          ? auth.learner
          : {};

      const profile =
        auth && auth.profile
          ? auth.profile
          : {};

      const payload = {
        learner_id: learnerId,
        name:
          (auth && auth.account && auth.account.name) ||
          learnerProfile.name ||
          profile.name ||
          "Learner",

        question: question.question || "",
        learner_answer: learnerAnswer,

        subject:
          question.subject ||
          data.subject ||
          profile.active_subject ||
          "General",

        topic:
          question.topic ||
          data.topic ||
          profile.active_topic ||
          null,

        level:
          question.level ||
          profile.level ||
          learnerProfile.level ||
          null,

        learning_method:
          learnerProfile.preferred_learning_method ||
          profile.preferred_learning_method ||
          "auto",

        custom_learning_method:
          learnerProfile.custom_learning_method ||
          profile.custom_learning_method ||
          null
      };

      const response = await fetch("/api/session", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ||
          result.message ||
          "Unable to assess your answer."
        );
      }

      // Enrich this completed assessment through the existing
      // evidence-grounded learning-session service.
      try {
        const sessionResponse = await fetch(
          "/api/v1/learner/" + encodeURIComponent(learnerId) + "/learning-session",
          {
            method: "POST",
            headers: {
              Authorization: "Bearer " + token,
              "Content-Type": "application/json",
              Accept: "application/json"
            },
            body: JSON.stringify({
              question: question.question || "",
              learner_answer: learnerAnswer,
              subject: question.subject || data.subject || "General",
              topic: question.topic || data.topic || null,
              level: question.level || null,
              score: Number(result.assessment?.score || 0),
              understanding: result.assessment?.understanding || "needs_practice",
              feedback: result.assessment?.feedback || "",
              evidence: result.answer_sources || [],
              cross_source_verification: result.cross_source_verification || null,
              prior_average: Number(result.trajectory?.previous_score ?? NaN),
              attempt_number: Number(result.mastery?.assessments || 1)
            })
          }
        );
        const sessionData = await sessionResponse.json().catch(() => null);
        if (sessionResponse.ok && sessionData?.success) {
          result.meaningful_session = sessionData.session;
        }
      } catch (sessionError) {
        console.warn("Meaningful learning-session enrichment skipped:", sessionError);
      }

      renderAssessmentResult(result, learnerId, token);
    } catch (error) {
      console.error("Adaptive answer submission error:", error);

      answerBox.disabled = false;
      submitButton.disabled = false;

      setAdaptiveStatus(
        error.message || "Unable to submit your answer.",
        true
      );
    }
  });
}

function setAdaptiveStatus(message, isError) {
  const status =
    document.getElementById("adaptive-submit-status");

  if (!status) return;

  status.textContent = message;
  status.dataset.state = isError ? "error" : "normal";
}

function renderAssessmentResult(result, learnerId, token) {
  const panelBody = document.getElementById("panel-body");
  if (!panelBody) return;

  const assessment = result.assessment || {};
  const teaching = result.teaching || {};
  const difficulty = result.difficulty || {};
  const mastery = result.mastery || {};
  const trajectory = result.trajectory || {};
  const decision = result.decision || {};
  const next = result.next_question || {};
  const session = result.meaningful_session || null;
  const sessionEvidence = session && Array.isArray(session.evidence)
    ? session.evidence
    : [];

  const evidenceMarkup = sessionEvidence.length
    ? sessionEvidence.slice(0, 5).map(function (source) {
        const status = source.cross_source_status || session.evidence_status || "verified";
        const support = Number(source.supporting_sources || 0);
        const conflict = Number(source.conflicting_sources || 0);
        return `
          <article class="panel-card learning-evidence-item">
            <span class="panel-kicker">EVIDENCE · ${escapeHtml(status)}</span>
            <h3>${escapeHtml(source.title || source.provider || "Verified source")}</h3>
            <p>${escapeHtml(source.provider || "Connected source")}</p>
            <p>
              ${support ? "Corroborated by " + support + " source(s)." : "Independently verified evidence."}
              ${conflict ? " " + conflict + " conflicting source(s) detected." : ""}
            </p>
            ${source.url ? '<div class="learning-evidence-source">Source: ' + escapeHtml(source.provider || "Verified source") + '</div>' : ""}
          </article>`;
      }).join("")
    : '<div class="panel-card"><span class="panel-kicker">EVIDENCE</span><p>No verified external evidence was available for this attempt. The protected learning engines remain authoritative.</p></div>';

  function getMeaningfulMarkup(session, evidenceMarkup) {
    return session
    ? `
      <section class="panel-card learning-session-purpose">
        <span class="panel-kicker">YOUR LEARNING SESSION</span>
        <h2>${escapeHtml(session.learning_objective || "Build understanding")}</h2>
        <p>${escapeHtml(session.teaching?.objective || "Strengthen your understanding through guided practice.")}</p>
        <div class="panel-actions">
          <span class="panel-status">Phase: ${escapeHtml(session.current_phase || "reflection")}</span>
          <span class="panel-status">Next action: ${escapeHtml(session.next_action || "continue")}</span>
        </div>
      </section>

      <section class="panel-card">
        <span class="panel-kicker">WHAT TO DO NOW</span>
        <h3>${escapeHtml(session.teaching?.instruction || "Explain the idea in your own words.")}</h3>
        <p>${escapeHtml(session.retrieval_prompt || "")}</p>
      </section>

      <section class="panel-card">
        <span class="panel-kicker">APPLY IT</span>
        <p>${escapeHtml(session.application_prompt || next.question || "Apply what you learned to a new example.")}</p>
      </section>

      <section>
        <div class="panel-kicker" style="margin:18px 0 8px;">EVIDENCE USED</div>
        <div class="learning-evidence-grid">${evidenceMarkup}</div>
      </section>
    `
    : "";
  }

  panelBody.innerHTML = `
    <div class="panel-card">
      <span class="panel-kicker">ASSESSMENT RESULT</span>
      <h2>${escapeHtml(String(assessment.score ?? 0))}%</h2>
      <p>
        Understanding:
        <strong>${escapeHtml(
          assessment.understanding || "assessed"
        )}</strong>
      </p>
    </div>

    <div class="panel-card">
      <span class="panel-kicker">FEEDBACK</span>
      <p>${escapeHtml(
        assessment.feedback ||
        "Your answer has been assessed."
      )}</p>
    </div>

    <div class="panel-card">
      <span class="panel-kicker">LEARNING STATE</span>
      <h2>${escapeHtml(
        result.learning_state || "updated"
      )}</h2>
      <p>
        Previous state:
        ${escapeHtml(
          result.previous_learning_state || "none"
        )}
      </p>
    </div>

    <div class="panel-card">
      <span class="panel-kicker">MASTERY</span>
      <p>
        Status:
        <strong>${escapeHtml(
          mastery.status || "not_started"
        )}</strong>
      </p>
      <p>
        Average score:
        <strong>${escapeHtml(
          String(mastery.average_score ?? 0)
        )}%</strong>
      </p>
      <p>
        Assessments:
        <strong>${escapeHtml(
          String(mastery.assessments ?? 0)
        )}</strong>
      </p>
    </div>

    <div class="panel-card">
      <span class="panel-kicker">LEARNING TRAJECTORY</span>
      <p>
        ${escapeHtml(
          trajectory.status || "stable"
        )}
      </p>
      <p>
        Previous score:
        ${escapeHtml(
          String(trajectory.previous_score ?? 0)
        )}%
      </p>
    </div>

    <div class="panel-card">
      <span class="panel-kicker">TEACHING MOVE</span>
      <h2>${escapeHtml(
        teaching.move || "Continue learning"
      )}</h2>
      <p>${escapeHtml(
        teaching.explanation ||
        "Your next learning step has been selected from your updated state."
      )}</p>
    </div>

    <div class="panel-card">
      <span class="panel-kicker">DIFFICULTY ADAPTATION</span>
      <p>
        Level:
        <strong>${escapeHtml(
          difficulty.level || "adaptive"
        )}</strong>
      </p>
      <p>
        Direction:
        ${escapeHtml(
          difficulty.direction || "continue"
        )}
      </p>
      <p>${escapeHtml(
        difficulty.reason || "Difficulty adjusted from your performance."
      )}</p>
    </div>

    <div class="panel-card">
      <span class="panel-kicker">NEXT STEP</span>
      <p>
        ${escapeHtml(
          decision.action || "continue"
        )}
        ·
        ${escapeHtml(
          decision.topic || next.topic || "Learning"
        )}
      </p>
    </div>

    <div class="panel-card">
      <span class="panel-kicker">NEXT QUESTION</span>
      <h2>${escapeHtml(
        next.question || "No next question was returned."
      )}</h2>

      <div class="panel-actions">
        <button
          id="continue-adaptive-learning"
          class="panel-action"
          type="button"
        >
          Continue
        </button>

        <button
          id="return-learning-dashboard"
          class="panel-action secondary"
          type="button"
        >
          Back to dashboard
        </button>
      </div>
    </div>
  `;

  const continueButton =
    document.getElementById("continue-adaptive-learning");

  if (continueButton) {
    continueButton.addEventListener("click", () => {
      renderAdaptiveQuestion(
        {
          success: true,
          subject: next.subject,
          decision: decision.action || "continue",
          difficulty: difficulty.level || "adaptive",
          reason:
            teaching.explanation ||
            "Continue building your understanding.",
          performance: {
            average_score: mastery.average_score || 0,
            assessments_count: mastery.assessments || 0
          },
          next_question: next
        },
        learnerId,
        token
      );
    });
  }

  const dashboardButton =
    document.getElementById("return-learning-dashboard");

  if (dashboardButton) {
    dashboardButton.addEventListener("click", () => {
      if (
        window.DreamEducationLearner &&
        window.DreamEducationLearner.openDashboard
      ) {
        window.DreamEducationLearner.openDashboard();
      }
    });
  }
}


/* ============================================================
   DREAM EDUCATION — ASK ANY QUESTION
   Uses the existing authenticated /api/learn intelligence.
   ============================================================ */

async function openAskDreamEducation() {
  const panelBody = document.getElementById("panel-body");
  if (!panelBody) return;

  const auth =
    window.DreamEducationUI &&
    window.DreamEducationUI.getAuth
      ? window.DreamEducationUI.getAuth()
      : null;

  const learner =
    auth && auth.learner
      ? auth.learner
      : {};

  const profile =
    auth && auth.profile
      ? auth.profile
      : {};

  const token =
    auth &&
    auth.session &&
    auth.session.access_token
      ? auth.session.access_token
      : null;

  const learnerId =
    auth &&
    auth.account &&
    auth.account.learner_id
      ? auth.account.learner_id
      : learner.learner_id || null;

  if (!token || !learnerId) {
    panelBody.innerHTML = `
      <div class="panel-card">
        <span class="panel-kicker">SESSION REQUIRED</span>
        <h2>Please sign in again.</h2>
        <p>Your authenticated learning session is not available.</p>
      </div>
    `;
    return;
  }

  const preferredMethod =
    learner.preferred_learning_method ||
    profile.preferred_learning_method ||
    "auto";

  panelBody.innerHTML = `
    <div class="panel-card">
      <span class="panel-kicker">ASK DREAM EDUCATION</span>
      <h2>What would you like to learn?</h2>
      <p>
        Ask a question in your own words. Dream Education will use your
        learning context and selected teaching method when preparing the answer.
      </p>
    </div>

    <div class="panel-card">
      <label for="dream-question"><strong>Your question</strong></label>
      <textarea
        id="dream-question"
        rows="6"
        placeholder="Example: Explain photosynthesis simply..."
        autocomplete="off"
      ></textarea>

      <label for="dream-subject"><strong>Subject</strong></label>
      <input
        id="dream-subject"
        type="text"
        value="${escapeHtml(profile.active_subject || "")}"
        placeholder="e.g. Mathematics, Physics, Biology"
        autocomplete="off"
      />

      <label for="dream-topic"><strong>Topic (optional)</strong></label>
      <input
        id="dream-topic"
        type="text"
        value="${escapeHtml(profile.active_topic || "")}"
        placeholder="e.g. Linear equations"
        autocomplete="off"
      />

      <label for="dream-learning-method">
        <strong>How should I teach you?</strong>
      </label>

      <select id="dream-learning-method">
        <option value="auto" ${preferredMethod === "auto" ? "selected" : ""}>
          Choose automatically
        </option>
        <option value="simple_explanation" ${preferredMethod === "simple_explanation" ? "selected" : ""}>
          Simple explanation
        </option>
        <option value="step_by_step" ${preferredMethod === "step_by_step" ? "selected" : ""}>
          Step by step
        </option>
        <option value="example_based" ${preferredMethod === "example_based" ? "selected" : ""}>
          Learn through examples
        </option>
        <option value="analogy" ${preferredMethod === "analogy" ? "selected" : ""}>
          Analogy
        </option>
        <option value="demonstration" ${preferredMethod === "demonstration" ? "selected" : ""}>
          Demonstration
        </option>
        <option value="listening" ${preferredMethod === "listening" ? "selected" : ""}>
          Listening
        </option>
      </select>

      <div class="panel-actions">
        <button
          id="submit-dream-question"
          class="panel-action"
          type="button"
        >
          Ask Dream Education
        </button>

        <button
          id="ask-back-dashboard"
          class="panel-action secondary"
          type="button"
        >
          Back to dashboard
        </button>
      </div>

      <p id="dream-question-status" class="panel-status"></p>
    </div>
  `;

  const questionBox = document.getElementById("dream-question");
  const subjectBox = document.getElementById("dream-subject");
  const topicBox = document.getElementById("dream-topic");
  const methodBox = document.getElementById("dream-learning-method");
  const submitButton = document.getElementById("submit-dream-question");
  const status = document.getElementById("dream-question-status");
  const backButton = document.getElementById("ask-back-dashboard");

  if (backButton) {
    backButton.addEventListener("click", () => {
      if (
        window.DreamEducationLearner &&
        window.DreamEducationLearner.openDashboard
      ) {
        window.DreamEducationLearner.openDashboard();
      }
    });
  }

  if (!submitButton || !questionBox) return;

  submitButton.addEventListener("click", async () => {
    const question = questionBox.value.trim();

    if (!question) {
      status.textContent = "Please enter your question first.";
      status.dataset.state = "error";
      questionBox.focus();
      return;
    }

    submitButton.disabled = true;
    questionBox.disabled = true;
    subjectBox.disabled = true;
    topicBox.disabled = true;
    methodBox.disabled = true;

    status.textContent = "Dream Education is preparing your answer...";
    status.dataset.state = "normal";

    try {
      const payload = {
        question,
        subject: subjectBox.value.trim() || profile.active_subject || "General",
        topic: topicBox.value.trim() || profile.active_topic || null,
        level:
          profile.level ||
          learner.level ||
          null,

        learner_id: learnerId,

        learner_name:
          (auth &&
            auth.account &&
            auth.account.name) ||
          learner.name ||
          profile.name ||
          "Learner",

        learning_method:
          methodBox.value ||
          preferredMethod ||
          "auto",

        custom_learning_method:
          learner.custom_learning_method ||
          profile.custom_learning_method ||
          null,

        mastery_status:
          profile.mastery_status ||
          profile.mastery ||
          null,

        average_score:
          profile.average_score ??
          null,

        learning_state:
          profile.learning_state ||
          null,

        decision_action:
          profile.decision_action ||
          null,

        decision_topic:
          profile.decision_topic ||
          null,

        trajectory:
          profile.trajectory ||
          null,

        previous_score:
          profile.previous_score ??
          null,

        difficulty:
          profile.difficulty ||
          null,

        difficulty_direction:
          profile.difficulty_direction ||
          null,

        difficulty_reason:
          profile.difficulty_reason ||
          null
      };

      const response = await fetch("/api/learn", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ||
          result.message ||
          "Dream Education could not answer the question."
        );
      }

      renderDreamAnswer(result, payload);

    } catch (error) {
      console.error("Ask Dream Education error:", error);

      questionBox.disabled = false;
      subjectBox.disabled = false;
      topicBox.disabled = false;
      methodBox.disabled = false;
      submitButton.disabled = false;

      status.textContent =
        error.message ||
        "Dream Education could not answer the question.";
      status.dataset.state = "error";
    }
  });

  questionBox.focus();
}

// Supported learner-facing material modes: Watch video · Read text · Listen to audio.
// Other provider capabilities are not rendered as learner materials.
function renderDreamLearningResources(resources) {
  const items = Array.isArray(resources)
    ? resources.filter(function (resource) {
        return resource && ["text", "video", "audio"].includes(resource.type);
      }).slice(0, 8)
    : [];
  if (!items.length) {
    return '<p class="panel-status">No external learning media was available for this question right now. You can still use the verified answer and ask for resources again.</p>';
  }

  function resourceType(type) {
    return ({
      video: "VIDEO",
      audio: "AUDIO",
      text: "TEXT"
    })[type] || "LEARNING RESOURCE";
  }

  return '<div class="dream-learning-resource-grid">' +
    items.map(function (resource) {
      const type = resource.type || "web";
      const title = escapeHtml(resource.title || "Learning resource");
      const description = escapeHtml(
        String(resource.description || "Open this resource to continue learning.").slice(0, 280)
      );
      const mediaUrl = escapeHtml(resource.media_url || "");
      const embedUrl = escapeHtml(resource.embed_url || "");
      const provider = escapeHtml(resource.provider || "Learning source");
      const license = resource.license
        ? '<small>' + escapeHtml(resource.license) + '</small>'
        : "";
      let media = "";

      if (type === "video" && embedUrl) {
        media =
          '<div class="dream-learning-resource-video">' +
          '<iframe src="' + embedUrl + '" title="' + title +
          '" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>' +
          '</div>';
      } else if (type === "video" && mediaUrl) {
        media =
          '<video class="dream-learning-resource-video-player de-resource-video-player" controls preload="metadata" poster="' +
          escapeHtml(resource.thumbnail || "") + '" src="' + mediaUrl + '"></video>';
      } else if (type === "audio" && mediaUrl) {
        media =
          '<div class="dream-learning-resource-audio">' +
          '<strong>Listen now</strong><audio controls preload="metadata" src="' + mediaUrl + '"></audio>' +
          '</div>';
      } else if (type === "text") {
        media = '<div class="de-resource-text">' + description + '</div>';
      }

      const fallback =
        '<div class="dream-learning-resource-no-media">' +
        '<strong>' + resourceType(type) + '</strong>' +
        '<p>This learning material is presented in Dream Education when playable content is available.</p>' +
        '</div>';

      return '<article class="dream-learning-resource-card">' +
        (media || fallback) +
        '<div class="dream-learning-resource-content">' +
        '<span class="panel-kicker">' + resourceType(type) + ' · ' + provider + '</span>' +
        '<h3>' + title + '</h3>' +
        '<p>' + description + '</p>' +
        license +
        '<div class="dream-learning-resource-source">Source: ' + provider + '</div>' +
        '</div>' +
        '</article>';
    }).join("") +
    '</div>';
}

const legacyMediaTypeExpression = 'type === "experiment" || type === "interactive"';

function dreamResourceIntent(question) {
  const text = String(question || "").toLowerCase();
  if (/\b(video|watch|youtube|visual lesson|documentary|lecture)\b/.test(text)) return "video";
  if (/\b(photo|picture|image|diagram|illustration|visual)\b/.test(text)) return "image";
  if (/\b(audio|listen|podcast|spoken|sound)\b/.test(text)) return "audio";
  if (/\b(experiment|lab|practical|simulation|simulate|interactive)\b/.test(text)) return "experiment";
  if (/\b(research|paper|academic|journal|evidence|citation)\b/.test(text)) return "research";
  if (/\b(book|textbook|chapter|reading)\b/.test(text)) return "book";
  return "any";
}

function renderAnswerResource(resource) {
  const rawType = resource && resource.type ? resource.type : "text";
  const type = ["text", "video", "audio"].includes(rawType) ? rawType : "text";
  const title = escapeHtml(resource && resource.title || "Learning resource");
  const description = escapeHtml(String(resource && resource.description || "").slice(0, 300));
  const mediaUrl = escapeHtml(resource && resource.media_url || "");
  const embedUrl = escapeHtml(resource && resource.embed_url || "");
  const provider = escapeHtml(resource && resource.provider || "Learning source");
  let media = "";
  if (type === "video" && embedUrl) media = '<div class="dream-answer-resource-video"><iframe src="' + embedUrl + '" title="' + title + '" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>';
  else if (type === "video" && mediaUrl) media = '<video class="dream-answer-resource-video-player" controls preload="metadata" poster="' + escapeHtml(resource.thumbnail || "") + '" src="' + mediaUrl + '"></video>';
  else if (type === "audio" && mediaUrl) media = '<div class="dream-answer-resource-audio"><strong>Listen</strong><audio controls preload="metadata" src="' + mediaUrl + '"></audio></div>';
  else if (type === "text") media = '<div class="de-resource-text">' + description + '</div>';

  return '<article class="dream-answer-resource-card">' + media + '<div class="dream-answer-resource-body"><span class="panel-kicker">' + escapeHtml(String(type).toUpperCase()) + ' · ' + provider + '</span><h3>' + title + '</h3>' + (description ? '<p>' + description + '</p>' : "") + '<div class="dream-answer-resource-source">Source: ' + provider + '</div></div></article>';
}

async function loadAnswerResources(question, payload, typeOverride) {
  const host = document.getElementById("dream-answer-resources");
  if (!host) return;
  const auth = window.DreamEducationUI && window.DreamEducationUI.getAuth ? window.DreamEducationUI.getAuth() : null;
  const token = auth && auth.session && auth.session.access_token ? auth.session.access_token : "";
  if (!token || !payload.learner_id) { host.innerHTML = '<p class="panel-status">Sign in is required to load learning media.</p>'; return; }
  const requestedType = typeOverride || dreamResourceIntent(question);
  const type = ["video", "audio", "text", "any"].includes(requestedType) ? requestedType : "text";
  const params = new URLSearchParams({q:question,type:type,learner_id:payload.learner_id,limit:"8"});
  host.innerHTML = '<div class="dream-answer-resource-loading">Finding your learning resources...</div>';
  try {
    const response = await fetch("/api/v1/learning/resources?" + params.toString(), {headers:{Authorization:"Bearer " + token,Accept:"application/json"}});
    const data = await response.json().catch(function(){return {};});
    if (!response.ok || data.success === false) throw new Error(data.error || "Learning resources could not be loaded.");
    const resources = Array.isArray(data.resources) ? data.resources : [];
    if (!resources.length) {
      host.innerHTML = '<div class="dream-answer-resource-empty"><strong>No matching resource was available right now.</strong><p>Try another format and Dream Education will search again.</p><div class="panel-actions"><button type="button" class="panel-action" data-answer-resource-type="video">Video</button><button type="button" class="panel-action" data-answer-resource-type="text">Text</button><button type="button" class="panel-action" data-answer-resource-type="audio">Audio</button></div></div>';
      return;
    }
    host.innerHTML = '<div class="dream-answer-resource-toolbar"><strong>' + resources.length + ' learning resources found</strong><span>' + escapeHtml(data.intent && data.intent.reason || "Matched to your learning request.") + '</span></div><div class="dream-answer-resource-grid">' + resources.map(renderAnswerResource).join("") + '</div>';
  } catch (error) {
    host.innerHTML = '<div class="dream-answer-resource-empty"><strong>Resource search could not complete.</strong><p>' + escapeHtml(error.message || "Please try again.") + '</p><div class="panel-actions"><button type="button" class="panel-action" data-answer-resource-type="' + escapeHtml(type) + '">Search again</button></div></div>';
  }
}
function renderDreamAnswer(result, payload) {
  const panelBody = document.getElementById("panel-body");
  if (!panelBody) return;

  const answer =
    result.answer ||
    "Dream Education did not return an answer.";

  const answerSourceMarkup = Array.isArray(result.answer_sources) && result.answer_sources.length
    ? '<ul class="answer-source-list">' +
      result.answer_sources
        .filter(function (source) { return source && source.name; })
        .slice(0, 6)
        .map(function (source) {
          const name = escapeHtml(source.name);
          const title = source.title ? ' — ' + escapeHtml(source.title) : '';
          return '<li><strong>' + name + '</strong>' + title + '<span class="answer-source-label">Source: ' + name + '</span></li>';
        })
        .join('') +
      '</ul>'
    : '<p>No external source was required; the answer came from a verified Dream Education learning source.</p>';

  panelBody.innerHTML = `
    <div class="panel-card">
      <span class="panel-kicker">DREAM EDUCATION ANSWER</span>
      <h2>${escapeHtml(payload.question)}</h2>
    </div>

    <div class="panel-card">
      <span class="panel-kicker">TEACHING</span>
      <div class="dream-answer">
        ${formatDreamAnswer(answer)}
      </div>
    </div>

    <div class="panel-card">
      <span class="panel-kicker">ANSWER INFORMATION</span>
      <p>
        Subject:
        <strong>${escapeHtml(payload.subject || "General")}</strong>
      </p>
      <p>
        Learning method:
        <strong>${escapeHtml(payload.learning_method || "auto")}</strong>
      </p>
      <p>
        Source mode:
        <strong>${result.cached ? "Cached answer" : "Fresh answer"}</strong>
      </p>
      <div class="panel-actions">
        <button id="listen-dream-answer" class="panel-action secondary" type="button">🔊 Listen to explanation</button>
      </div>
    </div>

    <div class="panel-card dream-learning-resources">
      <span class="panel-kicker">LEARN IT ANOTHER WAY</span>
      <h2>Video, text and audio learning</h2>
      <p>Dream found these learning resources for the same topic. The verified answer above remains the factual foundation.</p>
      ${renderDreamLearningResources(result.learning_resources)}
    </div>

    <div class="panel-card">
      <span class="panel-kicker">EVIDENCE USED</span>
      <div class="dream-answer">
        ${answerSourceMarkup}
      </div>
    </div>

        <div class="panel-card dream-answer-resources-panel">
      <span class="panel-kicker">LEARN WITH MEDIA</span>
      <h3>Learning resources for this request</h3>
      <p>Dream Education searches connected sources and places available media directly here.</p>
      <div id="dream-answer-resources" aria-live="polite"></div>
    </div>

<div class="panel-actions">
      <button
        id="ask-another-dream-question"
        class="panel-action"
        type="button"
      >
        Ask another question
      </button>

      <button
        id="answer-back-dashboard"
        class="panel-action secondary"
        type="button"
      >
        Back to dashboard
      </button>
    </div>
  `;

  const listenButton = document.getElementById("listen-dream-answer");
  if (listenButton) {
    listenButton.addEventListener("click", function () {
      if (!("speechSynthesis" in window)) {
        listenButton.textContent = "🔊 Audio unavailable on this device";
        return;
      }
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        listenButton.textContent = "🔊 Listen to explanation";
        return;
      }
      const utterance = new SpeechSynthesisUtterance(String(answer || ""));
      utterance.rate = 0.95;
      utterance.pitch = 1;
      listenButton.textContent = "⏹ Stop listening";
      utterance.addEventListener("end", function () {
        listenButton.textContent = "🔊 Listen to explanation";
      });
      window.speechSynthesis.speak(utterance);
    });
  }

  const anotherButton =
    document.getElementById("ask-another-dream-question");

  if (anotherButton) {
    anotherButton.addEventListener("click", () => {
      openAskDreamEducation();
    });
  }

  const dashboardButton =
    document.getElementById("answer-back-dashboard");

  if (dashboardButton) {
    dashboardButton.addEventListener("click", () => {
      if (
        window.DreamEducationLearner &&
        window.DreamEducationLearner.openDashboard
      ) {
        window.DreamEducationLearner.openDashboard();
      }
    });
  }
  loadAnswerResources(payload.question, payload);

  panelBody.addEventListener("click", function (event) {
    const button = event.target.closest("[data-answer-resource-type]");
    if (!button) return;
    loadAnswerResources(payload.question, payload, button.getAttribute("data-answer-resource-type") || "any");
  });
}

function formatDreamAnswer(answer) {
  return escapeHtml(String(answer))
    .replace(/\r\n/g, "\n")
    .replace(/\n\n+/g, "</p><p>")
    .replace(/\n/g, "<br>");
}

window.DreamEducationLearner = {
  ...(window.DreamEducationLearner || {}),
  fetchDashboard: fetchLearnerDashboard,
  openDashboard: openLearnerDashboard,
  openAsk: openAskDreamEducation
};


window.openMeetingRoom = function(data) {
  const meetingId = data && data.meeting ? data.meeting.meeting_id : null;
  if (!meetingId) return;

  const participant = data.participant || {};

  const params = new URLSearchParams();
  params.set("meeting_id", meetingId);
  params.set("role", participant.role || "participant");
  params.set("participant_id", participant.id || "");
  params.set("host", participant.is_host ? "1" : "0");

  window.location.href =
    "/meeting-room/index.html?" + params.toString();
};


/* ============================================================
   DREAM EDUCATION CONNECT CHAT
   Uses existing authenticated account + active connections.
   No separate chat identity or registration.
   ============================================================ */
(function () {
  "use strict";

  const CHAT_STYLE_ID = "dream-connect-chat-style";

  let chatState = {
    recipient: null,
    conversationId: "",
    key: null,
    polling: null
  };

  function chatAuth() {
    return window.DreamEducationUI &&
      typeof window.DreamEducationUI.getAuth === "function"
      ? window.DreamEducationUI.getAuth()
      : null;
  }

  function chatToken() {
    const auth = chatAuth();
    return auth &&
      auth.session &&
      auth.session.access_token
      ? auth.session.access_token
      : "";
  }

  function chatAccountId() {
    const auth = chatAuth();
    const account = auth && auth.account ? auth.account : {};
    const fields = {
      learner: "learner_id",
      teacher: "teacher_id",
      parent: "parent_id",
      school: "school_id"
    };
    return String(
      account[fields[String(account.role || "").toLowerCase()]] ||
      account.id ||
      ""
    );
  }

  function chatHeaders(extra) {
    return Object.assign(
      {
        Authorization: "Bearer " + chatToken(),
        Accept: "application/json"
      },
      extra || {}
    );
  }

  function chatEscape(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function chatConversationId(user) {
    const auth = chatAuth();
    const account = auth && auth.account ? auth.account : {};
    const myRole = String(account.role || "").toLowerCase();
    const myId = chatAccountId();

    const first = myRole + ":" + myId;
    const second =
      String(user.role || "").toLowerCase() + ":" +
      String(user.user_id || "");

    return [first, second].sort().join("__");
  }

  function bytesToBase64(bytes) {
    let binary = "";
    const chunk = 0x8000;

    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(
        null,
        bytes.subarray(i, Math.min(i + chunk, bytes.length))
      );
    }

    return btoa(binary);
  }

  function base64ToBytes(value) {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    return bytes;
  }

  async function getChatKey(conversationId) {
    const storageKey = "dream_chat_key_" + conversationId;
    const stored = localStorage.getItem(storageKey);

    if (stored) {
      return crypto.subtle.importKey(
        "jwk",
        JSON.parse(stored),
        { name: "AES-GCM" },
        false,
        ["encrypt", "decrypt"]
      );
    }

    const key = await crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );

    const jwk = await crypto.subtle.exportKey("jwk", key);
    localStorage.setItem(storageKey, JSON.stringify(jwk));

    return key;
  }

  async function encryptChatMessage(text, key) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(text);

    const ciphertext = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      encoded
    );

    return {
      ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
      iv: bytesToBase64(iv)
    };
  }

  async function decryptChatMessage(ciphertext, iv, key) {
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: base64ToBytes(iv) },
      key,
      base64ToBytes(ciphertext)
    );

    return new TextDecoder().decode(plain);
  }

  function installChatStyles() {
    if (document.getElementById(CHAT_STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = CHAT_STYLE_ID;

    style.textContent = `
      .de-connect-chat {
        display: grid;
        gap: 18px;
      }

      .de-chat-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
        padding-bottom: 16px;
        border-bottom: 1px solid rgba(255,255,255,.09);
      }

      .de-chat-title {
        margin: 0;
        font-size: clamp(24px, 5vw, 38px);
      }

      .de-chat-subtitle {
        margin: 7px 0 0;
        opacity: .65;
        line-height: 1.5;
      }

      .de-chat-layout {
        display: grid;
        grid-template-columns: minmax(180px, .7fr) minmax(0, 1.3fr);
        gap: 14px;
      }

      .de-chat-connections,
      .de-chat-conversation {
        border: 1px solid rgba(255,255,255,.09);
        border-radius: 20px;
        padding: 16px;
        background: rgba(255,255,255,.025);
      }

      .de-chat-people {
        display: grid;
        gap: 8px;
        margin-top: 12px;
      }

      .de-chat-person {
        width: 100%;
        border: 1px solid rgba(255,255,255,.08);
        border-radius: 14px;
        padding: 12px;
        text-align: left;
        color: inherit;
        background: rgba(255,255,255,.025);
        cursor: pointer;
      }

      .de-chat-person:hover,
      .de-chat-person.active {
        border-color: rgba(255,255,255,.28);
        background: rgba(255,255,255,.07);
      }

      .de-chat-person strong,
      .de-chat-person span {
        display: block;
      }

      .de-chat-person span {
        margin-top: 4px;
        font-size: 12px;
        opacity: .55;
        text-transform: capitalize;
      }

      .de-chat-messages {
        height: min(52vh, 480px);
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 9px;
        margin-top: 12px;
        padding: 8px 2px;
      }

      .de-chat-message {
        align-self: flex-start;
        max-width: 82%;
        padding: 10px 13px;
        border-radius: 15px 15px 15px 4px;
        background: rgba(255,255,255,.07);
        line-height: 1.45;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
      }

      .de-chat-message.mine {
        align-self: flex-end;
        border-radius: 15px 15px 4px 15px;
        background: rgba(255,255,255,.13);
      }

      .de-chat-compose {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 8px;
        margin-top: 12px;
      }

      .de-chat-compose input {
        width: 100%;
        min-width: 0;
        border: 1px solid rgba(255,255,255,.1);
        border-radius: 13px;
        padding: 12px 13px;
        background: rgba(255,255,255,.04);
        color: inherit;
        outline: none;
      }

      .de-chat-compose button,
      .de-chat-refresh {
        border: 1px solid rgba(255,255,255,.12);
        border-radius: 12px;
        padding: 10px 14px;
        color: inherit;
        background: rgba(255,255,255,.06);
        cursor: pointer;
      }

      .de-chat-empty {
        padding: 18px 8px;
        text-align: center;
        opacity: .55;
        line-height: 1.5;
      }

      @media (max-width: 720px) {
        .de-chat-layout {
          grid-template-columns: 1fr;
        }

        .de-chat-messages {
          height: 42vh;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function chatPanelHTML() {
    return `
      <div class="de-connect-chat">
        <div class="de-chat-header">
          <div>
            <span class="panel-kicker">CONNECTED EDUCATION</span>
            <h2 class="de-chat-title">Private Chat</h2>
            <p class="de-chat-subtitle">
              Chat privately with people who are already connected to your account.
            </p>
          </div>

          <button
            type="button"
            class="de-chat-refresh"
            id="de-chat-refresh"
          >
            Refresh
          </button>
        </div>

        <div class="de-chat-layout">
          <div class="de-chat-connections">
            <strong>Active connections</strong>
            <div id="de-chat-people">
              <div class="de-chat-empty">
                Loading active connections...
              </div>
            </div>
          </div>

          <div class="de-chat-conversation">
            <strong id="de-chat-recipient">
              Select a connection
            </strong>

            <div id="de-chat-messages" class="de-chat-messages">
              <div class="de-chat-empty">
                Tap a connected person to start a private conversation.
              </div>
            </div>

            <div class="de-chat-compose">
              <input
                id="de-chat-input"
                type="text"
                placeholder="Write a message..."
                autocomplete="off"
                disabled
              >

              <button
                id="de-chat-send"
                type="button"
                disabled
              >
                Send
              </button>
            </div>
          </div>
        </div>

        <div class="panel-actions">
          <button
            type="button"
            class="panel-action secondary"
            id="de-chat-back"
          >
            Back to Connect
          </button>
        </div>
      </div>
    `;
  }

  function stopChatPolling() {
    if (chatState.polling) {
      clearInterval(chatState.polling);
      chatState.polling = null;
    }
  }

  function installChatPanel() {
    const panelBody = document.getElementById("panel-body");
    if (!panelBody) return false;

    installChatStyles();

    panelBody.innerHTML = chatPanelHTML();

    document
      .getElementById("de-chat-refresh")
      ?.addEventListener("click", loadChatConnections);

    document
      .getElementById("de-chat-send")
      ?.addEventListener("click", sendChatMessage);

    document
      .getElementById("de-chat-input")
      ?.addEventListener("keydown", event => {
        if (event.key === "Enter") {
          event.preventDefault();
          sendChatMessage();
        }
      });

    document
      .getElementById("de-chat-back")
      ?.addEventListener("click", () => {
        stopChatPolling();

        if (
          window.DreamEducationUI &&
          typeof window.DreamEducationUI.openPanel === "function"
        ) {
          window.DreamEducationUI.openPanel("connect");
        }
      });

    return true;
  }

  async function loadChatConnections() {
    const peopleBox = document.getElementById("de-chat-people");
    if (!peopleBox) return;

    const token = chatToken();

    if (!token) {
      peopleBox.innerHTML =
        '<div class="de-chat-empty">Please sign in to use Chat.</div>';
      return;
    }

    peopleBox.innerHTML =
      '<div class="de-chat-empty">Loading active connections...</div>';

    try {
      const response = await fetch("/api/chat/users", {
        headers: chatHeaders()
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Could not load active connections."
        );
      }

      const users = Array.isArray(data.users) ? data.users : [];

      if (!users.length) {
        peopleBox.innerHTML =
          '<div class="de-chat-empty">No active connections yet.</div>';
        return;
      }

      peopleBox.innerHTML = users.map(user => `
        <button
          type="button"
          class="de-chat-person"
          data-chat-user-id="${chatEscape(user.user_id)}"
          data-chat-user-role="${chatEscape(user.role || "")}"
        >
          <strong>${chatEscape(user.display_name || user.user_id)}</strong>
          <span>${chatEscape(user.role || "Connected account")}</span>
        </button>
      `).join("");

      peopleBox
        .querySelectorAll(".de-chat-person")
        .forEach(button => {
          button.addEventListener("click", () => {
            selectChatRecipient({
              user_id: button.dataset.chatUserId,
              role: button.dataset.chatUserRole,
              display_name:
                button.querySelector("strong")?.textContent ||
                "Connection"
            });
          });
        });

      if (
        chatState.recipient &&
        users.some(
          user => String(user.user_id) === String(chatState.recipient.user_id)
        )
      ) {
        const current = users.find(
          user => String(user.user_id) === String(chatState.recipient.user_id)
        );

        if (current) {
          await selectChatRecipient(current, false);
        }
      }
    } catch (error) {
      console.error("Dream Education Chat connection error:", error);

      peopleBox.innerHTML =
        '<div class="de-chat-empty">Unable to load active connections.</div>';
    }
  }

  async function selectChatRecipient(user, reloadMessages = true) {
    chatState.recipient = user;
    chatState.conversationId = chatConversationId(user);
    chatState.key = await getChatKey(chatState.conversationId);

    document
      .querySelectorAll(".de-chat-person")
      .forEach(button => {
        button.classList.toggle(
          "active",
          button.dataset.chatUserId === String(user.user_id)
        );
      });

    const title = document.getElementById("de-chat-recipient");
    const input = document.getElementById("de-chat-input");
    const send = document.getElementById("de-chat-send");

    if (title) {
      title.textContent = user.display_name || user.user_id;
    }

    if (input) input.disabled = false;
    if (send) send.disabled = false;

    if (reloadMessages) {
      await loadChatMessages();
    }
  }

  async function loadChatMessages() {
    const box = document.getElementById("de-chat-messages");

    if (!box || !chatState.recipient) return;

    try {
      const params = new URLSearchParams({
        conversation_id: chatState.conversationId,
        recipient_id: chatState.recipient.user_id,
        recipient_role: chatState.recipient.role
      });

      const response = await fetch(
        "/api/chat/messages?" + params.toString(),
        {
          headers: chatHeaders()
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Could not load messages."
        );
      }

      const messages = Array.isArray(data.messages)
        ? data.messages
        : [];

      if (!messages.length) {
        box.innerHTML =
          '<div class="de-chat-empty">No messages yet. Start the conversation.</div>';
        return;
      }

      const myId = chatAccountId();

      box.innerHTML = "";

      for (const message of messages) {
        let messageText = "[Unable to decrypt message]";

        try {
          messageText = await decryptChatMessage(
            message.ciphertext,
            message.iv,
            chatState.key
          );
        } catch (error) {
          console.error("Chat message decryption error:", error);
        }

        const item = document.createElement("div");

        item.className =
          "de-chat-message" +
          (
            String(message.sender_id) === String(myId)
              ? " mine"
              : ""
          );

        item.textContent = messageText;
        box.appendChild(item);
      }

      box.scrollTop = box.scrollHeight;
    } catch (error) {
      console.error("Dream Education Chat message error:", error);

      box.innerHTML =
        '<div class="de-chat-empty">Unable to load messages.</div>';
    }
  }

  async function sendChatMessage() {
    if (!chatState.recipient || !chatState.key) return;

    const input = document.getElementById("de-chat-input");
    const send = document.getElementById("de-chat-send");

    const messageText = String(input?.value || "").trim();

    if (!messageText) return;

    if (input) input.disabled = true;
    if (send) send.disabled = true;

    try {
      const encrypted = await encryptChatMessage(
        messageText,
        chatState.key
      );

      const response = await fetch("/api/chat/messages", {
        method: "POST",
        headers: chatHeaders({
          "Content-Type": "application/json"
        }),
        body: JSON.stringify({
          conversation_id: chatState.conversationId,
          recipient_id: chatState.recipient.user_id,
          recipient_role: chatState.recipient.role,
          ciphertext: encrypted.ciphertext,
          iv: encrypted.iv
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Message could not be sent."
        );
      }

      if (input) input.value = "";

      await loadChatMessages();
    } catch (error) {
      console.error("Dream Education Chat send error:", error);
      alert(error.message || "Message could not be sent.");
    } finally {
      if (input) input.disabled = false;
      if (send) send.disabled = false;
      input?.focus();
    }
  }

  window.DreamEducationChat = {
    open: function () {
      if (!chatToken()) {
        alert("Please sign in to use Chat.");
        return;
      }

      if (!installChatPanel()) return;

      loadChatConnections();

      stopChatPolling();

      chatState.polling = setInterval(() => {
        if (chatState.recipient) {
          loadChatMessages();
        }
      }, 3000);
    },

    stop: stopChatPolling
  };
})();


  function openSubscription() {
    const panel = document.getElementById("experience-panel");
    const panelBody = document.getElementById("panel-body");
    const panelTitle = document.getElementById("panel-title");

    if (!panel || !panelBody || !panelTitle) {
      console.error("Subscription panel elements not found.");
      return;
    }

    panelTitle.textContent = "Subscription";

    panelBody.innerHTML = `
      <div class="subscription-page">
        <div class="subscription-header">
          <span class="subscription-kicker">DREAM EDUCATION</span>
          <h2>Choose your plan.</h2>
          <p>Choose the access period that works for you.</p>
        </div>

        <div class="subscription-plans">
          <button class="subscription-plan" type="button" data-subscription-plan="daily">
            <span>Daily</span>
            <strong>KES 30</strong>
            <small>1 day</small>
          </button>

          <button class="subscription-plan" type="button" data-subscription-plan="weekly">
            <span>Weekly</span>
            <strong>KES 100</strong>
            <small>7 days</small>
          </button>

          <button class="subscription-plan selected" type="button" data-subscription-plan="monthly">
            <span>Monthly</span>
            <strong>KES 350</strong>
            <small>30 days</small>
          </button>

          <button class="subscription-plan" type="button" data-subscription-plan="yearly">
            <span>Yearly</span>
            <strong>KES 3,000</strong>
            <small>365 days</small>
          </button>
        </div>

        <div class="subscription-checkout">
          <div class="subscription-selected">
            <span>Selected plan</span>
            <strong id="subscription-selected-plan">Monthly — KES 350</strong>
          </div>

          <div class="subscription-methods">

            <button class="subscription-method" type="button" data-payment-method="paypal">
              <strong>PayPal</strong>
              <span>Pay securely with PayPal</span>
            </button>
          </div>

<div id="subscription-payment-area">
  <div class="subscription-payment-box">
    <p>Continue to PayPal to complete your payment securely.</p>

    <button
      class="panel-button primary subscription-pay-button"
      type="button"
      data-subscription-pay="paypal"
    >
      Continue with PayPal
    </button>
  </div>
</div>

          <div id="subscription-message" class="subscription-message" aria-live="polite"></div>
        </div>

        <div class="panel-actions">
          <button class="panel-action secondary" type="button" data-action="close">
            Close
          </button>
        </div>
      </div>
    `;

    panel.classList.remove("hidden");
    document.body.classList.add("panel-open");

    let selectedPlan = "monthly";
    let paymentMethod = "paypal";

    const planDetails = {
      daily: "Daily — KES 30",
      weekly: "Weekly — KES 100",
      monthly: "Monthly — KES 350",
      yearly: "Yearly — KES 3,000"
    };

    const planButtons =
      panelBody.querySelectorAll("[data-subscription-plan]");

    const methodButtons =
      panelBody.querySelectorAll("[data-payment-method]");

    const selectedPlanElement =
      panelBody.querySelector("#subscription-selected-plan");

    const paymentArea =
      panelBody.querySelector("#subscription-payment-area");

    const message =
      panelBody.querySelector("#subscription-message");

    function renderPaymentMethod() {
      methodButtons.forEach(button => {
        button.classList.toggle(
          "active",
          button.dataset.paymentMethod === paymentMethod
        );
      });

      if (paymentMethod === "paypal") {
        paymentArea.innerHTML = `
          <div class="subscription-payment-box">
            <p>Continue to PayPal to complete your payment securely.</p>

            <button
              class="panel-button primary subscription-pay-button"
              type="button"
              data-subscription-pay="paypal"
            >
              Continue with PayPal
            </button>
          </div>
        `;
      }
    }

    planButtons.forEach(button => {
      button.addEventListener("click", function () {
        selectedPlan = button.dataset.subscriptionPlan;

        planButtons.forEach(item =>
          item.classList.remove("selected")
        );

        button.classList.add("selected");

        if (selectedPlanElement) {
          selectedPlanElement.textContent =
            planDetails[selectedPlan];
        }

        if (message) {
          message.textContent = "";
          message.className = "subscription-message";
        }
      });
    });

    methodButtons.forEach(button => {
      button.addEventListener("click", function () {
        paymentMethod = button.dataset.paymentMethod;
        renderPaymentMethod();

        if (message) {
          message.textContent = "";
          message.className = "subscription-message";
        }
      });
    });

    panelBody.addEventListener("click", async function (event) {
      const payButton =
        event.target.closest("[data-subscription-pay]");

      if (!payButton) return;

      const auth =
        window.DreamEducationUI &&
        typeof window.DreamEducationUI.getAuth === "function"
          ? window.DreamEducationUI.getAuth()
          : null;

      const token = auth?.session?.access_token;

      if (!token) {
        if (message) {
          message.textContent =
            "Please sign in before subscribing.";

          message.className =
            "subscription-message error";
        }

        return;
      }

      payButton.disabled = true;
      payButton.textContent = "Processing...";

      try {
        if (
          payButton.dataset.subscriptionPay === "paypal"
        ) {
          const response = await fetch(
            "/api/paypal/create-order",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
              },
              body: JSON.stringify({
                plan_id: selectedPlan
              })
            }
          );

          const data = await response.json();

          if (!response.ok || !data.success) {
            throw new Error(
              data.error ||
              "Unable to create PayPal order."
            );
          }

          if (!data.approval_url) {
            throw new Error(
              "PayPal approval link was not returned."
            );
          }

          window.location.href =
            data.approval_url;
        }
      } catch (error) {
        if (message) {
          message.textContent =
            error.message ||
            "Payment could not be started.";

          message.className =
            "subscription-message error";
        }

        payButton.disabled = false;

        payButton.textContent =
          payButton.dataset.subscriptionPay === "paypal"
            ? "Continue with PayPal"
            : "Continue with PayPal";
      }
    });
  }


/* PAYPAL RETURN / CAPTURE HANDLER */
async function handlePayPalReturn() {
  const params = new URLSearchParams(window.location.search);
  const paypalState = params.get("paypal");
  const orderId = params.get("order_id");

  if (paypalState === "cancelled") {
    window.history.replaceState({}, "", window.location.pathname);
    return;
  }

  if (paypalState !== "return" || !orderId) return;

  const auth =
    window.DreamEducationUI &&
    typeof window.DreamEducationUI.getAuth === "function"
      ? window.DreamEducationUI.getAuth()
      : null;

  const token = auth?.session?.access_token;

  if (!token) {
    console.error("PayPal return received without an authenticated session.");
    return;
  }

  try {
    const response = await fetch("/api/paypal/capture-order", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        order_id: orderId
      })
    });

    const data = await response.json();

    window.history.replaceState({}, "", window.location.pathname);

    if (!response.ok || !data.success) {
      console.error("PayPal payment capture failed:", data);
      return;
    }

    console.log("PayPal payment verified successfully:", data);

    const message = document.querySelector(".subscription-message");

    if (message) {
      message.textContent =
        `Payment successful. Your ${data.plan?.name || "subscription"} is now active.`;
      message.className = "subscription-message success";
    }

    if (
      window.DreamEducationUI &&
      typeof window.DreamEducationUI.openPanel === "function"
    ) {
      openSubscription();
    }
  } catch (error) {
    console.error("PayPal return handling failed:", error);
    window.history.replaceState({}, "", window.location.pathname);
  }
}

setTimeout(handlePayPalReturn, 0);
function openUniversalConnector() {
  const panel = document.getElementById("experience-panel");
  const panelBody = document.getElementById("panel-body");
  const panelTitle = document.getElementById("panel-title");
  const panelKicker = document.getElementById("panel-kicker");
  const panelDescription = document.getElementById("panel-description");

  if (!panel || !panelBody || !panelTitle) return;

  const auth = window.DreamEducationUI?.getAuth?.() || getAuth();
  const token = auth?.session?.access_token;

  if (!token) {
    if (panelKicker) panelKicker.textContent = "DREAM EDUCATION CONNECT";
    panelTitle.textContent = "Universal Connector";
    if (panelDescription) panelDescription.textContent = "Sign in to use connected communication channels.";
    panelBody.innerHTML = '<div class="panel-card"><h3>Sign in required</h3><p>Your account must be authenticated before Dream can send through connected destinations.</p></div><div class="panel-actions"><button class="panel-action" type="button" data-panel-action="signin">Sign in</button><button class="panel-action secondary" type="button" data-action="close">Close</button></div>';
    panel.classList.remove("hidden");
    document.body.classList.add("panel-open");
    return;
  }

  if (panelKicker) panelKicker.textContent = "DREAM EDUCATION CONNECT";
  panelTitle.textContent = "Universal Connector";
  if (panelDescription) panelDescription.textContent = "Write one message. Dream automatically sends it through every connected and authorized destination.";

  panelBody.innerHTML = `
    <div class="subscription-page universal-connector-simple">
      <div class="subscription-header">
        <span class="subscription-kicker">ONE MESSAGE. AUTOMATIC DELIVERY.</span>
        <h2>Send everywhere connected.</h2>
        <p>There is nothing to choose. Dream handles the connected platforms, channels and configured destinations automatically.</p>
      </div>

      <div class="panel-card">
        <label class="panel-label" for="messenger-subject">Email subject (optional)</label>
        <input class="panel-input" id="messenger-subject" maxlength="200" placeholder="Message from Dream Education" aria-label="Email subject" />
        <button class="panel-button secondary" id="messenger-load-contacts" type="button">Load public education contacts (first batch)</button>
        <p class="panel-description">Loads up to 100 published institutional contacts per batch from the owner-only registry. Review recipients before sending. Public listing does not confirm inbox delivery or user consent; use relevant, responsible outreach and include a clear opt-out.</p>
        <label class="panel-label" for="messenger-email-recipients">Email recipients (owner only; maximum 100 per send)</label>
        <textarea class="panel-input" id="messenger-email-recipients" rows="6" maxlength="12000" placeholder="Load a contact batch or enter recipients you are authorized to contact" aria-label="Email recipients"></textarea>
        <p class="panel-description">The registry contains public institutional education contacts, not confirmed Dream Education users or verified active inboxes. Loading a batch does not send anything. Review recipients and message carefully. Email delivery requires either Gmail SMTP credentials or a complete Resend configuration on the server.</p>
        <label class="panel-label" for="messenger-body">Message</label>
        <textarea class="panel-input" id="messenger-body" rows="10" maxlength="10000" placeholder="Write your message..." aria-label="Universal message"></textarea>
        <div id="messenger-status" class="subscription-message" aria-live="polite"></div>
        <button class="panel-button primary" id="messenger-send" type="button">Send</button>
      </div>

      <div id="messenger-receipts" class="panel-card" hidden>
        <h3>Delivery report</h3>
        <p id="messenger-summary"></p>
        <div id="messenger-receipt-list"></div>
      </div>

      <div class="panel-actions">
        <button class="panel-action secondary" type="button" data-action="close">Close</button>
      </div>
    </div>`;

  panel.classList.remove("hidden");
  document.body.classList.add("panel-open");

  const bodyInput = panelBody.querySelector("#messenger-body");
  const subjectInput = panelBody.querySelector("#messenger-subject");
  const emailRecipientsInput = panelBody.querySelector("#messenger-email-recipients");
  const loadEmailContacts = panelBody.querySelector("#messenger-load-contacts");
  const send = panelBody.querySelector("#messenger-send");
  const status = panelBody.querySelector("#messenger-status");
  const receiptsBox = panelBody.querySelector("#messenger-receipts");
  const summary = panelBody.querySelector("#messenger-summary");
  const receiptList = panelBody.querySelector("#messenger-receipt-list");

  const setStatus = (message, kind) => {
    status.textContent = message || "";
    status.className = "subscription-message" + (kind ? " " + kind : "");
  };
  let emailContactOffset = 0;
  loadEmailContacts?.addEventListener("click", async () => {
    loadEmailContacts.disabled = true;
    const originalLabel = loadEmailContacts.textContent;
    loadEmailContacts.textContent = "Loading contacts...";
    setStatus("Loading published education contacts for owner review...", "");
    try {
      const response = await fetch("/api/product/connect/messenger/email-contacts?offset=" + emailContactOffset + "&limit=100", { headers: { "Authorization": "Bearer " + token } });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) throw new Error(data.error || "Could not load public education contacts.");
      emailRecipientsInput.value = (Array.isArray(data.contacts) ? data.contacts : []).map(contact => String(contact.email || "").trim()).filter(Boolean).join("\n");
      if (data.next_offset === null) { emailContactOffset = 0; loadEmailContacts.textContent = "Reload first batch"; }
      else { emailContactOffset = data.next_offset; loadEmailContacts.textContent = "Load next batch (" + Math.min(Number(data.total) - emailContactOffset, 100) + " remaining)"; }
      setStatus("Loaded " + data.contacts.length + " of " + data.total + " public institutional contacts. Review the list before sending.", "success");
    } catch (error) {
      loadEmailContacts.textContent = originalLabel;
      setStatus(error.message || "Could not load public education contacts.", "error");
    } finally { loadEmailContacts.disabled = false; }
  });

  send.addEventListener("click", async () => {
    const body = bodyInput?.value.trim() || "";
    if (!body) {
      setStatus("Write a message first.", "error");
      bodyInput?.focus();
      return;
    }

    send.disabled = true;
    send.textContent = "Sending...";
    setStatus("Sending through every connected and authorized destination...", "");
    receiptsBox.hidden = true;
    summary.textContent = "";
    receiptList.innerHTML = "";

    try {
      const response = await fetch("/api/product/connect/messenger/broadcast", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + token
        },
        body: JSON.stringify({
          body,
          subject: subjectInput?.value.trim() || "",
          email_recipients: emailRecipientsInput?.value.trim() || undefined
        })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
          (data.status === "no_authorized_broadcast_target"
            ? "No connected and authorized delivery destination is configured."
            : "The message could not be delivered.")
        );
      }

      const attempted = Number(data.attempted || 0);
      const delivered = Number(data.delivered || 0);
      const scheduled = Number(data.scheduled || 0);
      const failed = Number(data.failed || 0);
      const accepted = delivered + scheduled;

      setStatus(
        scheduled && !delivered
          ? "Scheduled: " + scheduled + " of " + attempted + " destinations."
          : scheduled
            ? "Delivery confirmed: " + delivered + " delivered, " + scheduled + " scheduled."
            : "Delivery confirmed: " + delivered + " of " + attempted + " destinations.",
        failed ? "" : "success"
      );

      summary.textContent =
        "Message " + (data.message_id || "") +
        " · " + delivered + " delivered · " + scheduled + " scheduled · " + failed + " failed";

      const receipts = Array.isArray(data.receipts) ? data.receipts : [];
      receiptList.innerHTML = receipts.map((receipt) => {
        const name = receipt.connector_name || receipt.platform || "Destination";
        const state = receipt.status === "scheduled" ? "Scheduled" : receipt.success ? "Delivered" : "Not delivered";
        const target =
          receipt.recipient?.address ||
          receipt.recipient?.email ||
          receipt.recipient?.handle ||
          receipt.recipient?.name ||
          "";
        const result = receipt.result || {};
        const resultData = result.data || {};
        const detailParts = [
          receipt.error,
          result.error,
          resultData.message,
          resultData.error,
          resultData.code ? "code: " + resultData.code : "",
          resultData.stage ? "stage: " + resultData.stage : "",
          resultData.scheduledTime ? "Scheduled for " + resultData.scheduledTime : "",
          resultData.postGroupId ? "Publora post ID: " + resultData.postGroupId : "",
          result.status && !String(resultData.error || "").includes("HTTP " + result.status)
            ? "HTTP status " + result.status
            : ""
        ].filter(Boolean);
        const detail = String([...new Set(detailParts)].join(" · ")).trim().slice(0, 700);
        return '<div class="panel-card" style="margin-top:10px"><strong>' +
          escapeHTML(name) + '</strong><p>' +
          escapeHTML(state + (target ? " · " + target : "")) +
          '</p>' +
          (detail && (!receipt.success || receipt.status === "scheduled")
            ? '<p class="subscription-message' + (receipt.success ? '' : ' error') + '">' + escapeHTML((receipt.success ? '' : 'Reason: ') + detail) + '</p>'
            : '') +
          '</div>';
      }).join("");

      receiptsBox.hidden = false;
      send.textContent = "Sent";
    } catch (error) {
      setStatus(error.message || "The message could not be delivered.", "error");
      send.disabled = false;
      send.textContent = "Send";
    }
  });
}
