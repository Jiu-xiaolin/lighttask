import { Injectable, BadRequestException } from "@nestjs/common";

type FeishuTextResponse = {
  code?: number;
  StatusCode?: number;
  msg?: string;
  StatusMessage?: string;
};

type FeishuTenantTokenResponse = {
  code?: number;
  msg?: string;
  tenant_access_token?: string;
  expire?: number;
};

type FeishuUserLookupResponse = {
  code?: number;
  msg?: string;
  data?: {
    user_list?: Array<{
      user_id?: string;
      open_id?: string;
      union_id?: string;
      email?: string;
      mobile?: string;
      status?: Record<string, boolean>;
    }>;
  };
};

@Injectable()
export class FeishuBotService {
  assertWebhook(webhook: string) {
    if (!webhook || !/^https:\/\/(?:open\.)?feishu\.cn\/open-apis\/bot\/v2\/hook\/[\w-]+/.test(webhook)) {
      throw new BadRequestException("请输入有效的飞书机器人 Webhook");
    }
  }

  async sendText(webhook: string, text: string) {
    this.assertWebhook(webhook);
    const response = await fetch(webhook, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        msg_type: "text",
        content: { text },
      }),
    });
    const body = await response.json().catch(() => ({} as FeishuTextResponse));
    const ok = response.ok && (body.code === 0 || body.StatusCode === 0);
    return {
      ok,
      status: response.status,
      code: body.code ?? body.StatusCode,
      message: body.msg || body.StatusMessage || (ok ? "发送成功" : "飞书机器人返回异常"),
      raw: body,
    };
  }

  assertAppCredentials(appId: string, appSecret: string) {
    if (!/^cli_[a-zA-Z0-9]+$/.test(appId)) {
      throw new BadRequestException("请输入有效的飞书 App ID");
    }
    if (!appSecret || appSecret.length < 16) {
      throw new BadRequestException("请输入有效的飞书 App Secret");
    }
  }

  async getTenantAccessToken(appId: string, appSecret: string) {
    this.assertAppCredentials(appId, appSecret);
    const response = await fetch("https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal", {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
    });
    const body = await response.json().catch(() => ({} as FeishuTenantTokenResponse));
    const ok = response.ok && body.code === 0 && !!body.tenant_access_token;
    return {
      ok,
      status: response.status,
      code: body.code,
      message: body.msg || (ok ? "应用凭据验证成功" : "飞书应用凭据验证失败"),
      expire: body.expire || 0,
      tenantAccessToken: body.tenant_access_token || "",
      tokenPreview: body.tenant_access_token ? `${body.tenant_access_token.slice(0, 8)}...` : "",
      raw: body,
    };
  }

  async sendAppText(appId: string, appSecret: string, receiveId: string, receiveIdType: string, text: string) {
    const token = await this.getTenantAccessToken(appId, appSecret);
    if (!token.ok) return { ...token, sent: false };
    const targetType = receiveIdType || "open_id";
    if (!receiveId) {
      throw new BadRequestException("请先配置创建者飞书接收 ID");
    }
    const response = await fetch(`https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=${encodeURIComponent(targetType)}`, {
      method: "POST",
      headers: {
        "content-type": "application/json; charset=utf-8",
        authorization: `Bearer ${token.tenantAccessToken}`,
      },
      body: JSON.stringify({
        receive_id: receiveId,
        msg_type: "text",
        content: JSON.stringify({ text }),
      }),
    });
    const body = await response.json().catch(() => ({} as any));
    const ok = response.ok && body.code === 0;
    return {
      ok,
      sent: ok,
      status: response.status,
      code: body.code,
      message: body.msg || (ok ? "飞书应用机器人消息发送成功" : "飞书应用机器人消息发送失败"),
      expire: token.expire,
      tokenPreview: token.tokenPreview,
      raw: body,
    };
  }

  async sendAppInteractive(appId: string, appSecret: string, receiveId: string, receiveIdType: string, card: any) {
    const token = await this.getTenantAccessToken(appId, appSecret);
    if (!token.ok) return { ...token, sent: false };
    const targetType = receiveIdType || "open_id";
    if (!receiveId) {
      throw new BadRequestException("请先配置创建者飞书接收 ID");
    }
    const response = await fetch(`https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=${encodeURIComponent(targetType)}`, {
      method: "POST",
      headers: {
        "content-type": "application/json; charset=utf-8",
        authorization: `Bearer ${token.tenantAccessToken}`,
      },
      body: JSON.stringify({
        receive_id: receiveId,
        msg_type: "interactive",
        content: JSON.stringify(card),
      }),
    });
    const body = await response.json().catch(() => ({} as any));
    const ok = response.ok && body.code === 0;
    return {
      ok,
      sent: ok,
      status: response.status,
      code: body.code,
      message: body.msg || (ok ? "飞书日报卡片发送成功" : "飞书日报卡片发送失败"),
      expire: token.expire,
      tokenPreview: token.tokenPreview,
      raw: body,
    };
  }

  async resolveOpenIdByContact(appId: string, appSecret: string, contact: string, contactType: string) {
    const token = await this.getTenantAccessToken(appId, appSecret);
    if (!token.ok) return { ...token, openId: "", found: false };
    const value = contact.trim();
    if (!value) {
      throw new BadRequestException("请先配置创建者手机号或邮箱");
    }
    const body = contactType === "mobile"
      ? { mobiles: [value], include_resigned: false }
      : { emails: [value], include_resigned: false };
    const response = await fetch("https://open.feishu.cn/open-apis/contact/v3/users/batch_get_id?user_id_type=open_id", {
      method: "POST",
      headers: {
        "content-type": "application/json; charset=utf-8",
        authorization: `Bearer ${token.tenantAccessToken}`,
      },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({} as FeishuUserLookupResponse));
    const user = payload.data?.user_list?.[0];
    const openId = user?.open_id || user?.user_id || "";
    const ok = response.ok && payload.code === 0 && !!openId;
    return {
      ok,
      found: !!openId,
      openId,
      status: response.status,
      code: payload.code,
      message: payload.msg || (ok ? "已获取创建者 open_id" : "未找到创建者 open_id"),
      expire: token.expire,
      tokenPreview: token.tokenPreview,
      raw: payload,
    };
  }

  async sendAppTextToContact(appId: string, appSecret: string, contact: string, contactType: string, text: string) {
    const resolved = await this.resolveOpenIdByContact(appId, appSecret, contact, contactType);
    if (!resolved.ok || !resolved.openId) {
      return { ...resolved, sent: false };
    }
    const sent = await this.sendAppText(appId, appSecret, resolved.openId, "open_id", text);
    return { ...sent, resolvedOpenId: resolved.openId };
  }

  async sendAppInteractiveToContact(appId: string, appSecret: string, contact: string, contactType: string, card: any) {
    const resolved = await this.resolveOpenIdByContact(appId, appSecret, contact, contactType);
    if (!resolved.ok || !resolved.openId) {
      return { ...resolved, sent: false };
    }
    const sent = await this.sendAppInteractive(appId, appSecret, resolved.openId, "open_id", card);
    return { ...sent, resolvedOpenId: resolved.openId };
  }
}
