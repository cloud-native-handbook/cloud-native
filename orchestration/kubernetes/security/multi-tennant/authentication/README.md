# 认证（身份验证）


## 概念

* OAuth2
* OIDC
  https://github.com/coreos/dex/blob/master/Documentation/openid-connect.md
* SSO
* Identity Provider
  如果一个应用程序使用 Wechat 来实现第三方登录，那此时的 Wechat（准确点叫 Wechat identity） 就是一个 Identity Provider 。
* Issuer URL
* ID Tokens


## 认证插件（Authn 插件）

* TLS
* Password
  - Password 文件
  - Keystone(openstack)
* Token
  - Token 文件
  - OpenID Connect（查找 ID Token 来确定身份）
* OIDC

### OIDC

```bash
$ kube-apiserver \
  --oidc-issuer-url=https://dex.example.com \
  --oidc-username-id=example-app \
  --oidc-username-claim=email \
  ...

$ kubectl config set-credentials --token=$ID_TOKEN
```

### Dex Federation

Kubernetes -> dex -> OpenLDAP


## 授权插件

* AllowAll
* DenyAll
* ABAC File
* Webhook

### Webhook

```bash
$ kube-apiserver \
  --authorization-mode=Webhook \
  --authorization-webhook-config-file=webhookconfig \
  ...


clusters:
- name: my-authz-service
  cluster:
    server: https://authz.example.com/webhook
```

