"use strict";

(() => {
  const generateButton = document.getElementById("generate");
  const clearButton = document.getElementById("clear");
  const status = document.getElementById("status");
  const accessKeyField = document.getElementById("access-key");
  const adminHashField = document.getElementById("admin-hash");
  const mediaSecretField = document.getElementById("media-secret");
  const copyButtons = [...document.querySelectorAll("[data-copy]")];
  const fields = [accessKeyField, adminHashField, mediaSecretField];
  let generation = 0;

  function base64url(bytes) {
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
  }

  function clearValues() {
    generation += 1;
    for (const field of fields) field.value = "";
    for (const button of copyButtons) button.disabled = true;
    generateButton.disabled = !window.crypto?.subtle;
    generateButton.textContent = "生成一组密钥";
    status.textContent = "已清空本页显示；剪贴板、密码管理器和线上配置未更改。";
  }

  generateButton.addEventListener("click", async () => {
    clearValues();
    const currentGeneration = generation;
    generateButton.disabled = true;
    status.textContent = "正在当前浏览器中生成密钥…";
    let accessBytes;
    let signingBytes;
    let encodedKey;
    let digestBytes;

    try {
      accessBytes = window.crypto.getRandomValues(new Uint8Array(32));
      signingBytes = window.crypto.getRandomValues(new Uint8Array(32));
      const accessKey = "csu_admin_" + base64url(accessBytes);
      encodedKey = new TextEncoder().encode(accessKey);
      digestBytes = new Uint8Array(await window.crypto.subtle.digest("SHA-256", encodedKey));

      // A clear action while digesting must not restore cleared values.
      if (generation !== currentGeneration) return;
      accessKeyField.value = accessKey;
      adminHashField.value = base64url(digestBytes);
      mediaSecretField.value = base64url(signingBytes);
      for (const button of copyButtons) button.disabled = false;
      generateButton.textContent = "重新生成一组密钥";
      status.textContent = "已在当前浏览器中生成。请先保存访问密钥，再将两项 Secret 填入 Cloudflare。";
    } catch {
      if (generation === currentGeneration) {
        status.textContent = "浏览器未能生成密钥。请使用支持 Web Crypto 的浏览器，通过 HTTPS 打开本页。";
      }
    } finally {
      accessBytes?.fill(0);
      signingBytes?.fill(0);
      encodedKey?.fill(0);
      digestBytes?.fill(0);
      if (generation === currentGeneration) generateButton.disabled = !window.crypto?.subtle;
    }
  });

  for (const button of copyButtons) {
    button.addEventListener("click", async () => {
      const field = document.getElementById(button.dataset.copy);
      if (!field.value) return;
      const currentGeneration = generation;
      try {
        await navigator.clipboard.writeText(field.value);
        if (generation === currentGeneration) status.textContent = "已复制所选内容，请粘贴到对应位置。";
      } catch {
        if (generation !== currentGeneration) return;
        field.focus();
        field.select();
        status.textContent = "浏览器未允许自动复制，已选中内容，请使用系统复制操作。";
      }
    });
  }

  clearButton.addEventListener("click", clearValues);
  window.addEventListener("pagehide", clearValues);

  if (!window.crypto?.subtle || !window.crypto?.getRandomValues) {
    generateButton.disabled = true;
    status.textContent = "当前浏览器无法使用 Web Crypto。请使用支持此功能的浏览器，通过 HTTPS 打开本页。";
  }
})();
