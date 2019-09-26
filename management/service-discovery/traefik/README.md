# 部署

```bash
$ kubectl create -f ingress-rbac.kube-system.yaml

$ # 方案一：使用 Deployment 来部署 traefik 到随机的节点上（或者部署到指定节点），并以 hostPort 的方式开放节点的 80 端口
$ # 其中 traefik 监听 node 的 80 和 8580 端口，80 端口提供负载均衡和反向代理服务，8080 是 traefik ui 端口
$ kubectl create -f traefik-ingress-controller.deploy.kube-system.yaml

$ # 方案二：使用 DaemonSet 来部署 traefik 到每个节点上，并以 hostPort 的方式开放节点的 80 端口
$ kubectl create -f traefik-ingress-controller.ds.kube-system.yaml

$ # 创建 traefik ui，并在集群内外进行测试
$ kubectl create -f traefik-ui.svc+ing.kube-system.yaml
$ curl -H traefik.local http://192.168.10.104

$ # 创建测试所用的 ingress 用例，并在集群内外进行测试
$ kubectl create -f ingress-example.default.yaml
$ curl -H tomcat.local http://192.168.10.104

$ # 通过浏览器需要先添加 hosts
$ cat "192.168.10.104 traefik.local" >> /etc/hosts
$ cat "192.168.10.104 tomcat.local" >> /etc/hosts
```

## 注

如果需要为 ingress 指定子路径（比如 spark.local/history），需要设置 `{"metadata": {"annotations": "traefik.frontend.rule.type: PathPrefixStrip"}`；但实测发现，可以反向代理成功但该服务无法正确读取其他服务的数据，所以涉及到读取其他服务数据的服务不建议使用子路径。

Ingress 指定的 backend 也可以是 headless service。


## 缺点

只支持 HTTP 反向代理。


## 参考资料

* [Traefik-kubernetes 初试](https://mritd.me/2016/12/06/try-traefik-on-kubernetes/)
* [Kubernetes Ingress Controller](https://docs.traefik.io/user-guide/kubernetes/)
* [Traefik examples](https://github.com/containous/traefik/tree/master/examples/k8s)
