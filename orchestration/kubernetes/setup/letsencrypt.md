# Let's Encrypt

## ACME

ACME 全称是 Automated Certificate Management Environment，直译过来是自动化证书管理环境的意思，Let's Encrypt 的证书签发过程使用的就是 ACME 协议。有关 ACME 协议的更多资料可以在这个仓库找到。

### 客户端

* [ACME Client Implementations](https://letsencrypt.org/docs/client-options/)

Bash 脚本：

* [acme.sh](https://github.com/Neilpang/acme.sh)
* [dehydrated](https://github.com/lukas2511/dehydrated)
* [getssl](https://github.com/srvrco/getssl)

浏览器：

* [SSL For Free](https://www.sslforfree.com)
* [Get HTTPS for free](https://gethttpsforfree.com/)
* [ZeroSSL](https://zerossl.com/)

Docker：

* [tls_certificate_generation](https://github.com/leandromoreira/tls_certificate_generation)
* [ZeroSSL](https://hub.docker.com/r/zerossl/client/)

## 使用 Let's Encrypt 为私有域名签发 CA 证书

Let's Encrypt 的 ACME 协议支持 [DNS Challenge](https://github.com/ietf-wg-acme/acme/blob/master/draft-ietf-acme-acme.md#dns-challenge)，如果要为私有域名签发 CA 证书，需要在私有 DNS 服务器中添加 `TXT 记录` 来验证域名身份（验证这个域名是你的），并且每次 renew 都需要验证。

### TXT 记录

TXT 记录是对域名进行标识和说明的一种方式，参考 [域名验证指引](https://cloud.tencent.com/document/product/400/4142)。

```bash
# 测试 txt 记录
$ dig -t txt _acme-challenge.example.com

$ host -t txt baidu.com
```

### 签发证书

```bash
$ certbot certonly --manual --config-dir ./certbot --work-dir ./certbot --logs-dir ./certbot
```

```bash
$ ./certbot --manual --preferred-challenges dns certonly
```

## 参考

* [Let's Encrypt for intranet websites?](https://security.stackexchange.com/questions/103524/lets-encrypt-for-intranet-websites)
* [Letsencrypt 通过 DNS TXT 记录来验证域名有效性](http://blog.csdn.net/u012291393/article/details/78768547)

### DNS-01 Challenge

* [DNS Challenge](https://github.com/ietf-wg-acme/acme/blob/master/draft-ietf-acme-acme.md#dns-challenge)
* [DNS Challenge example](https://github.com/srvrco/getssl/wiki/DNS-Challenge-example)
* [dns-01 challenge](https://github.com/lukas2511/dehydrated/blob/master/docs/dns-verification.md)
