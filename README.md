 
# Ksher SDK TypeScript
[![NPM](https://nodei.co/npm/ksher-typescript.svg?style=flat-square&data=n,v,u,d&color=brightgreen)](https://www.npmjs.com/package/ksher-typescript)
[![Version](https://img.shields.io/npm/v/ksher-typescript)](https://www.npmjs.com/package/ksher-typescript)

This is a third-party SDK for Node.js that focuses on providing strong TypeScript
types and a developer-friendly debugging interface on top of the Ksher API.
API Document Please check document at http://api.ksher.net

You can check [npm SDK TypeScript](https://www.npmjs.com/package/ksher-typescript) or visit [Github ksher_demo_nodejs repo](https://github.com/ksher-solutions/ksher_demo_nodejs) for check example create on NodeJs.

## How to install SDK

Install nodejs on you computer.

Check your nodejs working with your computer by using

```shell
node -v
```

Install ksher SDK by 

```shell
npm install ksher-typescript
```

## using SDK

Initial data to call

```nodejs
const appId = "mch35000"; // setup your appid here
const privateKey = "/Users/example/ksher_sdk_nodejs/Mch35000_PrivateKey.pem"; // or PEM text

const { createKsherClient } = require("ksher-typescript");
const client = createKsherClient({ appId, privateKey });
```
The client validates requests and responses with Zod and throws `KsherSignatureError`
if the response signature is invalid.
alternative way you can read your private key from string

```nodejs
const appId = "mch35000"; // setup your appid here
const privateKey = `-----BEGIN RSA PRIVATE KEY-----
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
-----END RSA PRIVATE KEY-----
`;
// setup your private key data inside pem file at here

const { createKsherClient } = require("ksher-typescript");
const client = createKsherClient({ appId, privateKey });
```

## Website

Please see http://api.ksher.net/KsherAPI/dev/apis/website.html for more information.

### create website request
```nodejs
const mch_order_no = Date.now().toString();
const gatewayPayResponse = await client.gatewayPay({   
  "mch_order_no": mch_order_no,
  "total_fee": "100",
  "fee_type": "THB",
  "mch_code": mch_order_no,
  "refer_url": "https://www.google.com",
  "mch_redirect_url":"https://www.google.com/api/gateway_pay/success",
  "mch_redirect_url_fail":"https://www.google.comapi/gateway_pay/fail",
  "mch_notify_url":"https://www.google.com/api/gateway_pay/notify_url/",
  "product_name": mch_order_no,
  "channel_list":"promptpay,linepay,airpay,truemoney,atome,card,ktc_instal,kbank_instal,kcc_instal,kfc_instal,scb_easy,bbl_deeplink,baybank_deeplink,kplus,alipay,wechat,card,ktc_instal,kbank_instal,kcc_instal,kfc_instal",
  "lang":"en"
});
console.log("body: ", gatewayPayResponse);
```
### query status

```nodejs
const mch_order_no = "your create mch_order_no";
const gatewayOrderQueryResponse = await client.gatewayOrderQuery({   
  "mch_order_no": mch_order_no
});
console.log("body: ", gatewayOrderQueryResponse);
```

## C scan B

### Create Dynamic QR
Please see http://api.ksher.net/KsherAPI/dev/apis/kiosk_c_scan_b.html for more information.
```nodejs
const mch_order_no = Date.now().toString();
const nativePayResponse = await client.nativePay({
      mch_order_no: mch_order_no,
      total_fee: "100",
      fee_type:"THB",
      channel: "promptpay"
});
console.log("body: ", nativePayResponse);
```

### query status

```nodejs
const mch_order_no = "your create mch_order_no";
const nativePayQueryResponse = await client.orderQuery({
    mch_order_no: "2023-02-19-17-34-00",
});
console.log("body: ", nativePayQueryResponse);
```

## B scan C

### Create Payment order
Please see https://api.ksher.net/KsherAPI/dev/apis/pos_b_scan_c.html for more information.
```nodejs
const mch_order_no = Date.now().toString();
const quickPayResponse = await client.quickPay({
          mch_order_no: mch_order_no,
          total_fee: "100",
          fee_type:"THB",
          channel: "truemoney",
          auth_code: "111111111111111111"
});
console.log("body: ", quickPayResponse);
```
### query status

```nodejs
const mch_order_no = "your create mch_order_no";
const quickPayQueryResponse = await client.orderQuery({
    mch_order_no: "2023-02-19-17-34-00",
});
console.log("body: ", quickPayQueryResponse);
```

## Application

### Create Payment order
Please see https://api.ksher.net/KsherAPI/dev/apis/mobile_app.html for more information.
```nodejs
const mch_order_no = Date.now().toString();
const appPayResponse = await client.appPay({
              mch_order_no: mch_order_no,
              total_fee: "100",
              fee_type:"THB",
              channel: "wechat",
              product_name: "some product",
              refer_url: "http://www.google.com",
              notify_url: "https://your_notify_url.com/notify",
              mch_order_no: "3500114305",
              local_total_fee: 10000,
              channel_sub_appid: "wxxxxxxxxxxxx",
});
console.log("body: ", appPayResponse);
```
### query status

```nodejs
const mch_order_no = "your create mch_order_no";
const appPayQueryResponse = await client.orderQuery({
    mch_order_no: "2023-02-19-17-34-00",
});
console.log("body: ", appPayQueryResponse);
```

## Mini Program

### Create Payment order
Please see https://api.ksher.net/KsherAPI/dev/apis/wechat_mini_pro.html for more information.
```nodejs
const mch_order_no = Date.now().toString();
const miniProgramPayResponse = await client.miniProgramPay({
              mch_order_no: mch_order_no,
              total_fee: "100",
              fee_type:"THB",
              channel: "wechat",
              product_name: "some product",
              refer_url: "http://www.google.com",
              notify_url: "https://your_notify_url.com/notify",
              mch_order_no: "3500114305",
              local_total_fee: 10000,
              channel_sub_appid: "wx8888888888888888",
              sub_openid: "oUpF8uMuAJO_M2pxb1Q9zNjWeS6o",
});
console.log("body: ", miniProgramPayResponse);
```
### query status

```nodejs
const mch_order_no = "your create mch_order_no";
const miniProgramPayQueryResponse = await client.orderQuery({
    mch_order_no: "2023-02-19-17-34-00",
});
console.log("body: ", miniProgramPayQueryResponse);
```
