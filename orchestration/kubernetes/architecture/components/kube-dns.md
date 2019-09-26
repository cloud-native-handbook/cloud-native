# Kubernetes kube-dns


## 配置私有 DNS、上游 DNS

```
apiVersion: v1
kind: ConfigMap
metadata:
  name: kube-dns
  namespace: kube-system
data:
  stubDomains: |
    {"acme.local": ["1.2.3.4"]}
  upstreamNameservers: |
    ["8.8.8.8", "8.8.4.4"]
```



## 参考

* [如何在 Kubernetes 中配置私有 DNS 区域和上游 Nameserver](https://www.v2ex.com/amp/t/353273)

> https://jimmysong.io/posts/configuring-kubernetes-kube-dns/


* [kubernetes入门之skydns](https://xuxinkun.github.io/2016/07/22/kubernetes-dns/)
* [Kubernetes DNS Service技术研究](http://blog.csdn.net/waltonwang/article/details/54317082)
* [SkyDNS2源码分析](http://blog.csdn.net/waltonwang/article/details/54295297)
