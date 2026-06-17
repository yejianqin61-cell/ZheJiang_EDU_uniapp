/**
 * 环境配置 —— 单一入口，消除硬编码。
 *
 * 规则：
 *   - H5 模式：从浏览器地址栏自动取 host，与 API 同域（nginx 代理 /v1/ → 后端）
 *   - 微信小程序：编译时替换为 https://真实域名
 *   - Dev 本地：localhost:3000 直连后端
 *
 * 所有文件和组件都从这里取，不要各自写死 URL。
 */

// === API 基础地址（用于 uni.request） ===
export function getApiBase(): string {
  // #ifdef H5
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') {
    return 'http://localhost:3000/v1';
  }
  return `${window.location.protocol}//${host}/v1`;
  // #endif

  // #ifdef MP-WEIXIN
  // 👇 小程序上线后改为: https://你的域名/v1
  return 'https://YOUR_DOMAIN/v1';
  // #endif

  return 'http://localhost:3000/v1';
}

// === 下载基础地址（用于 window.open / uni.downloadFile） ===
export function getDownloadBase(): string {
  // #ifdef H5
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') {
    return 'http://localhost:3000';
  }
  return window.location.origin;
  // #endif

  // #ifdef MP-WEIXIN
  // 👇 小程序上线后改为: https://你的域名
  return 'https://YOUR_DOMAIN';
  // #endif

  return 'http://localhost:3000';
}

/**
 * 拼接完整下载链接。
 * url 如果是绝对 URL 直接返回；否则拼接 scheme + host。
 */
export function buildDownloadUrl(url: string): string {
  if (url.startsWith('http')) return url;
  return `${getDownloadBase()}${url}`;
}
