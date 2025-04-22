import React from "react";
import ReactDOM from "react-dom/client";
import "./style.css";
import App from "./App";
import { patchUrlMappings } from "@discord/embedded-app-sdk";

console.log("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");

// これ自体はproxyではない
// fetchでfoo.comにリクエストしようとすると、実際にはlocalhost/fooapiにリクエストを発行する
// discord自体のproxyが、/foooapiをfoo.comにproxyしてくれる
// したがってdiscordのproxyがない環境で動作を再現するには…
patchUrlMappings([{ target: "foo.com", prefix: "/fooapi" }]);

console.log("bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb");

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
