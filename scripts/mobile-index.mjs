import { copyFileSync } from "node:fs";
copyFileSync(".output/public/_shell.html", ".output/public/index.html");
console.log("index.html criado em .output/public");