k8s-dns-gw.md

```bash
$ route add 192.168.10.103 dev eth0

$ route add -net 10.244.0.0 netmask 255.255.0.0 gw 192.168.10.103

route add -net 192.168.10.0 netmask 255.255.255.0 gw 192.168.10.1

route del -net 10.244.0.0 netmask 255.255.0.0 gw 192.168.10.103

route add 
```

---






192.168.18.1 




route add -net 10.244.0.0 netmask 255.255.0.0 gw 192.168.10.103



route add 192.168.10.103 gw 192.168.18.1






```bash
$ # net-tools

$ # 删除默认路由
$ route del default
$ route del default gw 192.168.18.1 eth0

$ # 添加默认路由
$ route add default gw 192.168.18.1 eth0
```
















---

route add -net 10.244.0.0 netmask 255.255.0.0 gw 192.168.10.103


## 参考

* [k8s-dns-gateway 网关网络扩展实战](http://blog.csdn.net/idea77/article/details/73863822)
