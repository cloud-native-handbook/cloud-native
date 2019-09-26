# IPVS

https://github.com/kubernetes/kubernetes/tree/master/pkg/proxy/ipvs

> https://github.com/kubernetes/kubernetes/issues/44063
> https://docs.google.com/presentation/d/1BaIAywY2qqeHtyGZtlyAp89JIZs59MZLKcFLxKE6LyM/edit?usp=sharing

## 边界网关

```bash
# 添加静态路由
$ route add -net 10.1.0.0 netmask 255.255.0.0 gw 172.72.4.3
$ route add -net 10.254.0.0 netmask 255.255.0.0 gw 172.72.4.3

# 删除静态路由
$ route del -net 10.1.0.0 netmask 255.255.0.0 gw 172.72.4.3
$ route del -net 10.254.0.0 netmask 255.255.0.0 gw 172.72.4.3

# 查看
$ route -n
```

## 参考

* [使用 IPVS 实现 Kubernetes 入口流量负载均衡](https://www.kubernetes.org.cn/1904.html)
* [Kubernetes 高可用负载均衡与集群外服务访问实践](https://www.kubernetes.org.cn/2812.html)
* [How to use IPVS](https://github.com/kubernetes/kubernetes/tree/master/pkg/proxy/ipvs)
* [Linux集群-负载均衡 lvs 介绍及 lvs-nat 实现https](http://blog.51cto.com/bengbengtu/1701609)
