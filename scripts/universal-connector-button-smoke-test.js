"use strict";
const fs=require("fs");
const path=require("path");
const source=fs.readFileSync(path.join(__dirname,"..","public","app.js"),"utf8");
if(!source.includes('data-panel-action="universal-connector">Open Universal Connector')) throw new Error("Connect button is not wired to universal-connector.");
if(source.includes('data-panel-action="universal-messenger">Open Universal Connector')) throw new Error("Legacy universal-messenger button action remains.");
if(!source.includes('if (action === "universal-connector")')) throw new Error("Universal Connector click handler missing.");
if(!source.includes("function openUniversalConnector()")) throw new Error("Universal Connector opener missing.");
console.log("Universal Connector button routing smoke test passed.");
