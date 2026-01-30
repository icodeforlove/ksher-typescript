import fs from "fs";
import crypto from "crypto";
import { z } from "zod";
import {
  convertDataToString,
  generateRandomString,
  isPrivateKeyPem,
  isPublicKeyPem,
  safeDecode,
} from "./utils";
import {
  appPayRequestSchema,
  cancelOrderRequestSchema,
  createResponseSchema,
  defaultDataSchema,
  gatewayOrderQueryRequestSchema,
  gatewayOrderQueryResponseDataSchema,
  gatewayPayRequestSchema,
  gatewayPayResponseDataSchema,
  getPayoutBalanceRequestSchema,
  getSettlementInfoRequestSchema,
  jsapiPayRequestSchema,
  merchantInfoRequestSchema,
  miniProgramPayRequestSchema,
  nativePayRequestSchema,
  orderCloseRequestSchema,
  orderCreateRequestSchema,
  orderQueryPayoutRequestSchema,
  orderQueryRequestSchema,
  orderRefundRequestSchema,
  orderReverseRequestSchema,
  payoutRequestSchema,
  quickPayRequestSchema,
  rateQueryRequestSchema,
  refundQueryRequestSchema,
  wapPayRequestSchema,
  type KsherResponse,
} from "./schemas";

const DEFAULT_PUBLIC_KEY_V1 = `-----BEGIN RSA PUBLIC KEY-----
MEgCQQC+/eeTgrjeCPHmDS/5osWViFyIAryFRIr5canaYhz3Di3UNkT0sf6TkabF
LvxPcM9JmEtj2O4TXNpgYATkE/sFAgMBAAE=
-----END RSA PUBLIC KEY-----
`;

const DEFAULT_PUBLIC_KEY_V2 = `-----BEGIN RSA PUBLIC KEY-----
MIIBCgKCAQEA3WvHCgE/NVHjWG+IzjB2OeWFwjQJFPEi/O1AFaiLdsyXgQ8sROIM
pp7iyhbubKf+aNFdJx4+hwbVSd3BAUUdKQJyovdqjF0DLLrk0QLUZAnEX7lylugt
VL+eCKRhI8UzXxEFMt8vrhw1p9oaxBK/0mXcqUGvtM7hNAZo9jdfB/l+gAf6X3jR
1gj7lsz190A+FfDwzIhCWK8FcdroW7A00KAcCdAadzNdn16UNj4G0kGXhAMf+175
gTFuVuiZx1oSaInrOgnl05qqixTbrdm/BqwbFWGGYX1B6yKM0/Vus3DqkwgXr1q+
bWPtM3sDOQuQmkbo/jQbkMv+Ab8ij2f1gwIDAQAB
-----END RSA PUBLIC KEY-----
`;

const DEFAULT_API_BASE = "https://api.mch.ksher.net/KsherPay";
const DEFAULT_GATEWAY_BASE = "https://gateway.ksher.com/api";

type BaseUrlKind = "api" | "gateway";

export type SignVersion = "V2";

export interface KsherClientConfig {
  appId: string;
  privateKey: string;
  publicKey?: string;
  signVersion?: SignVersion;
  timeoutMs?: number;
  apiBase?: string;
  gatewayBase?: string;
}

export class KsherSignatureError extends Error {
  readonly response?: KsherResponse<unknown>;

  constructor(message: string, response?: KsherResponse<unknown>) {
    super(message);
    this.name = "KsherSignatureError";
    this.response = response;
  }
}

const responseSchema = createResponseSchema(defaultDataSchema);
const gatewayPayResponseSchema = createResponseSchema(
  gatewayPayResponseDataSchema
);
const gatewayOrderQueryResponseSchema = createResponseSchema(
  gatewayOrderQueryResponseDataSchema
);

const formatZodError = (error: z.ZodError): string => {
  const details = error.issues
    .map((issue) => {
      const path = issue.path.length ? issue.path.join(".") : "input";
      return `${path}: ${issue.message}`;
    })
    .join("; ");
  return `Invalid request: ${details}`;
};

type EndpointDefinition = {
  base: BaseUrlKind;
  path: string;
  requestSchema: z.ZodTypeAny;
  responseSchema?: z.ZodTypeAny;
  decodeFields?: readonly string[];
  omitFields?: readonly string[];
};

const endpoints = {
  gatewayPay: {
    base: "gateway",
    path: "/gateway_pay",
    decodeFields: [
      "product_name",
      "mch_redirect_url",
      "mch_redirect_url_fail",
      "mch_notify_url",
    ],
    requestSchema: gatewayPayRequestSchema,
    responseSchema: gatewayPayResponseSchema,
  },
  gatewayOrderQuery: {
    base: "gateway",
    path: "/gateway_order_query",
    omitFields: ["operator_id"],
    requestSchema: gatewayOrderQueryRequestSchema,
    responseSchema: gatewayOrderQueryResponseSchema,
  },
  cancelOrder: {
    base: "gateway",
    path: "/cancel_order",
    requestSchema: cancelOrderRequestSchema,
  },
  orderRefund: {
    base: "api",
    path: "/order_refund",
    requestSchema: orderRefundRequestSchema,
  },
  orderReverse: {
    base: "api",
    path: "/order_reverse",
    requestSchema: orderReverseRequestSchema,
  },
  nativePay: {
    base: "api",
    path: "/native_pay",
    decodeFields: ["notify_url", "product"],
    requestSchema: nativePayRequestSchema,
  },
  orderQuery: {
    base: "api",
    path: "/order_query",
    omitFields: ["operator_id"],
    requestSchema: orderQueryRequestSchema,
  },
  quickPay: {
    base: "api",
    path: "/quick_pay",
    decodeFields: ["notify_url", "product"],
    requestSchema: quickPayRequestSchema,
  },
  appPay: {
    base: "api",
    path: "/app_pay",
    decodeFields: ["notify_url", "redirect_url", "refer_url", "product"],
    requestSchema: appPayRequestSchema,
  },
  miniProgramPay: {
    base: "api",
    path: "/mini_program_pay",
    decodeFields: ["notify_url", "product"],
    requestSchema: miniProgramPayRequestSchema,
  },
  wapPay: {
    base: "api",
    path: "/wap_pay",
    decodeFields: ["notify_url", "redirect_url", "refer_url"],
    requestSchema: wapPayRequestSchema,
  },
  jsapiPay: {
    base: "api",
    path: "/jsapi_pay",
    decodeFields: ["notify_url", "redirect_url"],
    requestSchema: jsapiPayRequestSchema,
  },
  refundQuery: {
    base: "api",
    path: "/refund_query",
    requestSchema: refundQueryRequestSchema,
  },
  orderClose: {
    base: "api",
    path: "/order_close",
    requestSchema: orderCloseRequestSchema,
  },
  payout: {
    base: "api",
    path: "/payout",
    requestSchema: payoutRequestSchema,
  },
  orderQueryPayout: {
    base: "api",
    path: "/order_query_payout",
    omitFields: ["operator_id"],
    requestSchema: orderQueryPayoutRequestSchema,
  },
  getPayoutBalance: {
    base: "api",
    path: "/get_payout_balance",
    requestSchema: getPayoutBalanceRequestSchema,
  },
  rateQuery: {
    base: "api",
    path: "/rate_query",
    requestSchema: rateQueryRequestSchema,
  },
  merchantInfo: {
    base: "api",
    path: "/merchant_info",
    requestSchema: merchantInfoRequestSchema,
  },
  getSettlementInfo: {
    base: "api",
    path: "/get_settlement_info",
    requestSchema: getSettlementInfoRequestSchema,
  },
} as const;

type EndpointKey = keyof typeof endpoints;
type EndpointRequest<T extends EndpointKey> = z.input<
  (typeof endpoints)[T]["requestSchema"]
>;

const endpointDefinitions: Record<EndpointKey, EndpointDefinition> = endpoints;

export interface KsherClient {
  gatewayPay: (
    data: EndpointRequest<"gatewayPay">
  ) => Promise<KsherResponse<z.infer<typeof gatewayPayResponseDataSchema>>>;
  gatewayOrderQuery: (
    data: EndpointRequest<"gatewayOrderQuery">
  ) => Promise<KsherResponse<z.infer<typeof gatewayOrderQueryResponseDataSchema>>>;
  cancelOrder: (data: EndpointRequest<"cancelOrder">) => Promise<KsherResponse>;
  orderRefund: (data: EndpointRequest<"orderRefund">) => Promise<KsherResponse>;
  orderReverse: (
    data: EndpointRequest<"orderReverse">
  ) => Promise<KsherResponse>;
  nativePay: (data: EndpointRequest<"nativePay">) => Promise<KsherResponse>;
  orderQuery: (data: EndpointRequest<"orderQuery">) => Promise<KsherResponse>;
  quickPay: (data: EndpointRequest<"quickPay">) => Promise<KsherResponse>;
  appPay: (data: EndpointRequest<"appPay">) => Promise<KsherResponse>;
  miniProgramPay: (
    data: EndpointRequest<"miniProgramPay">
  ) => Promise<KsherResponse>;
  wapPay: (data: EndpointRequest<"wapPay">) => Promise<KsherResponse>;
  jsapiPay: (data: EndpointRequest<"jsapiPay">) => Promise<KsherResponse>;
  refundQuery: (data: EndpointRequest<"refundQuery">) => Promise<KsherResponse>;
  orderClose: (data: EndpointRequest<"orderClose">) => Promise<KsherResponse>;
  payout: (data: EndpointRequest<"payout">) => Promise<KsherResponse>;
  orderQueryPayout: (
    data: EndpointRequest<"orderQueryPayout">
  ) => Promise<KsherResponse>;
  getPayoutBalance: (
    data: EndpointRequest<"getPayoutBalance">
  ) => Promise<KsherResponse>;
  rateQuery: (data: EndpointRequest<"rateQuery">) => Promise<KsherResponse>;
  merchantInfo: (
    data: EndpointRequest<"merchantInfo">
  ) => Promise<KsherResponse>;
  getSettlementInfo: (
    data: EndpointRequest<"getSettlementInfo">
  ) => Promise<KsherResponse>;
  orderCreate: (
    data: z.input<typeof orderCreateRequestSchema>
  ) => Promise<KsherResponse<z.infer<typeof gatewayPayResponseDataSchema>>>;
  verifySignature: (response: { data?: unknown; sign?: string }) => boolean;
}

const loadKey = (
  value: string | undefined,
  type: "private" | "public",
  signVersion?: SignVersion
): string | Buffer => {
  if (!value) {
    if (type === "public") {
      return signVersion === "V2" ? DEFAULT_PUBLIC_KEY_V2 : DEFAULT_PUBLIC_KEY_V1;
    }
    throw new Error("privateKey is required");
  }

  if (type === "private" && isPrivateKeyPem(value)) {
    return value;
  }

  if (type === "public" && isPublicKeyPem(value)) {
    return value;
  }

  return fs.readFileSync(value);
};

const buildSignaturePayload = (data: unknown): Record<string, unknown> => {
  if (!data || typeof data !== "object") return {};
  const payload = data as Record<string, unknown>;
  if (
    "mobile" in payload &&
    "mch_id" in payload &&
    "account_type" in payload &&
    "business_mode" in payload &&
    "nonce_str" in payload
  ) {
    return {
      mobile: payload.mobile,
      mch_id: payload.mch_id,
      account_type: payload.account_type,
      business_mode: payload.business_mode,
      nonce_str: payload.nonce_str,
    };
  }
  return payload;
};

type ResolvedConfig = {
  appId: string;
  privateKey: string;
  publicKey?: string;
  signVersion?: SignVersion;
  timeoutMs: number;
  apiBase: string;
  gatewayBase: string;
};

const buildUrl = (base: BaseUrlKind, config: ResolvedConfig) => {
  return base === "gateway" ? config.gatewayBase : config.apiBase;
};

const applyDecodeFields = (
  data: Record<string, unknown>,
  fields?: readonly string[]
): Record<string, unknown> => {
  if (!fields?.length) return data;
  const next = { ...data };
  fields.forEach((field) => {
    const value = next[field];
    if (typeof value === "string") {
      next[field] = safeDecode(value);
    }
  });
  return next;
};

const applyOmitFields = (
  data: Record<string, unknown>,
  fields?: readonly string[]
): Record<string, unknown> => {
  if (!fields?.length) return data;
  const next = { ...data };
  fields.forEach((field) => {
    delete next[field];
  });
  return next;
};

export const createKsherClient = (config: KsherClientConfig): KsherClient => {
  const resolvedConfig: ResolvedConfig = {
    appId: config.appId,
    privateKey: config.privateKey,
    publicKey: config.publicKey ?? "",
    signVersion: config.signVersion,
    timeoutMs: config.timeoutMs ?? 0,
    apiBase: config.apiBase ?? DEFAULT_API_BASE,
    gatewayBase: config.gatewayBase ?? DEFAULT_GATEWAY_BASE,
  };

  const privateKey = loadKey(
    resolvedConfig.privateKey,
    "private",
    resolvedConfig.signVersion
  );
  const publicKey = loadKey(
    resolvedConfig.publicKey || undefined,
    "public",
    resolvedConfig.signVersion
  );

  const signPayload = (payload: Record<string, unknown>): string => {
    const message = convertDataToString(payload);
    const signer = crypto.createSign("RSA-MD5");
    signer.write(message);
    signer.end();
    return signer.sign(privateKey, "hex");
  };

  const verifySignature = (response: {
    data?: unknown;
    sign?: string;
  }): boolean => {
    if (!response?.data || !response?.sign) return false;
    const payload = buildSignaturePayload(response.data);
    const message = convertDataToString(payload);
    const verifier = crypto.createVerify("RSA-MD5");
    verifier.write(message);
    verifier.end();
    return verifier.verify(publicKey, response.sign, "hex");
  };

  const buildFormBody = (payload: Record<string, unknown>): string => {
    const params = new URLSearchParams();
    Object.entries(payload).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      if (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
      ) {
        params.append(key, String(value));
      } else if (Buffer.isBuffer(value)) {
        params.append(key, value.toString("utf-8"));
      } else {
        params.append(key, JSON.stringify(value));
      }
    });
    return params.toString();
  };

  const request = async <
    T extends EndpointKey,
    TData = z.infer<typeof defaultDataSchema>
  >(
    endpoint: T,
    data: EndpointRequest<T>
  ): Promise<KsherResponse<TData>> => {
    const definition = endpointDefinitions[endpoint];
    const parsedResult = definition.requestSchema.safeParse(data);
    if (!parsedResult.success) {
      throw new TypeError(formatZodError(parsedResult.error));
    }
    const parsed = parsedResult.data as Record<string, unknown>;
    const decoded = applyDecodeFields(parsed, definition.decodeFields);
    const sanitized = applyOmitFields(decoded, definition.omitFields);
    const withHeader = {
      appid: resolvedConfig.appId,
      nonce_str: generateRandomString(32),
      time_stamp: Date.now(),
      ...sanitized,
    };
    const sign = signPayload(withHeader);
    const body = buildFormBody({ ...withHeader, sign });
    const headers: Record<string, string> = {
      "Content-Type": "application/x-www-form-urlencoded",
    };
    if (resolvedConfig.signVersion === "V2") {
      headers["ksher-sign-version"] = "V2";
    }

    const controller = new AbortController();
    const timeoutMs = resolvedConfig.timeoutMs;
    let timeoutId: NodeJS.Timeout | undefined;
    if (timeoutMs > 0) {
      timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    }

    const response = await fetch(
      `${buildUrl(definition.base, resolvedConfig)}${definition.path}`,
      {
        method: "POST",
        headers,
        body,
        signal: controller.signal,
      }
    );

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    const rawText = await response.text();
    let parsedJson: unknown;
    try {
      parsedJson = rawText ? JSON.parse(rawText) : {};
    } catch {
      parsedJson = { code: response.status, msg: rawText };
    }

    const parseSchema =
      definition.responseSchema ?? (responseSchema as z.ZodTypeAny);
    const parsedResponse = parseSchema.parse(parsedJson) as KsherResponse<TData>;

    if (parsedResponse.code === 0 && !verifySignature(parsedResponse)) {
      throw new KsherSignatureError("verify signature failed", parsedResponse);
    }

    return parsedResponse;
  };

  return {
    gatewayPay: (data) =>
      request<"gatewayPay", z.infer<typeof gatewayPayResponseDataSchema>>(
        "gatewayPay",
        data
      ),
    gatewayOrderQuery: (data) =>
      request<"gatewayOrderQuery", z.infer<typeof gatewayOrderQueryResponseDataSchema>>(
        "gatewayOrderQuery",
        data
      ),
    cancelOrder: (data) => request("cancelOrder", data),
    orderRefund: (data) => request("orderRefund", data),
    orderReverse: (data) => request("orderReverse", data),
    nativePay: (data) => request("nativePay", data),
    orderQuery: (data) => request("orderQuery", data),
    quickPay: (data) => request("quickPay", data),
    appPay: (data) => request("appPay", data),
    miniProgramPay: (data) => request("miniProgramPay", data),
    wapPay: (data) => request("wapPay", data),
    jsapiPay: (data) => request("jsapiPay", data),
    refundQuery: (data) => request("refundQuery", data),
    orderClose: (data) => request("orderClose", data),
    payout: (data) => request("payout", data),
    orderQueryPayout: (data) => request("orderQueryPayout", data),
    getPayoutBalance: (data) => request("getPayoutBalance", data),
    rateQuery: (data) => request("rateQuery", data),
    merchantInfo: (data) => request("merchantInfo", data),
    getSettlementInfo: (data) => request("getSettlementInfo", data),
    orderCreate: (data) => {
      const payloadResult = orderCreateRequestSchema.safeParse(data);
      if (!payloadResult.success) {
        throw new TypeError(formatZodError(payloadResult.error));
      }
      const payload = payloadResult.data;
      return request<"gatewayPay", z.infer<typeof gatewayPayResponseDataSchema>>(
        "gatewayPay",
        {
          mch_order_no: payload.merchant_order_id,
          mch_code: payload.mch_code ?? payload.merchant_order_id,
          total_fee: payload.amount,
          fee_type: payload.fee_type ?? "THB",
          product_name: payload.product_name,
          attach: payload.note,
          channel_list: payload.channel,
          refer_url: payload.refer_url,
          mch_redirect_url: payload.redirect_url,
          mch_redirect_url_fail: payload.redirect_url_fail,
          time_stamp: payload.timestamp,
        }
      );
    },
    verifySignature,
  };
};
