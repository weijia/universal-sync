/**
 * RemoteStorage服务器信息
 */
export interface RemoteStorageInfo {
  /**
   * 服务器地址
   */
  server: string;
  
  /**
   * WebDAV根路径
   */
  webdavPath: string;
  
  /**
   * OAuth认证端点
   */
  authEndpoint: string;
  
  /**
   * 支持的存储类型
   */
  storageTypes: string[];
}

/**
 * 使用WebFinger协议发现RemoteStorage端点
 * @param userAddress 用户地址，格式为user@example.com
 */
export async function discoverRemoteStorage(userAddress: string): Promise<RemoteStorageInfo> {
  const [user, domain] = userAddress.split('@');
  if (!user || !domain) {
    throw new Error('无效的用户地址格式，应为user@example.com');
  }

  try {
    // 1. 查询WebFinger端点
    const webfingerUrl = `https://${domain}/.well-known/webfinger?resource=acct:${userAddress}`;
    const response = await fetch(webfingerUrl, {
      headers: { 'Accept': 'application/jrd+json' }
    });

    if (!response.ok) {
      throw new Error(`WebFinger查询失败: ${response.status} ${response.statusText}`);
    }

    const webfinger = await response.json();

    // 2. 查找RemoteStorage链接
    const remoteStorageLink = webfinger.links?.find(
      (link: any) => link.rel === 'remotestorage'
    );

    if (!remoteStorageLink) {
      throw new Error('该用户未配置RemoteStorage服务');
    }

    // 3. 获取RemoteStorage服务信息
    const remoteStorageInfoUrl = remoteStorageLink.href;
    const infoResponse = await fetch(remoteStorageInfoUrl, {
      headers: { 'Accept': 'application/json' }
    });

    if (!infoResponse.ok) {
      throw new Error(`RemoteStorage信息查询失败: ${infoResponse.status} ${infoResponse.statusText}`);
    }

    const remoteStorageInfo = await infoResponse.json();

    return {
      server: remoteStorageInfo.server,
      webdavPath: remoteStorageInfo.webdavPath || '/',
      authEndpoint: remoteStorageInfo.authEndpoint,
      storageTypes: remoteStorageInfo.storageTypes || []
    };
  } catch (error) {
    console.error('RemoteStorage发现失败:', error);
    throw new Error(`无法发现RemoteStorage端点: ${error instanceof Error ? error.message : String(error)}`);
  }
}