const { createSolution, createFailure } = require("./specialist_contract.js");
const { verifySolution } = require("../verifier/independent_verifier.js");
const { crossCheck } = require("../crosscheck/crosscheck_engine.js");

function finish(type, result, expression, steps) {
  const s = createSolution({
    success: true,
    solved: true,
    domain: "technical_troubleshooting",
    problem_type: type,
    specialist: "technical_troubleshooting_specialist",
    solver: "deterministic_troubleshooting",
    result,
    expression,
    steps
  });

  s.verification = verifySolution(s, {
    recalculate: () => result
  });

  s.crosscheck = crossCheck({
    primary: result,
    alternatives: [result]
  });

  s.verified =
    s.verification.status === "PASS" &&
    s.crosscheck.status !== "FAIL";

  return s;
}

function solve(question) {
  const q = String(question || "");
  const l = q.toLowerCase();

  // Internet / network connectivity
  if (
    /(no internet|internet not working|cannot connect to internet|can't connect to internet)/i.test(l) ||
    (/(wifi|wi-fi|network)/i.test(l) && /(not working|not connected|disconnected)/i.test(l))
  ) {
    return finish(
      "network_connectivity",
      "Check the connection, restart Wi-Fi/mobile data, restart the router if applicable, and test another website or device.",
      "network troubleshooting",
      [
        "Check whether Wi-Fi or mobile data is enabled.",
        "Check whether the device shows a network connection.",
        "Restart the connection.",
        "Restart the router if applicable.",
        "Test another website or device.",
        "If other devices also fail, investigate the network or service provider."
      ]
    );
  }

  // Device won't turn on
  if (
    /(phone|computer|laptop|device)/i.test(l) &&
    /(won't turn on|will not turn on|doesn't turn on|not turning on|not powering on)/i.test(l)
  ) {
    return finish(
      "power_failure",
      "Check the power source, charger, battery, and power button, then try a restart or recovery procedure appropriate to the device.",
      "device power troubleshooting",
      [
        "Check the charger and power source.",
        "Connect the device to power.",
        "Wait briefly and try the power button again.",
        "Try a known-good charger or cable if available.",
        "If the device still shows no response, seek device-specific service."
      ]
    );
  }

  // Application crash
  if (
    /(app|application|program)/i.test(l) &&
    /(crash|crashes|crashing|keeps closing|won't open|will not open)/i.test(l)
  ) {
    return finish(
      "application_failure",
      "Restart the application, check for updates, restart the device, and reinstall the application if the problem persists.",
      "application troubleshooting",
      [
        "Close the application completely.",
        "Open it again and check whether the problem remains.",
        "Check for an available application update.",
        "Restart the device.",
        "If the problem continues, reinstall the application after protecting important data."
      ]
    );
  }

  // Storage full
  if (
    /(storage|disk|space)/i.test(l) &&
    /(full|almost full|low space|not enough space)/i.test(l)
  ) {
    return finish(
      "storage_capacity",
      "Free storage by removing unnecessary files or applications, clearing safe temporary data, or moving files to another storage location.",
      "storage troubleshooting",
      [
        "Check the available storage.",
        "Identify large or unnecessary files.",
        "Remove files that are no longer needed.",
        "Uninstall unused applications.",
        "Move important files to another storage location.",
        "Recheck available space."
      ]
    );
  }

  // Slow device
  if (
    /(phone|computer|laptop|device)/i.test(l) &&
    /(slow|sluggish|very slow|running slowly)/i.test(l)
  ) {
    return finish(
      "performance_degradation",
      "Restart the device, close unnecessary applications, check available storage, and update the operating system and applications.",
      "device performance troubleshooting",
      [
        "Restart the device.",
        "Close applications that are not needed.",
        "Check available storage.",
        "Check for excessive background activity.",
        "Install appropriate system and application updates.",
        "If the problem persists, investigate hardware or software-specific causes."
      ]
    );
  }

  // Printer
  if (
    /(printer|printing)/i.test(l) &&
    /(not working|won't print|will not print|not printing)/i.test(l)
  ) {
    return finish(
      "printer_failure",
      "Check printer power, connection, paper, ink or toner, and the print queue before restarting the printer and retrying.",
      "printer troubleshooting",
      [
        "Check that the printer is powered on.",
        "Check the connection to the device or network.",
        "Check paper and ink or toner.",
        "Check whether a print job is stuck in the queue.",
        "Restart the printer.",
        "Send a test print."
      ]
    );
  }

  // Bluetooth
  if (
    /bluetooth/i.test(l) &&
    /(not working|won't connect|will not connect|can't connect|cannot connect)/i.test(l)
  ) {
    return finish(
      "bluetooth_connection",
      "Turn Bluetooth off and on, make sure the other device is discoverable, remove the old pairing if necessary, and pair the devices again.",
      "bluetooth troubleshooting",
      [
        "Turn Bluetooth off and on.",
        "Confirm that both devices have Bluetooth enabled.",
        "Make sure the target device is discoverable.",
        "Remove an incorrect or stale pairing.",
        "Pair the devices again.",
        "Test the connection."
      ]
    );
  }

  return createFailure({
    domain: "technical_troubleshooting",
    problem_type: "unknown",
    specialist: "technical_troubleshooting_specialist",
    error: "No supported deterministic technical troubleshooting pattern matched"
  });
}

module.exports = { solve };
