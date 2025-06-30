import { RemoteStorageInfo } from './remoteStorageDiscovery';

/**
 * RemoteStorage认证令牌
 */
export interface RemoteStorageToken {
  /**
   * 访问令牌
   */
  accessToken: string;
  
  /**
   * 刷新令牌
   */
  refreshToken?: string;
  
  /**
   * 令牌过期时间(秒)
   */
  expiresIn?: number;
  
  /**
   * 令牌类型
   */
  tokenType?: string;
  
  /**
   * 授权范围
   */
  scope?: string;
}

/**
 * 授权RemoteStorage访问
 * @param info RemoteStorage服务器信息
 * @param clientId 客户端ID
 * @param redirectUri 重定向URI
 * @param scope 请求的权限范围
 */
export async function authorizeRemoteStorage(
  info: RemoteStorageInfo,
  clientId: string,
  redirectUri: string,
  scope: string = '*:rw'
): Promise<RemoteStorageToken> {
  // 1. 构造授权URL
  const authUrl = new URL(info.authEndpoint);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('client_id', clientId);
  authUrl.searchParams.append('redirect_uri', redirectUri);
  authUrl.searchParams.append('scope', scope);
  authUrl.searchParams.append('state', generateRandomString(16));

  // 2. 打开浏览器进行用户授权
  // 注意：在实际应用中，这里应该打开浏览器窗口或重定向
  console.log(`请访问以下URL进行授权: ${authUrl.toString()}`);

  // 3. 模拟获取授权码
  // 在实际应用中，这里应该监听重定向URI获取授权码
  const authCode = await promptForAuthCode();

  // 4. 使用授权码获取访问令牌
  const tokenUrl = new URL(info.authEndpoint.replace('/authorize', '/token'));
  const tokenResponse = await fetch(tokenUrl.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: authCode,
      client_id: clientId,
      redirect_uri: redirectUri
    })
  });

  if (!tokenResponse.ok) {
    throw new Error(`获取访问令牌失败: ${tokenResponse.status} ${tokenResponse.statusText}`);
  }

  const tokenData = await tokenResponse.json();

  return {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresIn: tokenData.expires_in,
    tokenType: tokenData.token_type,
    scope: tokenData.scope
  };
}

/**
 * 刷新访问令牌
 */
export async function refreshAccessToken(
  info: RemoteStorageInfo,
  clientId: string,
  refreshToken: string
): Promise<RemoteStorageToken> {
  const tokenUrl = new URL(info.authEndpoint.replace('/authorize', '/token'));
  const tokenResponse = await fetch(tokenUrl.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId
    })
  });

  if (!tokenResponse.ok) {
    throw new Error(`刷新访问令牌失败: ${tokenResponse.status} ${tokenResponse.statusText}`);
  }

  const tokenData = await tokenResponse.json();

  return {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresIn: tokenData.expires_in,
    tokenType: tokenData.token_type,
    scope: tokenData.scope
  };
}

// 辅助函数
function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// 模拟获取授权码
async function promptForAuthCode(): Promise<string> {
  // 在实际应用中，这里应该从重定向URI获取授权码
  return 'simulated_auth_code';
}