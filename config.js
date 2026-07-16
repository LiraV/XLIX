// Адрес бэкенда (Yandex Cloud Function).
// В продакшене подставьте URL функции, например:
//   https://functions.yandexcloud.net/d4xxxxxxxxxxxxxxxxxx
// На localhost автоматически используется локальный dev-сервер (backend/local-server.js).
(function () {
  var PROD_API = "https://functions.yandexcloud.net/d4ei4fng002salk73tf7";
  var isLocal = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  window.ORDO_API = isLocal ? "http://localhost:8787/" : PROD_API;
})();
