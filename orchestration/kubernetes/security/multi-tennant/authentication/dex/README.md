# CoreOS Dex

Dex 为另一个应用提供身份服务，即使用 Dex 可以实现第三方登录。

Dex 是 CoreOS 开源的 一种使用OpenID Connect为其他应用程序提供身份验证的身份服务。。Dex 通过“连接器”充当其他身份提供者的入口。这使得dex可以将身份验证延迟到LDAP服务器，SAML提供程序或已建立的身份提供程序，如GitHub，Google和Active Directory


## 特点

* 开源
* Auth2 Identity provider
* OpenID Connect enabled
* 联邦（Federation）


## ID Token

```json
{
  "iss": "http://127.0.0.1:5556/dex",
  "sub": "CgcyMzQyNzQ5EgZnaXRodWI",
  "aud": "example-app",
  "exp": 1492882042,
  "iat": 1492795642,
  "at_hash": "bi96gOXZShvlWYtal9Eqiw",
  "email": "jane.doe@coreos.com",
  "email_verified": true,
  "groups": [
    "admins",
    "developers"
  ],
  "name": "Jane Doe"
}
```


## 参考

* [coreos/dex](https://github.com/coreos/dex)
* [Kubernetes Access Control with dex](https://speakerdeck.com/ericchiang/kubernetes-access-control-with-dex)
