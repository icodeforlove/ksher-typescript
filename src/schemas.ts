import { z } from "zod";

const amountSchema = z.union([z.string(), z.number()]);
const nonEmptyString = z.string().min(1);
const max32String = nonEmptyString.max(32);

const payBaseSchema = z
  .object({
    mch_order_no: max32String,
    total_fee: amountSchema,
    fee_type: nonEmptyString,
  })
  .passthrough();

const queryByOrderSchema = z
  .object({
    mch_order_no: max32String.optional(),
    ksher_order_no: z.string().optional(),
  })
  .passthrough()
  .refine((data) => data.mch_order_no || data.ksher_order_no, {
    message: "mch_order_no or ksher_order_no is required",
  });

const refundQuerySchema = z
  .object({
    mch_refund_no: z.string().optional(),
    ksher_refund_no: z.string().optional(),
    mch_order_no: max32String.optional(),
  })
  .passthrough()
  .refine(
    (data) => data.mch_refund_no || data.ksher_refund_no || data.mch_order_no,
    {
      message: "mch_refund_no, ksher_refund_no, or mch_order_no is required",
    }
  );

export const gatewayPayRequestSchema = payBaseSchema.extend({
  refer_url: nonEmptyString,
  product_name: nonEmptyString,
  channel_list: nonEmptyString,
  mch_redirect_url: nonEmptyString,
  mch_redirect_url_fail: nonEmptyString,
  mch_code: max32String.optional(),
});
export const gatewayOrderQueryRequestSchema = queryByOrderSchema;
export const cancelOrderRequestSchema = queryByOrderSchema;
export const orderRefundRequestSchema = z
  .object({
    mch_order_no: max32String,
  })
  .passthrough();
export const orderReverseRequestSchema = queryByOrderSchema;
export const nativePayRequestSchema = payBaseSchema;
export const orderQueryRequestSchema = queryByOrderSchema;
export const quickPayRequestSchema = payBaseSchema.extend({
  auth_code: nonEmptyString,
});
export const appPayRequestSchema = payBaseSchema;
export const miniProgramPayRequestSchema = payBaseSchema;
export const wapPayRequestSchema = payBaseSchema;
export const jsapiPayRequestSchema = payBaseSchema;
export const refundQueryRequestSchema = refundQuerySchema;
export const orderCloseRequestSchema = queryByOrderSchema;
export const payoutRequestSchema = z
  .object({
    mch_order_no: max32String,
  })
  .passthrough();
export const orderQueryPayoutRequestSchema = queryByOrderSchema;
export const getPayoutBalanceRequestSchema = z.object({}).passthrough();
export const rateQueryRequestSchema = z.object({}).passthrough();
export const merchantInfoRequestSchema = z.object({}).passthrough();
export const getSettlementInfoRequestSchema = z.object({}).passthrough();

export const orderCreateRequestSchema = z
  .object({
    amount: amountSchema,
    merchant_order_id: max32String,
    product_name: nonEmptyString,
    note: z.string().optional(),
    channel: nonEmptyString,
    redirect_url: nonEmptyString,
    redirect_url_fail: nonEmptyString,
    refer_url: nonEmptyString,
    timestamp: nonEmptyString,
    fee_type: z.string().optional(),
    mch_code: max32String.optional(),
  })
  .passthrough();

export const defaultDataSchema = z.object({}).passthrough();
export const gatewayPayResponseDataSchema = z.object({
  pay_content: z.string(),
});
export const gatewayOrderQueryResponseDataSchema = z.object({
  channel: z.string(),
  openid: z.string(),
  channel_order_no: z.string(),
  cash_fee_type: z.string(),
  ksher_order_no: z.string(),
  nonce_str: z.string(),
  time_end: z.string(),
  fee_type: z.string(),
  attach: z.string(),
  rate: z.string(),
  result: z.string(),
  total_fee: z.union([z.string(), z.number()]),
  appid: z.string(),
  cash_fee: amountSchema,
  mch_order_no: z.string(),
  pay_mch_order_no: z.string(),
});

export const createResponseSchema = <TData extends z.ZodTypeAny>(
  dataSchema: TData
) =>
  z
    .object({
      code: z.coerce.number(),
      msg: z.string().optional(),
      message: z.string().optional(),
      data: dataSchema.optional(),
      sign: z.string().optional(),
      status_code: z.string().optional(),
      status_msg: z.string().optional(),
      time_stamp: z.string().optional(),
      version: z.string().optional(),
    })
    .passthrough();

export const defaultResponseSchema = createResponseSchema(defaultDataSchema);

export type KsherResponse<TData = z.infer<typeof defaultDataSchema>> = Omit<
  z.infer<typeof defaultResponseSchema>,
  "data"
> & {
  data?: TData;
};
