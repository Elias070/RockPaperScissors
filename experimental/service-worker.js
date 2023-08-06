self.addEventListener("install", function (event) {
  console.log("SW installed");
});

self.addEventListener("activate", function (event) {
  console.log("SW activated");
});

this.addEventListener("fetch", function (event) {
  console.log("SW fetch");
});
