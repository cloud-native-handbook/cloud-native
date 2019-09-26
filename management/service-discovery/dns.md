# DNS

Kubernetes 目前支持两种 DNS 策略： `Default` 和 `ClusteFirst`。 如果 dnsPolicy 的 Flag 没有特别指明，则默认使用 `ClusterFirst`。 如果 dnsPolicy 设置为 `Default`，则名称解析配置将从 pod 运行的节点继承。

## 概念

* 存根域（stubDomain）：转发某类域名到其他 DNS Server（类似于一条静态路由，可以多个）；比如转发 `example.local` 结尾的域名到 `10.10.10.10:53` DNS Server
* 上游 DNS（upstreamNameserver）：当没有匹配到本地域名和 `stubDomain` 时，将域名转发到该 DNS Server（类似于默认路由，但支持多个）；比如配置上游 DNS 为 `8.8.8.8:53`

### 记录

* CName

## 目录

内部 DNS：

* [CoreDNS](./coredns/README.md)
* [KubeDNS](./kubedns/README.md)

外部 DNS：

* [CoreDNS](./coredns/README.md)
* [DNSmasq](./dnsmasq/README.md)
* [PowerDNS](./powerdns/README.md)
* [Overture](https://github.com/shawn1m/overture)

## 外部 DNS 集成 Kubernetes DNS

## 配置存根域（私有 DNS）和上游 DNS

创建 coredns 或 kube-dns 时，默认已经添加了相应的 config map，只能通过 `kubectl edit` 进行修改，不能随便覆盖，尤其是 coredns。

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kube-dns
  namespace: kube-system
data:
  # 存根域
  stubDomains: |
    {"cloud.local": ["192.168.10.102:53"]}
  # 上游 DNS
  upstreamNameservers: |
    ["114.114.114.114:53", "8.8.8.8:53"]
```

将 dnsPolicy 设置为 `ClusterFirst` 后，首先将 DNS 查询发送到 kube-dns 中的 DNS 缓存层。 从这里，请求的后缀被检查，然后转发到相应的 DNS 。 在这种情况下，具有集群后缀（例如 `.cluster.local`）的名称将发送到 kube-dns。使用存根域后缀（例如 `.acme.local` ）的名称将被发送到配置的自定义解析器。最后，与这些后缀不匹配的请求将转发到上游 DNS 。

如果集群管理员不希望覆盖节点的上游 NS，可以不用指定可选的 `upstreamNameservers` 字段。如果没有指定 `upstreamNameservers`，访问外网域名（如 baidu.com），将不再使用 kube-dns/coredns 解析，而是使用节点 DNS 解析，从某种程度上减低了 kube-dns/coredns 的压力。如果指定了 `upstreamNameservers`，相当于强制所有非集群的 DNS 查询通过上游的 NS 来完成。

e.g.

kubernetes.default.svc.cluster.local --> kube-dns/coredns
harbor.kube.local --> custom DNS (1.2.3.4)
baidu.com --> upstream DNS (8.8.8.8 or 4.4.4.4)

> http://blog.kubernetes.io/2017/04/configuring-private-dns-zones-upstream-nameservers-kubernetes.html

## 自动扩容

## kube-dns/coredns 支持的 DNS 格式
kube-dns/coredns 将分别为 service 和 pod 生成不同格式的 DNS 记录。

Service

  * A记录：生成 `my-svc.my-namespace.svc.cluster.local` 域名，解析成 IP 地址，分为两种情况：
    * 普通 Service: 解析成 ClusterIP
    * Headless Service: 解析为指定 Pod 的 IP 列表
  * SRV 记录：为命名的端口（普通 Service 或 Headless Service）生成 `_my-port-name._my-port-protocol.my-svc.my-namespace.svc.cluster.local` 的域名

Pod

  * A记录：生成域名 pod-ip.my-namespace.pod.cluster.local

```bash
# A 记录
$ nslookup -query=a coredns.kube-system.svc.cluster.local

# SRV 记录
$ nslookup -query=srv coredns.kube-system.svc.cluster.local
$ nslookup -query=srv _dns._udp.coredns.kube-system.svc.cluster.local
$ nslookup -query=srv _dns-tcp._tcp.coredns.kube-system.svc.cluster.local
$ nslookup -query=srv _metrics._tcp.coredns.kube-system.svc.cluster.local
```

## 聊天记录

Q: 有没有哪种 CA 可以对私有域名签发证书，不需要客户端再添加 ca 证书到客户端目录

A:
你是說反解出來是 private IP 的嗎?
Let's Encrypt 有 dns challenge 模式，要在你的DNS新增TXT record，好像只有在第一次才需要驗證
不對，renew的時候也要驗證
剛剛發現我的SSL憑證過期了

Q: 你用的什么 dns

A:
yandex，手動添加TXT --> https://yandex.com/support/domain/troubleshooting/dns.html#step2
用Cloudflare或是Gandi好像都有API可以自動renew的hook
powerDNS好像也有
可能要研究一下，不過我之前看過 kube-lego，好像還不支持 dns challenge
如果 kube-lego 有搞出來，再分享分享XD

## ssl

https://github.com/diafygi/acme-tiny

> https://yandex.com/support/domain/troubleshooting/dns.html#step2
> https://www.v2ex.com/t/136523
> https://www.v2ex.com/t/136550

* [letsmonitor](http://letsmonitor.org/)

### pdns-docker

https://github.com/obi12341/docker-pdns

### Let's

### CloudFlare

https://zhuanlan.zhihu.com/p/22667528
https://jimmysong.io/posts/enable-github-pages-https-with-cloudflare/

## 参考

* [Customizing DNS Service](https://kubernetes.io/docs/tasks/administer-cluster/dns-custom-nameservers/)
* [DNS for Services and Pods](https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/)
* [Using CoreDNS for Service Discovery](https://kubernetes.io/docs/tasks/administer-cluster/coredns/)
* [如何在 Kubernetes 中配置私有 DNS 区域和上游 Nameserver](https://www.v2ex.com/amp/t/353273)

> https://jimmysong.io/posts/configuring-kubernetes-kube-dns/
> https://github.com/kubernetes/dns

* [搭建安全的Docker Private Registry完全指南](http://dockone.io/article/1277)
* [Generating Intranet and Private Network SSL Certificates using LetsEncrypt](https://blog.thesparktree.com/generating-intranet-and-private-network-ssl)
